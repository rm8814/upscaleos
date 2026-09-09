import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { authorize, writeAudit } from "./authz";

type Ctx = QueryCtx | MutationCtx;

export type ChannelTerm = {
  channel: string;
  commissionPct: number;
  collection: "merchant" | "hotel";
};

/**
 * Batched channel -> terms resolver. A channel with no configured row (e.g.
 * "Direct", "Phone") carries no commission.
 */
export async function loadChannelTerms(ctx: Ctx, propertyId: Id<"properties">) {
  const rows = await ctx.db
    .query("channel_terms")
    .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
    .collect();
  const byChannel = new Map(
    rows
      .filter((r) => r.active)
      .map((r) => [
        r.channel,
        {
          channel: r.channel,
          commissionPct: r.commissionPct,
          collection: r.collection as "merchant" | "hotel",
        },
      ])
  );
  /** gross room revenue -> commission the hotel owes the channel. */
  return {
    term: (channel: string | undefined): ChannelTerm | undefined =>
      channel ? byChannel.get(channel) : undefined,
    commissionOn: (channel: string | undefined, gross: number): number => {
      const t = channel ? byChannel.get(channel) : undefined;
      return t ? Math.round(gross * t.commissionPct) : 0;
    },
  };
}

/* -------------------------------------------------- reads --------------- */

export const getChannelTerms = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("channel_terms")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    return rows
      .map((r) => ({
        _id: r._id,
        channel: r.channel,
        commissionPct: r.commissionPct,
        commissionLabel: `${Math.round(r.commissionPct * 100)}%`,
        collection: r.collection,
        active: r.active,
      }))
      .sort((a, b) => a.channel.localeCompare(b.channel));
  },
});

/* -------------------------------------------------- writes ------------- */

export const upsertChannelTerm = mutation({
  args: {
    propertyId: v.id("properties"),
    channel: v.string(),
    commissionPct: v.number(),
    collection: v.string(),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "gm",
    });
    const existing = (
      await ctx.db
        .query("channel_terms")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect()
    ).find((r) => r.channel === args.channel);
    const doc = {
      propertyId: args.propertyId,
      channel: args.channel,
      commissionPct: args.commissionPct,
      collection: args.collection,
      active: args.active ?? true,
    };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("channel_terms", doc);
    await writeAudit(ctx, scope, "channel.terms", {
      propertyId: args.propertyId,
      target: args.channel,
      detail: `${Math.round(args.commissionPct * 100)}% · ${args.collection}`,
    });
  },
});
