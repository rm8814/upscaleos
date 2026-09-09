import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import { authorize, writeAudit } from "./authz";
import { parseRp, quoteStay } from "./rates";
import { reconcileFolioToStay } from "./folios";
import { RELEASED_STATUSES, roomCountsByType } from "./occupancy";
import { buildRateGrid } from "./rates";

const rpNum = (n: number) => `Rp ${Math.round(n).toLocaleString("en-US")}`;

/** Short, stable-ish code for a group rate plan from its name. */
function groupPlanCode(name: string) {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 6);
  return `GRP-${slug || "BLOCK"}`;
}

/**
 * Ensure a sub-block has a linked rate plan (kind "group", flat = its rate)
 * and return the plan id. Reservations under the block price through this
 * plan, so the engine / folio / tax path is the same as everything else.
 */
async function ensureSubBlockPlan(
  ctx: MutationCtx,
  block: Doc<"group_blocks">,
  sub: Doc<"group_subblocks">
): Promise<Id<"rate_plans">> {
  const amount = parseRp(sub.rate);
  if (sub.ratePlanId) {
    await ctx.db.patch(sub.ratePlanId, { amount, active: true });
    return sub.ratePlanId;
  }
  const planId = await ctx.db.insert("rate_plans", {
    propertyId: block.propertyId,
    code: `${groupPlanCode(block.name)}-${sub.roomType.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase()}`,
    name: `${block.name} — ${sub.roomType}`,
    kind: "group",
    pricing: "flat",
    amount,
    active: true,
  });
  await ctx.db.patch(sub._id, { ratePlanId: planId });
  return planId;
}

const addDaysIso = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** A block still holds inventory: not cancelled, not released, cut-off ahead. */
function blockActive(g: Doc<"group_blocks">, refDate: string): boolean {
  return (
    g.status !== "cancelled" &&
    g.released !== true &&
    g.cutoffDate >= refDate
  );
}

/**
 * Unpicked rooms held by group blocks for one room type on `date`, as of
 * `refDate` (past cut-off = released). A pickup (any non-cancelled group
 * reservation of that type overlapping the date) consumes one held room.
 */
export async function groupHeldRooms(
  ctx: QueryCtx | MutationCtx,
  propertyId: Id<"properties">,
  roomType: string,
  date: string,
  refDate: string,
  excludeGroupId?: Id<"group_blocks">
): Promise<number> {
  const blocks = await ctx.db
    .query("group_blocks")
    .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
    .collect();

  let held = 0;
  for (const g of blocks) {
    if (excludeGroupId && g._id === excludeGroupId) continue;
    if (!blockActive(g, refDate)) continue;
    const windowEnd = addDaysIso(g.startDate, g.nights);
    if (date < g.startDate || date >= windowEnd) continue;

    const subs = await ctx.db
      .query("group_subblocks")
      .withIndex("by_group", (q) => q.eq("groupId", g._id))
      .collect();
    const sub = subs.find((s) => s.roomType === roomType);
    if (!sub) continue;

    const picked = (
      await ctx.db
        .query("reservations")
        .withIndex("by_group", (q) => q.eq("groupId", g._id))
        .collect()
    ).filter(
      (r) =>
        r.status !== "cancelled" &&
        r.roomType === roomType &&
        r.checkIn <= date &&
        r.checkOut > date
    ).length;

    held += Math.max(0, sub.blocked - picked);
  }
  return held;
}

/** Night-audit hook: one pick-up snapshot per still-relevant group block. */
export async function snapshotGroupPickup(
  ctx: MutationCtx,
  propertyId: Id<"properties">,
  asOf: string
): Promise<number> {
  const blocks = await ctx.db
    .query("group_blocks")
    .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
    .collect();
  let n = 0;
  for (const g of blocks) {
    if (g.status === "cancelled") continue;
    const windowEnd = addDaysIso(g.startDate, g.nights);
    if (asOf >= windowEnd) continue; // stay is over — stop tracking
    const subs = await ctx.db
      .query("group_subblocks")
      .withIndex("by_group", (q) => q.eq("groupId", g._id))
      .collect();
    const blocked = subs.reduce((s, x) => s + x.blocked, 0);
    const picked = (
      await ctx.db
        .query("reservations")
        .withIndex("by_group", (q) => q.eq("groupId", g._id))
        .collect()
    ).filter((r) => r.status !== "cancelled").length;
    // one row per (group, asOf)
    const existing = await ctx.db
      .query("group_pickup")
      .withIndex("by_group", (q) => q.eq("groupId", g._id).eq("asOf", asOf))
      .first();
    if (existing) await ctx.db.patch(existing._id, { picked, blocked });
    else
      await ctx.db.insert("group_pickup", {
        groupId: g._id,
        propertyId,
        asOf,
        picked,
        blocked,
      });
    n += 1;
  }
  return n;
}

