import { query } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import { addDaysIso, money } from "./rateModel";
import { loadReservationRates } from "./rates";
import {
  sellableRoomCount,
  roomCountsByType,
  RELEASED_STATUSES,
} from "./occupancy";

async function businessDate(ctx: QueryCtx, propertyId: Id<"properties">) {
  const p = await ctx.db.get(propertyId);
  return p?.businessDate ?? "2026-09-08";
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
const monthKey = (iso: string) => iso.slice(0, 7);

/**
 * Everything the /revenue/reports screen shows, from real data:
 *   pace / forecast   — on-the-books room-nights & revenue by future stay date
 *   pickup            — day-over-day change from pickup_snapshots
 *   bySource/byRoomType — production over the next 30 nights
 *   monthly           — month-to-date from daily_stats
 */
export const getReports = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const bd = await businessDate(ctx, args.propertyId);
    const [rooms, reservations, dailyStats, snapshots] = await Promise.all([
      ctx.db
        .query("rooms")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("reservations")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("daily_stats")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("pickup_snapshots")
        .withIndex("by_property_asof", (q) =>
          q.eq("propertyId", args.propertyId)
        )
        .collect(),
    ]);

    const sellableTotal = sellableRoomCount(rooms);
    const { sellable: sellableByType } = roomCountsByType(rooms);
    const rate = await loadReservationRates(ctx, args.propertyId);

    const onBooks = (d: string): Doc<"reservations">[] =>
      reservations.filter(
        (r) =>
          !RELEASED_STATUSES.has(r.status) &&
          r.checkIn <= d &&
          r.checkOut > d
      );

    /* ---- pace: next 14 stay dates, on the books ---- */
    const pace = Array.from({ length: 14 }, (_, i) => {
      const d = addDaysIso(bd, i);
      const os = onBooks(d);
      const rooms_ = os.length;
      const rev = os.reduce((s, r) => s + rate(r, d), 0);
      return {
        date: d,
        rooms: rooms_,
        occPct: pct(rooms_, sellableTotal),
        adr: money(rooms_ ? rev / rooms_ : 0),
        revenue: money(rev),
      };
    });

    /* ---- pickup: change from the last two snapshots ---- */
    const asOfs = [...new Set(snapshots.map((s) => s.asOf))].sort();
    const latest = asOfs[asOfs.length - 1] ?? null;
    const prev = asOfs.length > 1 ? asOfs[asOfs.length - 2] : null;
    const snapAt = (asOf: string) =>
      new Map(
        snapshots.filter((s) => s.asOf === asOf).map((s) => [s.forDate, s])
      );
    const now = latest ? snapAt(latest) : new Map();
    const before = prev ? snapAt(prev) : new Map();
    const pickup = latest
      ? Array.from({ length: 14 }, (_, i) => {
          const d = addDaysIso(latest, i);
          const cur = now.get(d);
          const old = before.get(d);
          return {
            date: d,
            onBooks: cur?.roomsOnBooks ?? 0,
            added: (cur?.roomsOnBooks ?? 0) - (old?.roomsOnBooks ?? 0),
            revenue: money(cur?.revenueOnBooks ?? 0),
          };
        })
      : [];

    /* ---- production over the next 30 nights ---- */
    const prodDates = Array.from({ length: 30 }, (_, i) => addDaysIso(bd, i));
    const bySourceMap = new Map<
      string,
      { roomNights: number; revenue: number; keys: Set<string> }
    >();
    const byTypeMap = new Map<
      string,
      { roomNights: number; revenue: number; keys: Set<string> }
    >();
    for (const d of prodDates) {
      for (const r of onBooks(d)) {
        const amt = rate(r, d);
        const src = r.channel ?? "Direct";
        const s =
          bySourceMap.get(src) ??
          { roomNights: 0, revenue: 0, keys: new Set<string>() };
        s.roomNights += 1;
        s.revenue += amt;
        s.keys.add(r._id);
        bySourceMap.set(src, s);

        const rt = r.roomType ?? "—";
        const t =
          byTypeMap.get(rt) ??
          { roomNights: 0, revenue: 0, keys: new Set<string>() };
        t.roomNights += 1;
        t.revenue += amt;
        t.keys.add(r._id);
        byTypeMap.set(rt, t);
      }
    }
    const bySource = [...bySourceMap.entries()]
      .map(([source, v]) => ({
        source,
        rooms: v.keys.size,
        roomNights: v.roomNights,
        adr: money(v.roomNights ? v.revenue / v.roomNights : 0),
        revenue: money(v.revenue),
      }))
      .sort((a, b) => b.roomNights - a.roomNights);
    const byRoomType = [...byTypeMap.entries()]
      .map(([roomType, v]) => {
        const cap = (sellableByType.get(roomType) ?? 0) * prodDates.length;
        return {
          roomType,
          sold: v.roomNights,
          occPct: pct(v.roomNights, cap),
          adr: money(v.roomNights ? v.revenue / v.roomNights : 0),
          revpar: money(cap ? v.revenue / cap : 0),
          revenue: money(v.revenue),
        };
      })
      .sort((a, b) => b.revenue.localeCompare(a.revenue));

    /* ---- forecast: 4 weeks forward, on the books ---- */
    const forecast = Array.from({ length: 4 }, (_, w) => {
      const start = addDaysIso(bd, w * 7);
      let rn = 0;
      let rev = 0;
      for (let i = 0; i < 7; i++) {
        const d = addDaysIso(start, i);
        for (const r of onBooks(d)) {
          rn += 1;
          rev += rate(r, d);
        }
      }
      const cap = sellableTotal * 7;
      return {
        weekStart: start,
        occPct: pct(rn, cap),
        adr: money(rn ? rev / rn : 0),
        revpar: money(cap ? rev / cap : 0),
        roomNights: rn,
      };
    });

    /* ---- month to date from daily_stats ---- */
    const mtd = dailyStats
      .filter((s) => monthKey(s.date) === monthKey(bd))
      .sort((a, b) => a.date.localeCompare(b.date));
    const mtdRevenue = mtd.reduce((s, r) => s + r.roomRevenue, 0);
    const mtdRoomsSold = mtd.reduce((s, r) => s + r.roomsSold, 0);
    const mtdAvailable = mtd.reduce((s, r) => s + r.availableRooms, 0);
    const cancellations = reservations.filter(
      (r) => r.status === "cancelled" || r.status === "no_show"
    ).length;
    const directNights = mtd.length
      ? // approximate: share of current bookings that are Direct
        pct(
          onBooks(bd).filter((r) => (r.channel ?? "Direct") === "Direct").length,
          onBooks(bd).length
        )
      : 0;

    const monthly = {
      closedDays: mtd.length,
      revenue: money(mtdRevenue),
      occPct: pct(mtdRoomsSold, mtdAvailable),
      revpar: money(mtdAvailable ? mtdRevenue / mtdAvailable : 0),
      adr: money(mtdRoomsSold ? mtdRevenue / mtdRoomsSold : 0),
      roomsSold: mtdRoomsSold,
      cancellations,
      directSharePct: directNights,
    };

    return {
      businessDate: bd,
      pace,
      pickup,
      pickupAsOf: latest,
      bySource,
      byRoomType,
      forecast,
      monthly,
    };
  },
});
