import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import { authorize, writeAudit } from "./authz";
import { parseRp, quoteStay } from "./rates";
import { reconcileFolioToStay } from "./folios";

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
      trend: trendTo(pct),
      subBlocks: subs.map((s) => {
        const sp = pickedByType.get(s.roomType) ?? 0;
        return {
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
