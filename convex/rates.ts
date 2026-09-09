import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { authorize, writeAudit } from "./authz";
import {
  ROOM_TYPES,
  nightlyRateFor,
  addDaysIso,
  money,
} from "./rateModel";
import { roomNightTaxes } from "./taxEngine";

const DYNAMIC_PCT = 0.06; // the grid's dynamic-pricing toggle uplift

type Ctx = QueryCtx | MutationCtx;
export type RateSource = "rack" | "dynamic" | "manual";

/* -------------------------------------------------- rate resolution ------ */

/**
 * Resolve one (roomType, date) against the property's rate rules, given the
 * rack rate:
 *   dynamic-pricing day  -> rack × (1 + pct)   (wins; the grid locks the cell)
 *   manual override      -> the typed amount
 *   otherwise            -> rack
 */
export async function applyRateRules(
  ctx: Ctx,
  propertyId: Id<"properties">,
  roomType: string,
  date: string,
  rack: number
): Promise<number> {
  const adj = await ctx.db
    .query("rate_adjustments")
    .withIndex("by_property_date", (q) =>
      q.eq("propertyId", propertyId).eq("date", date)
    )
    .first();
  if (adj) return Math.round(rack * (1 + adj.pct));

  const override = (
    await ctx.db
      .query("rate_overrides")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect()
  ).find((o) => o.roomType === roomType && o.date === date);
  return override ? override.amount : rack;
}

/**
 * THE nightly rate any part of the app should use for a booked / bookable
 * night: rack rate with the property's dynamic / manual rules applied.
 */
export async function effectiveNightlyRate(
  ctx: Ctx,
  propertyId: Id<"properties">,
  roomType: string,
  date: string
): Promise<number> {
  return applyRateRules(
    ctx,
    propertyId,
    roomType,
    date,
    nightlyRateFor(roomType, date)
  );
}

/** Batched resolver for hot loops (KPIs, night-audit stats, pickup fan-out). */
export async function loadRateRules(ctx: Ctx, propertyId: Id<"properties">) {
  const [adjustments, overrides] = await Promise.all([
    ctx.db
      .query("rate_adjustments")
      .withIndex("by_property_date", (q) => q.eq("propertyId", propertyId))
      .collect(),
    ctx.db
      .query("rate_overrides")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect(),
  ]);
  const adjByDate = new Map(adjustments.map((a) => [a.date, a.pct]));
  const overrideByCell = new Map(
    overrides.map((o) => [`${o.roomType}|${o.date}`, o.amount])
  );
  /** rack in -> effective rate out, applying the same precedence as above. */
  return (roomType: string, date: string, rack: number): number => {
    const pct = adjByDate.get(date);
    if (pct !== undefined) return Math.round(rack * (1 + pct));
    const manual = overrideByCell.get(`${roomType}|${date}`);
    return manual !== undefined ? manual : rack;
  };
}

/**
 * Priced quote for a whole stay — per-night effective rates plus the property's
 * tax engine. The single source of truth for "what will this stay cost": used
 * by the booking quote query AND by reservations.create / updateDates so the
 * stored estimate never drifts from what the folio will actually post.
 */
export async function quoteStay(
  ctx: Ctx,
  args: {
    propertyId: Id<"properties">;
    roomType: string;
    checkIn: string;
    checkOut: string;
  }
): Promise<{
  nights: { date: string; rate: number }[];
  subtotal: number;
  tax: number;
  total: number;
}> {
  const rules = await loadRateRules(ctx, args.propertyId);
  const taxRows = await ctx.db
    .query("taxes")
    .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
    .collect();

  const nights: { date: string; rate: number }[] = [];
  for (let d = args.checkIn; d < args.checkOut; d = addDaysIso(d, 1)) {
    nights.push({
      date: d,
      rate: rules(args.roomType, d, nightlyRateFor(args.roomType, d)),
    });
  }
  const subtotal = nights.reduce((s, n) => s + n.rate, 0);
  const tax = nights.reduce(
    (s, n, i) =>
      s +
      roomNightTaxes(taxRows, n.rate, { firstNight: i === 0 }).taxLines.reduce(
        (a, t) => a + t.amount,
        0
      ),
    0
  );
  return { nights, subtotal, tax, total: subtotal + tax };
}

/* -------------------------------------------------- reads --------------- */

