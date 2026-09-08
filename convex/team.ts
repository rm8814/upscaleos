import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listMembers = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("property_members")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const addMember = mutation({
  args: {
    propertyId: v.id("properties"),
    email: v.string(),
    name: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("property_members")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    if (existing.some((m) => m.email.toLowerCase() === args.email.toLowerCase())) {
      throw new Error("That email is already a member of this property.");
    }
    return await ctx.db.insert("property_members", {
      propertyId: args.propertyId,
      email: args.email,
      name: args.name || args.email,
      role: args.role,
      status: "invited",
    });
  },
});

export const updateMemberRole = mutation({
  args: { id: v.id("property_members"), role: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { role: args.role });
    return { success: true };
  },
});

export const removeMember = mutation({
  args: { id: v.id("property_members") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
