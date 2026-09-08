import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listTaxes = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("taxes")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
  },
});

export const addTax = mutation({
  args: {
    propertyId: v.id("properties"),
    name: v.string(),
    rate: v.string(),
    basis: v.string(),
    inclusive: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("taxes", args);
  },
});

export const updateTax = mutation({
  args: {
    id: v.id("taxes"),
    patch: v.object({
      name: v.optional(v.string()),
      rate: v.optional(v.string()),
      basis: v.optional(v.string()),
      inclusive: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.patch);
    return { success: true };
  },
});

export const deleteTax = mutation({
  args: { id: v.id("taxes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
