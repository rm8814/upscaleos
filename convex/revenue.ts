import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const FALLBACK_TODAY = "2026-09-08";
const NIGHTLY: Record<string, number> = {
  "Deluxe Twin": 1_450_000,
  "Double Queen": 1_850_000,
  "King Suite": 2_600_000,
  "Presidential Suite": 6_900_000,
};

async function businessDate(ctx: QueryCtx, propertyId: Id<"properties">) {
  const p = await ctx.db.get(propertyId);
  return p?.businessDate ?? FALLBACK_TODAY;
}

const addDaysIso = (iso: string, delta: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};
const money = (n: number) => `Rp ${Math.round(n).toLocaleString("en-US")}`;
const nightlyRate = (r: Doc<"reservations">) => {
  const parsed = Number((r.rate ?? "").replace(/[^\d]/g, ""));
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return NIGHTLY[r.roomType ?? ""] ?? 1_850_000;
};
const pctDelta = (cur: number, prev: number) =>
  prev > 0 ? ((cur - prev) / prev) * 100 : null;
const fmtDelta = (d: number | null) =>
  d === null ? "—" : `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;

/** Room revenue / rooms sold / availability across a set of stay-nights. */
function windowStats(
  reservations: Doc<"reservations">[],
  sellableRooms: number,
  nights: string[]
) {
  let roomsSold = 0;
  let roomRevenue = 0;
  for (const d of nights) {
    for (const r of reservations) {
      if (r.status === "cancelled") continue;
      if (r.checkIn <= d && d < r.checkOut) {
        roomsSold += 1;
        roomRevenue += nightlyRate(r);
      }
    }
  }
  const available = sellableRooms * nights.length;
  return {
    roomRevenue,
    roomsSold,
    available,
    adr: roomsSold ? roomRevenue / roomsSold : 0,
    revpar: available ? roomRevenue / available : 0,
    occ: available ? (roomsSold / available) * 100 : 0,
  };
}

export const getCorporateAgreements = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("corporate_agreements")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
  },
});

export const getAgreementProduction = query({
  args: { agreementId: v.id("corporate_agreements") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("corporate_production")
      .withIndex("by_agreement", (q) => q.eq("agreementId", args.agreementId))
      .first();
  },
});

export const applyRateSuggestion = mutation({
  args: { agreementId: v.id("corporate_agreements"), newRate: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agreementId, { rate: args.newRate });
    return { success: true };
  },
});

/**
 * Room-revenue KPI tiles for the dashboard. Windows are anchored to the PMS
 * business date: "today" = that night, "7d"/"30d" = the trailing 7 / 30 nights.
 * Deltas compare against the equal-length window immediately before it.
 * Room revenue is the sum of nightly rates for every occupied room-night;
 * available room-nights use the current sellable-room count (no historical
 * out-of-order data in the prototype).
 */
export const getKpis = query({
  args: {
    propertyId: v.id("properties"),
    period: v.union(v.literal("today"), v.literal("7d"), v.literal("30d")),
  },
  handler: async (ctx, args) => {
    const today = await businessDate(ctx, args.propertyId);
    const [rooms, reservations] = await Promise.all([
      ctx.db
        .query("rooms")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("reservations")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
    ]);
    const sellable = rooms.filter(
      (r) => r.status !== "OOO" && r.status !== "OOS"
    ).length;

    const count = args.period === "today" ? 1 : args.period === "7d" ? 7 : 30;
    const nights = Array.from({ length: count }, (_, i) =>
      addDaysIso(today, -(count - 1 - i))
    );
    const priorNights = Array.from({ length: count }, (_, i) =>
      addDaysIso(today, -(2 * count - 1 - i))
    );

    const cur = windowStats(reservations, sellable, nights);
    const prev = windowStats(reservations, sellable, priorNights);

    return {
      revenue: money(cur.roomRevenue),
      revDelta: fmtDelta(pctDelta(cur.roomRevenue, prev.roomRevenue)),
      adr: money(cur.adr),
      adrDelta: fmtDelta(pctDelta(cur.adr, prev.adr)),
      revpar: money(cur.revpar),
      revparDelta: fmtDelta(pctDelta(cur.revpar, prev.revpar)),
      occupancyPct: Math.round(cur.occ),
      roomsSold: cur.roomsSold,
      availableRoomNights: cur.available,
      from: nights[0],
      to: nights[nights.length - 1],
    };
  },
});

export const getRevenueMetrics = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    return {
      adr: "Rp 2,350,000",
      revpar: "Rp 1,900,000",
      avgLeadTime: "14 Days",
      marketShare: "24%",
    };
  },
});

export const getRateSuggestions = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    return [
      { date: "Sep 10", currentRate: "Rp 2,200,000", suggestedRate: "Rp 2,800,000", delta: "+Rp 600,000", confidence: "94%", reason: "High demand forecast due to Java Jazz Festival", demand: "High" },
      { date: "Sep 11", currentRate: "Rp 2,200,000", suggestedRate: "Rp 2,500,000", delta: "+Rp 300,000", confidence: "88%", reason: "Mid-week corporate peak", demand: "Medium" },
      { date: "Sep 12", currentRate: "Rp 2,200,000", suggestedRate: "Rp 2,100,000", delta: "-Rp 100,000", confidence: "72%", reason: "Low organic demand detected", demand: "Low" },
      { date: "Sep 13", currentRate: "Rp 2,500,000", suggestedRate: "Rp 3,200,000", delta: "+Rp 700,000", confidence: "91%", reason: "Weekend peak + wedding block", demand: "High" },
    ];
  },
});
