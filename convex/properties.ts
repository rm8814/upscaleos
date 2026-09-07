import { query } from "./_generated/server";
import { v } from "convex/values";

export const getByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("properties")
      .withIndex("by_external_id", (q) => q.eq("id", args.externalId))
      .first();
  },
});

export const getFirst = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("properties").first();
  },
});