export const getAdjustments = query({
  args: { propertyId: v.id("properties"), from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    return (
      await ctx.db
        .query("rate_adjustments")
        .withIndex("by_property_date", (q) => q.eq("propertyId", args.propertyId))
        .collect()
    )
      .filter((r) => r.date >= args.from && r.date <= args.to)
      .map((r) => ({ date: r.date, pct: r.pct }));
  },
});

export const getOverrides = query({
  args: { propertyId: v.id("properties"), from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    return (
      await ctx.db
        .query("rate_overrides")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect()
    )
      .filter((o) => o.date >= args.from && o.date <= args.to)
      .map((o) => ({ roomType: o.roomType, date: o.date, amount: o.amount }));
  },
});

/**
 * The full rate grid: effective rate + which rule produced it, for every room
 * type across a date window. The rates screen renders this directly — it does
 * no rate math of its own.
 */
export const getRatesGrid = query({
  args: { propertyId: v.id("properties"), from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    const [adjustments, overrides] = await Promise.all([
      ctx.db
        .query("rate_adjustments")
        .withIndex("by_property_date", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("rate_overrides")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
    ]);
    const adjByDate = new Map(
      adjustments
        .filter((a) => a.date >= args.from && a.date <= args.to)
        .map((a) => [a.date, a.pct])
    );
    const ovByCell = new Map(
      overrides
        .filter((o) => o.date >= args.from && o.date <= args.to)
        .map((o) => [`${o.roomType}|${o.date}`, o.amount])
    );

    const out: {
      roomType: string;
      date: string;
      rate: number;
      source: RateSource;
    }[] = [];
    for (const roomType of ROOM_TYPES) {
      for (let d = args.from; d <= args.to; d = addDaysIso(d, 1)) {
        const rack = nightlyRateFor(roomType, d);
        const pct = adjByDate.get(d);
        const manual = ovByCell.get(`${roomType}|${d}`);
        let rate = rack;
        let source: RateSource = "rack";
        if (pct !== undefined) {
          rate = Math.round(rack * (1 + pct));
          source = "dynamic";
        } else if (manual !== undefined) {
          rate = manual;
          source = "manual";
        }
        out.push({ roomType, date: d, rate, source });
      }
    }
    return out;
  },
});

/* -------------------------------------------------- writes ------------- */

/** Turn the dynamic-pricing toggle on/off for one stay date. */
export const setDynamic = mutation({
  args: { propertyId: v.id("properties"), date: v.string(), on: v.boolean() },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "gm",
    });
    const existing = await ctx.db
      .query("rate_adjustments")
      .withIndex("by_property_date", (q) =>
        q.eq("propertyId", args.propertyId).eq("date", args.date)
      )
      .first();

    if (args.on) {
      if (existing) await ctx.db.patch(existing._id, { pct: DYNAMIC_PCT });
      else
        await ctx.db.insert("rate_adjustments", {
          propertyId: args.propertyId,
          date: args.date,
          pct: DYNAMIC_PCT,
        });
    } else if (existing) {
      await ctx.db.delete(existing._id);
    }

    await writeAudit(ctx, scope, "rate.dynamic", {
      propertyId: args.propertyId,
      target: args.date,
      detail: args.on ? `+${Math.round(DYNAMIC_PCT * 100)}%` : "off",
    });
  },
});

/** Set (amount > 0) or clear (amount <= 0) a manual rate for one grid cell. */
export const setManualRate = mutation({
  args: {
    propertyId: v.id("properties"),
    roomType: v.string(),
    date: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "gm",
    });
    const existing = (
      await ctx.db
        .query("rate_overrides")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect()
    ).find((o) => o.roomType === args.roomType && o.date === args.date);

    const amount = Math.round(args.amount);
    if (amount > 0) {
      if (existing) await ctx.db.patch(existing._id, { amount });
      else
        await ctx.db.insert("rate_overrides", {
          propertyId: args.propertyId,
          roomType: args.roomType,
          date: args.date,
          amount,
        });
    } else if (existing) {
      await ctx.db.delete(existing._id);
    }

    await writeAudit(ctx, scope, "rate.manual", {
      propertyId: args.propertyId,
      target: `${args.roomType} · ${args.date}`,
      detail: amount > 0 ? money(amount) : "cleared",
    });
  },
});