/** Resize a sub-block's blocked count (can't go below rooms already picked). */
export const setSubBlockBlocked = mutation({
  args: { subBlockId: v.id("group_subblocks"), blocked: v.number() },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.subBlockId);
    if (!sub) throw new Error("Sub-block not found");
    const block = await ctx.db.get(sub.groupId);
    if (!block) throw new Error("Group not found");
    const scope = await authorize(ctx, {
      propertyId: block.propertyId,
      requireProperty: "front_office",
    });
    const picked = (
      await ctx.db
        .query("reservations")
        .withIndex("by_group", (q) => q.eq("groupId", block._id))
        .collect()
    ).filter((r) => r.roomType === sub.roomType && r.status !== "cancelled")
      .length;
    const next = Math.max(picked, Math.round(args.blocked));
    await ctx.db.patch(args.subBlockId, { blocked: next });
    await writeAudit(ctx, scope, "group.resize", {
      propertyId: block.propertyId,
      target: `${block.name} · ${sub.roomType}`,
      detail: `blocked ${sub.blocked} → ${next}`,
    });
    return { blocked: next };
  },
});

/** Manually release N held rooms from a sub-block back to general inventory. */
export const releaseRooms = mutation({
  args: { subBlockId: v.id("group_subblocks"), count: v.number() },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.subBlockId);
    if (!sub) throw new Error("Sub-block not found");
    const block = await ctx.db.get(sub.groupId);
    if (!block) throw new Error("Group not found");
    const scope = await authorize(ctx, {
      propertyId: block.propertyId,
      requireProperty: "front_office",
    });
    const picked = (
      await ctx.db
        .query("reservations")
        .withIndex("by_group", (q) => q.eq("groupId", block._id))
        .collect()
    ).filter((r) => r.roomType === sub.roomType && r.status !== "cancelled")
      .length;
    const releasable = Math.max(0, sub.blocked - picked);
    const n = Math.min(Math.max(1, Math.round(args.count)), releasable);
    if (n <= 0) throw new Error("No unpicked rooms to release");
    await ctx.db.patch(args.subBlockId, { blocked: sub.blocked - n });
    await writeAudit(ctx, scope, "group.release", {
      propertyId: block.propertyId,
      target: `${block.name} · ${sub.roomType}`,
      detail: `released ${n} of ${releasable} held`,
    });
    return { released: n };
  },
});

/** Push a block's cut-off date out (needs a reason for the trail). */
export const extendCutoff = mutation({
  args: {
    groupId: v.id("group_blocks"),
    toDate: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const block = await ctx.db.get(args.groupId);
    if (!block) throw new Error("Group not found");
    const scope = await authorize(ctx, {
      propertyId: block.propertyId,
      requireProperty: "front_office",
    });
    if (args.toDate <= block.cutoffDate)
      throw new Error("New cut-off must be later than the current one");
    await ctx.db.patch(args.groupId, {
      cutoffDate: args.toDate,
      released: false,
      releasedOn: undefined,
    });
    await writeAudit(ctx, scope, "group.cutoff", {
      propertyId: block.propertyId,
      target: block.name,
      detail: `${block.cutoffDate} → ${args.toDate} · ${args.reason}`,
    });
  },
});

/** Night-audit hook: release group blocks whose cut-off has passed. */
export async function releasePastCutoff(
  ctx: MutationCtx,
  propertyId: Id<"properties">,
  refDate: string
): Promise<number> {
  const blocks = await ctx.db
    .query("group_blocks")
    .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
    .collect();
  let released = 0;
  for (const g of blocks) {
    if (g.released === true || g.status === "cancelled") continue;
    if (g.cutoffDate < refDate) {
      await ctx.db.patch(g._id, { released: true, releasedOn: refDate });
      released += 1;
    }
  }
  return released;
}

const CONTRACT_COLOR: Record<string, string> = {
  Signed: "var(--accent-cyan)",
  "Awaiting signature": "var(--res-tentative)",
};

async function groupReservations(ctx: QueryCtx, groupId: Id<"group_blocks">) {
  return (
    await ctx.db
      .query("reservations")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect()
  ).filter((r) => r.status !== "cancelled");
}

/** Synth pick-up sparkline that lands on the real current percentage. */
function trendTo(pct: number): number[] {
  return Array.from({ length: 8 }, (_, i) =>
    Math.round((pct * (0.28 + (0.72 * i) / 7)) * 10) / 10
  );
}

