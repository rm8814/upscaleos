import { query } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { addDaysIso } from "./rateModel";
import { RELEASED_STATUSES } from "./occupancy";

async function businessDate(ctx: QueryCtx, propertyId: Id<"properties">) {
  const p = await ctx.db.get(propertyId);
  return p?.businessDate ?? "2026-09-08";
}

// Workload weights. Credits are the planning unit (a housekeeper does ~16
// departure-equivalents a shift); minutes drive the labour-hours estimate.
const CREDITS = { departure: 1, stayover: 0.5, arrival: 0.35 };
const MINUTES = { departure: 45, stayover: 20, arrival: 12 };
const CREDITS_PER_HK_SHIFT = 16;

/**
 * Cleaning forecast for the next N business days: arrivals, departures and
 * stayovers per day turned into a labour estimate and a housekeeper count.
 * Turnovers (a room that checks out and back in the same day) are the
 * heaviest and are surfaced separately.
 */
export const getHousekeepingForecast = query({
  args: { propertyId: v.id("properties"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const days = Math.min(Math.max(args.days ?? 7, 1), 21);
    const bd = await businessDate(ctx, args.propertyId);
    const reservations = (
      await ctx.db
        .query("reservations")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect()
    ).filter((r) => !RELEASED_STATUSES.has(r.status) && r.status !== "cancelled");

    const rows = [];
    for (let i = 0; i < days; i++) {
      const date = addDaysIso(bd, i);
      const departures = reservations.filter((r) => r.checkOut === date);
      const arrivals = reservations.filter((r) => r.checkIn === date);
      const stayovers = reservations.filter(
        (r) => r.checkIn < date && r.checkOut > date
      );
      const departingRooms = new Set(
        departures.map((r) => r.roomId).filter(Boolean) as Id<"rooms">[]
      );
      const turnovers = arrivals.filter(
        (a) => a.roomId && departingRooms.has(a.roomId)
      ).length;

      const credits =
        departures.length * CREDITS.departure +
        stayovers.length * CREDITS.stayover +
        arrivals.length * CREDITS.arrival;
      const minutes =
        departures.length * MINUTES.departure +
        stayovers.length * MINUTES.stayover +
        arrivals.length * MINUTES.arrival;

      rows.push({
        date,
        isToday: date === bd,
        arrivals: arrivals.length,
        departures: departures.length,
        stayovers: stayovers.length,
        turnovers,
        credits: Math.round(credits * 10) / 10,
        laborHours: Math.round((minutes / 60) * 10) / 10,
        housekeepersNeeded: Math.max(1, Math.ceil(credits / CREDITS_PER_HK_SHIFT)),
      });
    }

    const peak = rows.reduce(
      (m, r) => Math.max(m, r.housekeepersNeeded),
      0
    );
    return {
      businessDate: bd,
      creditsPerHousekeeper: CREDITS_PER_HK_SHIFT,
      peakHousekeepers: peak,
      rows,
    };
  },
});
