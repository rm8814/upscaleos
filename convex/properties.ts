import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

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
      autoAssignRooms: v.optional(v.boolean()),
      autoNightAudit: v.optional(v.boolean()),
      nightAuditTime: v.optional(v.string()),
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

/**
 * Advance one property's PMS business date by a day and post that day's
 * departures (in-house guests whose checkout has now passed).
 */
async function rollOne(ctx: MutationCtx, id: Id<"properties">) {
  const property = await ctx.db.get(id);
  if (!property) throw new Error("Property not found");
  const oldDate = property.businessDate ?? "2026-09-08";
  const d = new Date(oldDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  const newDate = d.toISOString().slice(0, 10);

  await ctx.db.patch(id, { businessDate: newDate });

  const reservations = await ctx.db
    .query("reservations")
    .withIndex("by_property", (q) => q.eq("propertyId", id))
    .collect();
  for (const r of reservations) {
    if (r.status === "inhouse" && r.checkOut <= newDate) {
      await ctx.db.patch(r._id, { status: "departed" });
    }
  }

  return { businessDate: newDate, previous: oldDate };
}

/** Night-audit "Run remaining steps" calls this to roll the date manually. */
export const rollBusinessDate = mutation({
  args: { id: v.id("properties") },
  handler: (ctx, args) => rollOne(ctx, args.id),
});

/**
 * Cron entry point. For every property with automatic night audit enabled,
 * roll the business date once per day, on or after its scheduled local time,
 * and only when it is exactly one day behind the wall-clock date (so a stale
 * demo dataset never "runs away" catching up).
 */
export const runScheduledNightAudits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const properties = await ctx.db.query("properties").collect();
    const rolled: string[] = [];

    for (const p of properties) {
      if (!p.autoNightAudit || !p.nightAuditTime) continue;
      const tz = p.timezone ?? "Asia/Makassar";

      let wallDate: string;
      let wallTime: string;
      try {
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: tz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).formatToParts(now);
        const get = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
        wallDate = `${get("year")}-${get("month")}-${get("day")}`;
        wallTime = `${get("hour")}:${get("minute")}`;
      } catch {
        continue; // unknown timezone — skip rather than roll on a wrong clock
      }

      const yesterday = new Date(wallDate + "T00:00:00Z");
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayIso = yesterday.toISOString().slice(0, 10);

      const bizDate = p.businessDate ?? "2026-09-08";
      if (bizDate === yesterdayIso && wallTime >= p.nightAuditTime) {
        await rollOne(ctx, p._id);
        rolled.push(p.name);
      }
    }

    return { rolled };
  },
});