export const list = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const groups = await ctx.db
      .query("group_blocks")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    const out = [];
    for (const g of groups) {
      const [subs, res] = await Promise.all([
        ctx.db
          .query("group_subblocks")
          .withIndex("by_group", (q) => q.eq("groupId", g._id))
          .collect(),
        groupReservations(ctx, g._id),
      ]);
      const blocked = subs.reduce((s, x) => s + x.blocked, 0);
      const picked = res.length;
      const pct = blocked ? Math.round((picked / blocked) * 100) : 0;
      out.push({
        id: g._id,
        name: g.name,
        kind: g.kind ?? "block",
        billingMode: g.billingMode ?? "individual",
        externalRef: g.externalRef ?? null,
        status: g.status,
        released: g.released === true,
        startDate: g.startDate,
        nights: g.nights,
        cutoffDate: g.cutoffDate,
        contractLabel: g.contractLabel,
        contractColor: CONTRACT_COLOR[g.contractLabel] ?? "var(--fg-2)",
        salesManager: g.salesManager,
        blocked,
        picked,
        held: g.released === true ? 0 : Math.max(0, blocked - picked),
        pickupPct: `${pct}%`,
      });
    }
    return out.sort((a, b) => a.startDate.localeCompare(b.startDate));
  },
});

export const get = query({
  args: { groupId: v.id("group_blocks") },
  handler: async (ctx, args) => {
    const g = await ctx.db.get(args.groupId);
    if (!g) return null;
    const [subs, res] = await Promise.all([
      ctx.db
        .query("group_subblocks")
        .withIndex("by_group", (q) => q.eq("groupId", g._id))
        .collect(),
      groupReservations(ctx, g._id),
    ]);

    const pickedByType = new Map<string, number>();
    for (const r of res) {
      const k = r.roomType ?? "—";
      pickedByType.set(k, (pickedByType.get(k) ?? 0) + 1);
    }

    const rooming = await Promise.all(
      res
        .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
        .map(async (r) => {
          const guest = await ctx.db.get(r.guestId);
          return {
            reservationId: r._id,
            guest: guest?.name ?? "Guest",
            roomType: r.roomType ?? "—",
            roomLabel: r.roomNumber ?? "TBD",
            assigned: !!r.roomId,
          };
        })
    );

    const blocked = subs.reduce((s, x) => s + x.blocked, 0);
    const picked = res.length;
    const pct = blocked ? Math.round((picked / blocked) * 100) : 0;

    // ---- real pick-up curve + projection to cut-off ----
    const snaps = (
      await ctx.db
        .query("group_pickup")
        .withIndex("by_group", (q) => q.eq("groupId", g._id))
        .collect()
    ).sort((a, b) => a.asOf.localeCompare(b.asOf));
    const trend =
      snaps.length >= 2
        ? snaps.map((s) => s.picked)
        : trendTo(pct); // fall back to a synthetic curve until audits run
    const bd =
      (await ctx.db.get(g.propertyId))?.businessDate ?? g.startDate;
    const cutoffDays = Math.round(
      (Date.parse(g.cutoffDate + "T00:00:00Z") -
        Date.parse(bd + "T00:00:00Z")) /
        86400000
    );
    // pace = rooms picked per day over the last week of snapshots
    let pacePerDay = 0;
    if (snaps.length >= 2) {
      const first = snaps[Math.max(0, snaps.length - 8)];
      const last = snaps[snaps.length - 1];
      const span = Math.max(
        1,
        Math.round(
          (Date.parse(last.asOf + "T00:00:00Z") -
            Date.parse(first.asOf + "T00:00:00Z")) /
            86400000
        )
      );
      pacePerDay = (last.picked - first.picked) / span;
    }
    const projectedPickup = Math.min(
      blocked,
      Math.max(picked, Math.round(picked + pacePerDay * Math.max(0, cutoffDays)))
    );
    const projectedWash = Math.max(0, blocked - projectedPickup);
    const guaranteed = Math.round(blocked * (g.guaranteedPct ?? 1));
    const attritionShortfall = Math.max(0, guaranteed - projectedPickup);

    // ---- P&L: what the block is worth vs. selling those rooms transient ----
    const windowDates: string[] = [];
    for (let n = 0; n < g.nights; n++)
      windowDates.push(addDaysIso(g.startDate, n));
    const bar = await buildRateGrid(
      ctx,
      g.propertyId,
      g.startDate,
      addDaysIso(g.startDate, g.nights)
    );
    const barAt = new Map(
      bar.map((c) => [`${c.roomType}|${c.date}`, c.rate])
    );
    const allRes = await ctx.db
      .query("reservations")
      .withIndex("by_property", (q) => q.eq("propertyId", g.propertyId))
      .collect();
    const sellableByType = roomCountsByType(
      await ctx.db
        .query("rooms")
        .withIndex("by_property", (q) => q.eq("propertyId", g.propertyId))
        .collect()
    ).sellable;

    let groupRoomRevenue = 0;
    let displacedRoomNights = 0;
    let displacementCost = 0; // BAR - group rate on nights we'd have sold
    let barBlended = 0;
    let barCells = 0;
    for (const s of subs) {
      const grpRate = parseRp(s.rate);
      const sp = pickedByType.get(s.roomType) ?? 0;
      groupRoomRevenue += sp * g.nights * grpRate;
      const cap = sellableByType.get(s.roomType) ?? 0;
      const held = g.released === true ? 0 : Math.max(0, s.blocked - sp);
      for (const date of windowDates) {
        const barRate = barAt.get(`${s.roomType}|${date}`) ?? grpRate;
        barBlended += barRate;
        barCells += 1;
        const transient = allRes.filter(
          (r) =>
            (r.roomType ?? "") === s.roomType &&
            !r.groupId &&
            !RELEASED_STATUSES.has(r.status) &&
            r.checkIn <= date &&
            r.checkOut > date
        ).length;
        // if transient demand alone would fill ≥75% of the type, every held
        // room is displacing a sale we'd otherwise have made at BAR.
        if (cap > 0 && transient / cap >= 0.75) {
          displacedRoomNights += held;
          displacementCost += held * Math.max(0, barRate - grpRate);
        }
      }
    }
    const avgBar = barCells ? Math.round(barBlended / barCells) : 0;
    const compCost =
      Math.floor(blocked / 25) * avgBar * g.nights; // 1 comp per 25 rooms
    const roomNights = picked * g.nights;
    const netContribution =
      groupRoomRevenue +
      (g.fbMinimum ?? 0) -
      compCost -
      displacementCost;
    const pnl = {
      roomNights,
      roomRevenue: groupRoomRevenue,
      roomRevenueLabel: rpNum(groupRoomRevenue),
      adr: roomNights ? Math.round(groupRoomRevenue / roomNights) : 0,
      adrLabel: rpNum(roomNights ? groupRoomRevenue / roomNights : 0),
      fbMinimum: g.fbMinimum ?? 0,
      fbMinimumLabel: rpNum(g.fbMinimum ?? 0),
      compCost,
      compCostLabel: rpNum(compCost),
      displacedRoomNights,
      displacementCost,
      displacementCostLabel: rpNum(displacementCost),
      netContribution,
      netContributionLabel: rpNum(netContribution),
    };

    // Master A/R account: charges, deposits/payments, outstanding.
    const arAcc = (
      await ctx.db
        .query("ar_accounts")
        .withIndex("by_property", (q) => q.eq("propertyId", g.propertyId))
        .collect()
    ).find((a) => a.groupId === g._id);
    let arCharges = 0;
    let arPaid = 0;
    if (arAcc) {
      const tx = await ctx.db
        .query("ar_transactions")
        .withIndex("by_account", (q) => q.eq("accountId", arAcc._id))
        .collect();
      for (const t of tx) {
        if (t.amount > 0) arCharges += t.amount;
        else arPaid += -t.amount;
      }
    }

    return {
      id: g._id,
      name: g.name,
      kind: g.kind ?? "block",
      externalRef: g.externalRef ?? null,
      status: g.status,
      startDate: g.startDate,
      nights: g.nights,
      cutoffDate: g.cutoffDate,
      contractLabel: g.contractLabel,
      contractColor: CONTRACT_COLOR[g.contractLabel] ?? "var(--fg-2)",
      salesManager: g.salesManager,
      billing: g.billing,
      billingMode: g.billingMode ?? "individual",
      depositStatus: g.depositStatus,
      depositAmount: g.depositAmount,
      guaranteedPct: g.guaranteedPct ?? null,
      fbMinimum: g.fbMinimum ?? 0,
      concessions: g.concessions,
      contact: g.contact,
      master: {
        hasAccount: !!arAcc,
        charges: arCharges,
        chargesLabel: rpNum(arCharges),
        paid: arPaid,
        paidLabel: rpNum(arPaid),
        outstanding: arCharges - arPaid,
        outstandingLabel: rpNum(arCharges - arPaid),
      },
      released: g.released === true,
      releasedOn: g.releasedOn ?? null,
      blocked,
      picked,
      held: g.released === true ? 0 : Math.max(0, blocked - picked),
      pickupPct: `${pct}%`,
      trend,
      projectedPickup,
      projectedWash,
      pacePerDay: Math.round(pacePerDay * 10) / 10,
      cutoffDays,
      guaranteed,
      attritionShortfall,
      pnl,
      subBlocks: subs.map((s) => {
        const sp = pickedByType.get(s.roomType) ?? 0;
        return {
          subBlockId: s._id,
          roomType: s.roomType,
          blocked: s.blocked,
          picked: sp,
          held: g.released === true ? 0 : Math.max(0, s.blocked - sp),
          rate: s.rate,
        };
      }),
      rooming,
    };
  },
});

