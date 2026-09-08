import { query } from "./_generated/server";
import { v } from "convex/values";

const money = (n: number) => `Rp ${Math.round(n).toLocaleString("en-US")}`;
const addIso = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Closed business dates for a property, newest first. */
export const dailyStats = query({
  args: { propertyId: v.id("properties"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("daily_stats")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .order("desc")
      .take(Math.min(args.limit ?? 30, 120));
    return rows.map((s) => ({
      date: s.date,
      roomsSold: s.roomsSold,
      availableRooms: s.availableRooms,
      occupancyPct: s.occupancyPct,
      roomRevenue: s.roomRevenue,
      roomRevenueLabel: money(s.roomRevenue),
      adr: s.adr,
      adrLabel: money(s.adr),
      revpar: s.revpar,
      revparLabel: money(s.revpar),
      arrivals: s.arrivals,
      departures: s.departures,
      variance: s.variance,
      varianceLabel: money(s.variance),
      balanced: s.balanced,
      closedAt: s.closedAt,
    }));
  },
});

/**
 * Booking curve for one target stay date: rooms on the books at each snapshot
 * (how many days out it was taken), oldest snapshot first.
 */
export const pace = query({
  args: { propertyId: v.id("properties"), forDate: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("pickup_snapshots")
      .withIndex("by_property_target", (q) =>
        q.eq("propertyId", args.propertyId).eq("forDate", args.forDate)
      )
      .collect();
    return rows
      .sort((a, b) => a.asOf.localeCompare(b.asOf))
      .map((s) => ({
        asOf: s.asOf,
        daysOut: Math.round(
          (Date.parse(args.forDate + "T00:00:00Z") -
            Date.parse(s.asOf + "T00:00:00Z")) /
            86400000
        ),
        roomsOnBooks: s.roomsOnBooks,
        revenueOnBooks: s.revenueOnBooks,
        revenueLabel: money(s.revenueOnBooks),
      }));
  },
});

/**
 * Latest snapshot's pickup pace over the next `days` stay dates: rooms on the
 * books now vs. one snapshot (a day) earlier.
 */
export const pickupSummary = query({
  args: { propertyId: v.id("properties"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const asOfs = [
      ...new Set(
        (
          await ctx.db
            .query("pickup_snapshots")
            .withIndex("by_property_asof", (q) =>
              q.eq("propertyId", args.propertyId)
            )
            .collect()
        ).map((s) => s.asOf)
      ),
    ].sort();
    if (asOfs.length === 0) return { latest: null, rows: [] };
    const latest = asOfs[asOfs.length - 1];
    const prev = asOfs.length > 1 ? asOfs[asOfs.length - 2] : null;

    const load = async (asOf: string) =>
      new Map(
        (
          await ctx.db
            .query("pickup_snapshots")
            .withIndex("by_property_asof", (q) =>
              q.eq("propertyId", args.propertyId).eq("asOf", asOf)
            )
            .collect()
        ).map((s) => [s.forDate, s])
      );

    const now = await load(latest);
    const before = prev ? await load(prev) : new Map();

    const span = Math.min(args.days ?? 14, 45);
    const rows = [];
    for (let i = 0; i < span; i++) {
      const forDate = addIso(latest, i);
      const cur = now.get(forDate);
      const old = before.get(forDate);
      rows.push({
        forDate,
        roomsOnBooks: cur?.roomsOnBooks ?? 0,
        revenueLabel: money(cur?.revenueOnBooks ?? 0),
        pickup: (cur?.roomsOnBooks ?? 0) - (old?.roomsOnBooks ?? 0),
      });
    }
    return { latest, prev, rows };
  },
});
