import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { authorize } from "./authz";
import { nightlyRateFor, addDaysIso, money } from "./rateModel";
import {
  effectiveNightlyRate,
  loadReservationRates,
  quoteStay,
} from "./rates";
import { sellableRoomCount, roomsSoldOn } from "./occupancy";

// Re-exported for callers that historically priced against the rack rate.
// New code should use rates.effectiveNightlyRate / rates.quoteStay.
export { nightlyRateFor };

const FALLBACK_TODAY = "2026-09-08";

async function businessDate(ctx: QueryCtx, propertyId: Id<"properties">) {
  const p = await ctx.db.get(propertyId);
  return p?.businessDate ?? FALLBACK_TODAY;
}

const pctDelta = (cur: number, prev: number) =>
  prev > 0 ? ((cur - prev) / prev) * 100 : null;
const fmtDelta = (d: number | null) =>
  d === null ? "—" : `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;

/**
 * Room revenue / rooms sold / availability across a set of stay-nights.
 * Occupancy comes from the shared `roomsSoldOn` basis; revenue uses the
 * effective nightly rate (same resolver as the folio), not the cached string.
 */
function windowStats(
  reservations: Doc<"reservations">[],
  sellableRooms: number,
  nights: string[],
  rate: (res: Doc<"reservations">, date: string) => number
) {
  let roomsSold = 0;
  let roomRevenue = 0;
  for (const d of nights) {
    for (const r of roomsSoldOn(reservations, d)) {
      roomsSold += 1;
      roomRevenue += rate(r, d);
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
    const agreement = await ctx.db.get(args.agreementId);
    if (!agreement) return null;
    const year = new Date().getUTCFullYear();

    // Live: room-nights on reservations linked to this agreement in the
    // contract year.
    const linked = await ctx.db
      .query("reservations")
      .withIndex("by_corporate", (q) =>
        q.eq("corporateAccountId", args.agreementId)
      )
      .collect();
    let roomsBooked = 0;
    for (const r of linked) {
      if (r.status === "cancelled" || r.status === "no_show") continue;
      for (
        let d = r.checkIn;
        d < r.checkOut;
        d = addDaysIso(d, 1)
      ) {
        if (d.startsWith(String(year))) roomsBooked += 1;
      }
    }

    const legacy = await ctx.db
      .query("corporate_production")
      .withIndex("by_agreement", (q) => q.eq("agreementId", args.agreementId))
      .first();

    return {
      year: String(year),
      roomsBooked,
      roomsContracted: agreement.roomsContracted ?? legacy?.roomsContracted ?? 0,
    };
  },
});

export const applyRateSuggestion = mutation({
  args: { agreementId: v.id("corporate_agreements"), newRate: v.string() },
  handler: async (ctx, args) => {
    const agreement = await ctx.db.get(args.agreementId);
    if (!agreement) throw new Error("Agreement not found");
    await authorize(ctx, {
      propertyId: agreement.propertyId,
      requireProperty: "gm",
    });
    await ctx.db.patch(args.agreementId, { rate: args.newRate });
    return { success: true };
  },
});

/** Effective nightly rates (rules applied) for a room type over [from, to). */
export const getRates = query({
  args: {
    propertyId: v.id("properties"),
    roomType: v.string(),
    from: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const out: { date: string; rate: number }[] = [];
    for (let d = args.from; d < args.to; d = addDaysIso(d, 1)) {
      out.push({
        date: d,
        rate: await effectiveNightlyRate(ctx, args.propertyId, args.roomType, d),
      });
    }
    return out;
  },
});

/** Priced quote for a stay: per-night rates, subtotal, tax and total. */
export const getStayQuote = query({
  args: {
    propertyId: v.id("properties"),
    roomType: v.string(),
    checkIn: v.string(),
    checkOut: v.string(),
    corporateAgreementId: v.optional(v.id("corporate_agreements")),
  },
  handler: async (ctx, args) => {
    const q = await quoteStay(ctx, args);
    return {
      nights: q.nights,
      nightCount: q.nights.length,
      subtotal: q.subtotal,
      subtotalLabel: money(q.subtotal),
      tax: q.tax,
      taxLabel: money(q.tax),
      total: q.total,
      totalLabel: money(q.total),
      firstNight: q.nights[0]?.rate ?? 0,
      firstNightLabel: money(q.nights[0]?.rate ?? 0),
    };
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
    period: v.union(
      v.literal("yesterday"),
      v.literal("today"),
      v.literal("7d"),
      v.literal("30d")
    ),
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
    const sellable = sellableRoomCount(rooms);

    // Window length and the last night of the window (yesterday shifts the
    // anchor back a day; every other period ends on the business date).
    const count =
      args.period === "7d" ? 7 : args.period === "30d" ? 30 : 1;
    const anchor = args.period === "yesterday" ? addDaysIso(today, -1) : today;
    const nights = Array.from({ length: count }, (_, i) =>
      addDaysIso(anchor, -(count - 1 - i))
    );
    const priorNights = Array.from({ length: count }, (_, i) =>
      addDaysIso(anchor, -(2 * count - 1 - i))
    );

    const rate = await loadReservationRates(ctx, args.propertyId);
    const cur = windowStats(reservations, sellable, nights, rate);
    const prev = windowStats(reservations, sellable, priorNights, rate);

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