/**
 * House impact of holding `blocked` rooms of a type for a date window:
 * on the tightest night, how many are sellable, already committed, held by
 * other groups, and free — and by how much this block oversells.
 */
export const checkBlockAvailability = query({
  args: {
    propertyId: v.id("properties"),
    roomType: v.string(),
    startDate: v.string(),
    nights: v.number(),
    blocked: v.number(),
    excludeGroupId: v.optional(v.id("group_blocks")),
  },
  handler: async (ctx, args) => {
    const [rooms, reservations, blocks, subblocks] = await Promise.all([
      ctx.db
        .query("rooms")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("reservations")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("group_blocks")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db.query("group_subblocks").collect(),
    ]);
    const bd = (await ctx.db.get(args.propertyId))?.businessDate ?? args.startDate;
    const sellable = roomCountsByType(rooms).sellable.get(args.roomType) ?? 0;

    let worst = {
      date: args.startDate,
      committed: 0,
      otherHeld: 0,
      free: sellable,
    };
    for (let n = 0; n < args.nights; n++) {
      const date = addDaysIso(args.startDate, n);
      const committed = reservations.filter(
        (r) =>
          (r.roomType ?? "") === args.roomType &&
          !RELEASED_STATUSES.has(r.status) &&
          r.groupId !== args.excludeGroupId &&
          r.checkIn <= date &&
          r.checkOut > date
      ).length;
      let otherHeld = 0;
      for (const g of blocks) {
        if (g._id === args.excludeGroupId) continue;
        if (g.status === "cancelled" || g.released === true) continue;
        if (g.cutoffDate < bd) continue;
        if (date < g.startDate || date >= addDaysIso(g.startDate, g.nights))
          continue;
        const sub = subblocks.find(
          (s) => s.groupId === g._id && s.roomType === args.roomType
        );
        if (!sub) continue;
        const picked = reservations.filter(
          (r) =>
            r.groupId === g._id &&
            r.roomType === args.roomType &&
            !RELEASED_STATUSES.has(r.status) &&
            r.checkIn <= date &&
            r.checkOut > date
        ).length;
        otherHeld += Math.max(0, sub.blocked - picked);
      }
      const free = sellable - committed - otherHeld;
      if (free < worst.free) worst = { date, committed, otherHeld, free };
    }
    return {
      roomType: args.roomType,
      sellable,
      tightestDate: worst.date,
      committed: worst.committed,
      otherHeld: worst.otherHeld,
      free: Math.max(0, worst.free),
      oversellBy: Math.max(0, args.blocked - worst.free),
    };
  },
});

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    name: v.string(),
    startDate: v.string(),
    nights: v.number(),
    roomType: v.string(),
    blocked: v.number(),
    rate: v.string(),
    salesManager: v.optional(v.string()),
    contact: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "front_office",
    });
    const groupId = await ctx.db.insert("group_blocks", {
      propertyId: args.propertyId,
      name: args.name,
      status: "Tentative",
      startDate: args.startDate,
      nights: args.nights,
      cutoffDate: addDaysIso(args.startDate, -14),
      contractLabel: "Awaiting signature",
      salesManager: args.salesManager ?? "Unassigned",
      billing: "Master folio — all room & tax",
      billingMode: "master",
      guaranteedPct: 0.8,
      depositStatus: "Not received",
      depositAmount: "Rp 0",
      concessions: "To be negotiated.",
      contact: args.contact ?? "",
    });
    const subId = await ctx.db.insert("group_subblocks", {
      groupId,
      propertyId: args.propertyId,
      roomType: args.roomType,
      blocked: args.blocked,
      rate: args.rate,
    });
    const block = (await ctx.db.get(groupId))!;
    const sub = (await ctx.db.get(subId))!;
    await ensureSubBlockPlan(ctx, block, sub);
    if (block.billingMode === "master") await ensureGroupArAccount(ctx, block);
    await writeAudit(ctx, scope, "group.create", {
      propertyId: args.propertyId,
      target: args.name,
      detail: `${args.blocked} ${args.roomType} · ${args.startDate}`,
    });
    return groupId;
  },
});

