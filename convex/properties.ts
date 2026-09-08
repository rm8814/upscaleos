import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const policyValidator = v.object({
  cancellation: v.string(),
  deposit: v.string(),
  children: v.string(),
  pets: v.string(),
  smoking: v.string(),
});

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

/** Properties the signed-in user is a member of, sorted by name. */
export const listForMember = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("property_members")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();

    const props = await Promise.all(
      memberships.map((m) => ctx.db.get(m.propertyId))
    );

    return props
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    externalId: v.string(),
    initials: v.string(),
    location: v.string(),
    address: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    currency: v.string(),
    timezone: v.string(),
    checkInTime: v.string(),
    checkOutTime: v.string(),
    creatorEmail: v.string(),
    creatorName: v.string(),
  },
  handler: async (ctx, args) => {
    const propertyId = await ctx.db.insert("properties", {
      name: args.name,
      id: args.externalId,
      initials: args.initials.toUpperCase().slice(0, 4),
      location: args.location,
      address: args.address,
      contactEmail: args.contactEmail,
      currency: args.currency,
      timezone: args.timezone,
      checkInTime: args.checkInTime,
      checkOutTime: args.checkOutTime,
      status: "onboarding",
    });

    // The creator manages the property from the start.
    await ctx.db.insert("property_members", {
      propertyId,
      email: args.creatorEmail,
      name: args.creatorName,
      role: "General Manager",
      status: "active",
    });

    return propertyId;
  },
});

export const update = mutation({
  args: {
    id: v.id("properties"),
    patch: v.object({
      name: v.optional(v.string()),
      externalId: v.optional(v.string()),
      initials: v.optional(v.string()),
      location: v.optional(v.string()),
      address: v.optional(v.string()),
      contactEmail: v.optional(v.string()),
      currency: v.optional(v.string()),
      timezone: v.optional(v.string()),
      checkInTime: v.optional(v.string()),
      checkOutTime: v.optional(v.string()),
      status: v.optional(v.string()),
      policies: v.optional(policyValidator),
    }),
  },
  handler: async (ctx, args) => {
    const { externalId, initials, ...rest } = args.patch;
    const doc: Record<string, unknown> = { ...rest };
    if (externalId !== undefined) doc.id = externalId;
    if (initials !== undefined) doc.initials = initials.toUpperCase().slice(0, 4);
    await ctx.db.patch(args.id, doc);
    return { success: true };
  },
});
