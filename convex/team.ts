import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authorize, writeAudit } from "./authz";
import type { PropertyRole } from "./authz";

const PROPERTY_ROLES: PropertyRole[] = [
  "gm",
  "night_auditor",
  "front_office",
  "maintenance",
  "housekeeping",
  "read_only",
];

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

/** The signed-in user's membership row for one property (role, status, name). */
export const currentMember = query({
  args: { propertyId: v.id("properties"), email: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("property_members")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .collect();
    return rows.find((r) => r.propertyId === args.propertyId) ?? null;
  },
});

export const addMember = mutation({
  args: {
    propertyId: v.id("properties"),
    email: v.optional(v.string()), // caller identity
    memberEmail: v.string(),
    memberName: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      email: args.email,
      propertyId: args.propertyId,
      requireProperty: "gm",
    });
    const role = PROPERTY_ROLES.includes(args.role as PropertyRole)
      ? args.role
      : "read_only";
    const lower = args.memberEmail.trim().toLowerCase();

    const existing = await ctx.db
      .query("property_members")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    if (existing.some((m) => m.email === lower)) {
      throw new Error("That email is already a member of this property.");
    }
    const property = await ctx.db.get(args.propertyId);
    const id = await ctx.db.insert("property_members", {
      propertyId: args.propertyId,
      accountId: property?.accountId,
      email: lower,
      name: args.memberName.trim() || lower,
      role,
      status: "invited",
    });
    await writeAudit(ctx, scope, "property.member.add", {
      propertyId: args.propertyId,
      target: lower,
      detail: role,
    });
    return id;
  },
});

export const updateMemberRole = mutation({
  args: {
    id: v.id("property_members"),
    email: v.optional(v.string()),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Member not found");
    const scope = await authorize(ctx, {
      email: args.email,
      propertyId: row.propertyId,
      requireProperty: "gm",
    });
    const role = PROPERTY_ROLES.includes(args.role as PropertyRole)
      ? args.role
      : "read_only";
    await ctx.db.patch(args.id, { role });
    await writeAudit(ctx, scope, "property.member.role", {
      propertyId: row.propertyId,
      target: row.email,
      detail: role,
    });
    return { success: true };
  },
});

export const removeMember = mutation({
  args: { id: v.id("property_members"), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Member not found");
    const scope = await authorize(ctx, {
      email: args.email,
      propertyId: row.propertyId,
      requireProperty: "gm",
    });
    await ctx.db.delete(args.id);
    await writeAudit(ctx, scope, "property.member.remove", {
      propertyId: row.propertyId,
      target: row.email,
    });
    return { success: true };
  },
});