const nights = (a: string, b: string) =>
  Math.max(
    1,
    Math.round(
      (Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000
    )
  );

type PartyRoom = { roomType: string; roomId?: Id<"rooms">; roomExternalRef?: string };
type CoreArgs = {
  propertyId: Id<"properties">;
  guestName: string;
  email?: string;
  phone?: string;
  checkIn: string;
  checkOut: string;
  channel: string;
  status: string; // 'confirmed' | 'tentative'
  externalRef?: string;
  rooms: PartyRoom[];
};

async function sharedGuest(
  ctx: MutationCtx,
  name: string,
  email?: string,
  phone?: string
): Promise<Id<"guests">> {
  const guests = await ctx.db.query("guests").collect();
  const match = guests.find(
    (g) =>
      (email && g.email.toLowerCase() === email.toLowerCase()) ||
      g.name.toLowerCase() === name.toLowerCase()
  );
  return (
    match?._id ??
    (await ctx.db.insert("guests", {
      name,
      email: email || `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@guest.upscale.id`,
      phone: phone || "—",
      loyaltyTier: "Silver",
    }))
  );
}

/** Add rooms to an existing transient group: bump/create sub-blocks, insert
 *  one reservation per room continuing the bookingRoomIndex sequence. */
export async function appendPartyRooms(
  ctx: MutationCtx,
  block: Doc<"group_blocks">,
  guestId: Id<"guests">,
  rooms: PartyRoom[],
  opts: { channel: string; status: string; refBase?: string }
): Promise<Id<"reservations">[]> {
  const status = opts.status === "tentative" ? "tentative" : "confirmed";
  const checkOut = addDaysIso(block.startDate, block.nights);
  const siblings = await ctx.db
    .query("reservations")
    .withIndex("by_group", (q) => q.eq("groupId", block._id))
    .collect();
  let idx = siblings.reduce((m, r) => Math.max(m, r.bookingRoomIndex ?? 0), 0);
  const subs = await ctx.db
    .query("group_subblocks")
    .withIndex("by_group", (q) => q.eq("groupId", block._id))
    .collect();

  const out: Id<"reservations">[] = [];
  for (const room of rooms) {
    idx += 1;
    let sub = subs.find((s) => s.roomType === room.roomType);
    if (!sub) {
      const q0 = await quoteStay(ctx, {
        propertyId: block.propertyId,
        roomType: room.roomType,
        checkIn: block.startDate,
        checkOut,
      });
      const subId = await ctx.db.insert("group_subblocks", {
        groupId: block._id,
        propertyId: block.propertyId,
        roomType: room.roomType,
        blocked: 0,
        rate: rpNum(q0.nights[0]?.rate ?? 0),
      });
      sub = (await ctx.db.get(subId))!;
      subs.push(sub);
    }
    await ctx.db.patch(sub._id, { blocked: sub.blocked + 1 });
    sub.blocked += 1;
    const ratePlanId = await ensureSubBlockPlan(ctx, block, sub);
    const q = await quoteStay(ctx, {
      propertyId: block.propertyId,
      roomType: room.roomType,
      checkIn: block.startDate,
      checkOut,
      ratePlanId,
    });
    const roomNumber = room.roomId
      ? (await ctx.db.get(room.roomId))?.roomNumber
      : undefined;
    const id = await ctx.db.insert("reservations", {
      guestId,
      propertyId: block.propertyId,
      roomId: room.roomId,
      roomNumber,
      checkIn: block.startDate,
      checkOut,
      status,
      rate: rpNum(q.nights[0]?.rate ?? 0),
      totalAmount: rpNum(q.total),
      channel: opts.channel,
      roomType: room.roomType,
      adults: 2,
      children: 0,
      groupId: block._id,
      bookingRoomIndex: idx,
      externalRef:
        room.roomExternalRef ??
        (opts.refBase ? `${opts.refBase}-${String(idx).padStart(2, "0")}` : undefined),
      ratePlanId,
    });
    out.push(id);
  }
  return out;
}

/** Create a multi-room booking as a kind:"transient" group. Auth-free core. */
export async function createTransientCore(
  ctx: MutationCtx,
  args: CoreArgs & { actorEmail?: string; billingMode?: string }
): Promise<Id<"group_blocks">> {
  if (args.rooms.length === 0) throw new Error("At least one room required");
  const status = args.status === "tentative" ? "tentative" : "confirmed";
  const billingMode = args.billingMode === "master" ? "master" : "individual";
  const guestId = await sharedGuest(ctx, args.guestName, args.email, args.phone);
  const label =
    args.rooms.length > 1
      ? `${args.guestName} · ${args.rooms.length} rooms`
      : `${args.guestName} party`;
  const groupId = await ctx.db.insert("group_blocks", {
    propertyId: args.propertyId,
    name: label,
    kind: "transient",
    externalRef: args.externalRef,
    status: status === "tentative" ? "Tentative" : "Definite",
    startDate: args.checkIn,
    nights: nights(args.checkIn, args.checkOut),
    cutoffDate: args.checkIn,
    contractLabel: "n/a",
    salesManager: args.actorEmail ?? "front desk",
    billing:
      billingMode === "master" ? "One folio — all rooms" : "Individual folios",
    billingMode,
    depositStatus: "Not received",
    depositAmount: "Rp 0",
    concessions: "",
    contact: args.email ?? args.phone ?? "",
  });
  const block = (await ctx.db.get(groupId))!;
  if (billingMode === "master") await ensureGroupArAccount(ctx, block);
  await appendPartyRooms(ctx, block, guestId, args.rooms, {
    channel: args.channel,
    status,
    refBase: args.externalRef,
  });
  return groupId;
}

/**
 * A multi-room booking — one guest / party / OTA confirmation holding several
 * rooms. Modelled as a `kind: "transient"` group so it shares the calendar
 * lane, folio routing and reservation-list grouping with event blocks.
 */
export const createTransient = mutation({
  args: {
    propertyId: v.id("properties"),
    guestName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    checkIn: v.string(),
    checkOut: v.string(),
    channel: v.string(),
    status: v.string(),
    externalRef: v.optional(v.string()),
    billingMode: v.optional(v.string()), // 'individual' (default) | 'master'
    rooms: v.array(
      v.object({
        roomType: v.string(),
        roomId: v.optional(v.id("rooms")),
      })
    ),
  },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "front_office",
    });
    const groupId = await createTransientCore(ctx, {
      ...args,
      actorEmail: scope.email ?? undefined,
    });
    await writeAudit(ctx, scope, "booking.multiroom", {
      propertyId: args.propertyId,
      target: args.guestName,
      detail: `${args.rooms.length} rooms · ${args.checkIn}→${args.checkOut} · ${args.channel}`,
    });
    return groupId;
  },
});

