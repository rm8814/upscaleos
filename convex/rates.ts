import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { authorize, writeAudit } from "./authz";

const DYNAMIC_PCT = 0.06; // the grid's dynamic-pricing toggle uplift

/** The rate adjustment multiplier for one stay date (1 = none). */
export async function rateMultiplierFor(
  ctx: QueryCtx | MutationCtx,
  propertyId: Id<"properties">,
  date: string
): Promise<number> {
  const row = await ctx.db
    .query("rate_adjustments")
    .withIndex("by_property_date", (q) =>
      q.eq("propertyId", propertyId).eq("date", date)
    )
    .first();
  return 1 + (row?.pct ?? 0);
}

/** Every rate adjustment in a date window. */
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

/** Turn the dynamic-pricing toggle on/off for one stay date. */
export const setDynamic = mutation({
  args: {
    propertyId: v.id("properties"),
    date: v.string(),
    on: v.boolean(),
  },
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
