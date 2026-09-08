import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { authorize } from "./authz";

const addDaysIso = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

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
        startDate: g.startDate,
        nights: g.nights,
        cutoffDate: g.cutoffDate,
        contractLabel: g.contractLabel,
        contractColor: CONTRACT_COLOR[g.contractLabel] ?? "var(--fg-2)",
        salesManager: g.salesManager,
        blocked,
        picked,
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
      depositStatus: g.depositStatus,
      depositAmount: g.depositAmount,
      concessions: g.concessions,
      contact: g.contact,
      blocked,
      picked,
      pickupPct: `${pct}%`,
      trend: trendTo(pct),
      subBlocks: subs.map((s) => ({
        roomType: s.roomType,
        blocked: s.blocked,
        picked: pickedByType.get(s.roomType) ?? 0,
        rate: s.rate,
      })),
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
    await authorize(ctx, {
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
      billing: "Master folio — all charges",
      depositStatus: "Not received",
      depositAmount: "Rp 0",
      concessions: "To be negotiated.",
      contact: args.contact ?? "",
    });
    await ctx.db.insert("group_subblocks", {
      groupId,
      propertyId: args.propertyId,
      roomType: args.roomType,
      blocked: args.blocked,
      rate: args.rate,
    });
    return groupId;
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
    const sub = (
      await ctx.db
        .query("group_subblocks")
        .withIndex("by_group", (q) => q.eq("groupId", g._id))
        .collect()
    ).find((s) => s.roomType === args.roomType);

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
      checkOut: addDaysIso(g.startDate, g.nights),
      status: "confirmed",
      rate: sub?.rate ?? "Rp 1,850,000",
      totalAmount: sub?.rate ?? "Rp 1,850,000",
      channel: "Group",
      roomType: args.roomType,
      adults: 1,
      children: 0,
      groupId: g._id,
    });
  },
});
