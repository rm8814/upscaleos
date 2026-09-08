import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("waitlist")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
  },
});

export const remove = mutation({
  args: { id: v.id("waitlist") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