/**
 * The group's master A/R account — where a "master"-billed block's member
 * folios settle and where its deposit sits. Created lazily.
 */
async function ensureGroupArAccount(
  ctx: MutationCtx,
  block: Doc<"group_blocks">
): Promise<Id<"ar_accounts">> {
  const existing = (
    await ctx.db
      .query("ar_accounts")
      .withIndex("by_property", (q) => q.eq("propertyId", block.propertyId))
      .collect()
  ).find((a) => a.groupId === block._id);
  if (existing) return existing._id;
  return ctx.db.insert("ar_accounts", {
    propertyId: block.propertyId,
    name: `${block.name} (group master)`,
    type: "Group",
    creditLimit: 0,
    groupId: block._id,
  });
}

/** Switch a group / party between billing modes. 'master' opens the group A/R
 *  account so member folios settle there at checkout. */
export const setBillingMode = mutation({
  args: {
    groupId: v.id("group_blocks"),
    mode: v.string(), // 'individual' | 'master' | 'split'
  },
  handler: async (ctx, args) => {
    const block = await ctx.db.get(args.groupId);
    if (!block) throw new Error("Group not found");
    const scope = await authorize(ctx, {
      propertyId: block.propertyId,
      requireProperty: "front_office",
    });
    const mode =
      args.mode === "master"
        ? "master"
        : args.mode === "split"
          ? "split"
          : "individual";
    await ctx.db.patch(args.groupId, {
      billingMode: mode,
      billing:
        mode === "master"
          ? "One folio — all rooms"
          : mode === "split"
            ? "Split — room to guests, extras to master"
            : "Individual folios",
    });
    if (mode !== "individual") await ensureGroupArAccount(ctx, block);
    await writeAudit(ctx, scope, "group.billing", {
      propertyId: block.propertyId,
      target: block.name,
      detail: mode,
    });
    return { mode };
  },
});

