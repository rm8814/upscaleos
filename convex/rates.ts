import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { authorize, writeAudit } from "./authz";

const DYNAMIC_PCT = 0.06; // the grid's dynamic-pricing toggle uplift

type Ctx = QueryCtx | MutationCtx;

/* -------------------------------------------------- rate resolution ------- */

/**
 * The effective nightly rate for one (roomType, date), given the rack rate:
 *   dynamic-pricing day  -> rack × (1 + pct)
 *   manual override       -> the typed amount
 *   otherwise             -> rack
 * Dynamic pricing wins over a manual override (the grid locks the cell then).
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

/** Batched resolver for hot loops (stats, pickup fan-out). */
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
  return (roomType: string, date: string, rack: number) => {
    const pct = adjByDate.get(date);
    if (pct !== undefined) return Math.round(rack * (1 + pct));
    const manual = overrideByCell.get(`${roomType}|${date}`);
    return manual !== undefined ? manual : rack;
  };
}

/* -------------------------------------------------- reads ---------------- */

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

/* -------------------------------------------------- writes -------------- */

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
      detail: amount > 0 ? `Rp ${amount.toLocaleString("en-US")}` : "cleared",
    });
  },
});