/** Record a group deposit against the master A/R account. */
export const recordDeposit = mutation({
  args: {
    groupId: v.id("group_blocks"),
    amount: v.number(),
    method: v.string(),
  },
  handler: async (ctx, args) => {
    const block = await ctx.db.get(args.groupId);
    if (!block) throw new Error("Group not found");
    const scope = await authorize(ctx, {
      propertyId: block.propertyId,
      requireProperty: "front_office",
    });
    const amt = Math.abs(Math.round(args.amount));
    if (!amt) throw new Error("Amount must be greater than zero");
    const accId = await ensureGroupArAccount(ctx, block);
    const today =
      (await ctx.db.get(block.propertyId))?.businessDate ?? block.startDate;
    const count =
      (
        await ctx.db
          .query("ar_transactions")
          .withIndex("by_account", (q) => q.eq("accountId", accId))
          .collect()
      ).filter((t) => t.kind === "payment").length + 1;
    await ctx.db.insert("ar_transactions", {
      accountId: accId,
      propertyId: block.propertyId,
      date: today,
      kind: "payment",
      description: `Group deposit — ${args.method}`,
      ref: `DEP-${block._id.slice(-4).toUpperCase()}-${count}`,
      amount: -amt,
    });
    await ctx.db.patch(args.groupId, {
      depositStatus: "Received",
      depositAmount: rpNum(amt),
    });
    await writeAudit(ctx, scope, "group.deposit", {
      propertyId: block.propertyId,
      target: block.name,
      detail: `${rpNum(amt)} · ${args.method}`,
    });
  },
});

/** Change a sub-block's negotiated rate — re-prices its plan and any open
 *  folios of rooming-list guests. */
export const setSubBlockRate = mutation({
  args: { subBlockId: v.id("group_subblocks"), rate: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.subBlockId);
    if (!sub) throw new Error("Sub-block not found");
    const block = await ctx.db.get(sub.groupId);
    if (!block) throw new Error("Group not found");
    const scope = await authorize(ctx, {
      propertyId: block.propertyId,
      requireProperty: "front_office",
    });
    await ctx.db.patch(args.subBlockId, { rate: args.rate });
    const fresh = (await ctx.db.get(args.subBlockId))!;
    await ensureSubBlockPlan(ctx, block, fresh);

    const bd = (await ctx.db.get(block.propertyId))?.businessDate ?? block.startDate;
    const roomers = (
      await ctx.db
        .query("reservations")
        .withIndex("by_group", (q) => q.eq("groupId", block._id))
        .collect()
    ).filter((r) => r.roomType === sub.roomType && r.status !== "cancelled");
    for (const r of roomers) {
      const q = await quoteStay(ctx, {
        propertyId: block.propertyId,
        roomType: r.roomType ?? sub.roomType,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        ratePlanId: fresh.ratePlanId,
      });
      await ctx.db.patch(r._id, {
        rate: rpNum(q.nights[0]?.rate ?? 0),
        totalAmount: rpNum(q.total),
      });
      await reconcileFolioToStay(ctx, r._id, bd, { repriceExisting: true });
    }
    await writeAudit(ctx, scope, "group.rate", {
      propertyId: block.propertyId,
      target: `${block.name} · ${sub.roomType}`,
      detail: args.rate,
    });
  },
});

/** Add a rooming-list name — creates a guest and a reservation tied to the group. */
export const addRoomingGuest = mutation({
  args: {
    groupId: v.id("group_blocks"),
    guestName: v.string(),
    roomType: v.string(),
  },
  handler: async (ctx, args) => {
    const g = await ctx.db.get(args.groupId);
    if (!g) throw new Error("Group not found");
    await authorize(ctx, {
      propertyId: g.propertyId,
      requireProperty: "front_office",
    });
    let sub = (
      await ctx.db
        .query("group_subblocks")
        .withIndex("by_group", (q) => q.eq("groupId", g._id))
        .collect()
    ).find((s) => s.roomType === args.roomType);
    // Make sure the sub-block has its group rate plan before we price.
    let ratePlanId = sub?.ratePlanId;
    if (sub && !ratePlanId) {
      ratePlanId = await ensureSubBlockPlan(ctx, g, sub);
      sub = (await ctx.db.get(sub._id))!;
    }

    const checkOut = addDaysIso(g.startDate, g.nights);
    const q = await quoteStay(ctx, {
      propertyId: g.propertyId,
      roomType: args.roomType,
      checkIn: g.startDate,
      checkOut,
      ratePlanId,
    });

    const guestId = await ctx.db.insert("guests", {
      name: args.guestName,
      email: `${args.guestName.toLowerCase().replace(/[^a-z]+/g, ".")}@group.example.com`,
      phone: "+62 811 000 0000",
      loyaltyTier: "Silver",
    });
    await ctx.db.insert("reservations", {
      guestId,
      propertyId: g.propertyId,
      checkIn: g.startDate,
      checkOut,
      status: g.status === "In-house" ? "inhouse" : "confirmed",
      rate: rpNum(q.nights[0]?.rate ?? parseRp(sub?.rate)),
      totalAmount: rpNum(q.total),
      channel: "Group",
      roomType: args.roomType,
      adults: 1,
      children: 0,
      groupId: g._id,
      ratePlanId,
    });
  },
});
