import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { assignPropertyRooms } from "./reservations";
import { postNightlyToOpenFolios, closeFolio } from "./folios";

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

  // Post the night that just ended to every open folio.
  await postNightlyToOpenFolios(ctx, id, oldDate);

  const reservations = await ctx.db
    .query("reservations")
    .withIndex("by_property", (q) => q.eq("propertyId", id))
    .collect();
  for (const r of reservations) {
    if (r.status === "inhouse" && r.checkOut <= newDate) {
      await ctx.db.patch(r._id, { status: "departed" });
      if (r.roomId)
        await ctx.db.patch(r.roomId, {
          status: "Vacant Dirty",
          updatedLabel: "just now",
        });
      await closeFolio(ctx, r._id, newDate);
    }
  }

  return { businessDate: newDate, previous: oldDate };
}

const MAX_AUTO_CATCHUP = 14; // days; a larger gap needs a manual catch-up

function daysBetween(a: string, b: string) {
  return Math.round(
    (Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000
  );
}

/**
 * Roll a property's business date forward one day at a time until it reaches
 * `target` (or `cap` rolls, whichever comes first). Each step runs a full
 * `rollOne`, so every skipped day's departures still post.
 */
async function rollUpTo(
  ctx: MutationCtx,
  id: Id<"properties">,
  target: string,
  cap: number
) {
  const start = (await ctx.db.get(id))?.businessDate ?? "2026-09-08";
  let current = start;
  let days = 0;
  while (current < target && days < cap) {
    current = (await rollOne(ctx, id)).businessDate;
    days += 1;
  }
  return { from: start, to: current, days, behind: current < target };
}

/**
 * Night-audit "Run remaining steps" calls this. On schedule it advances one
 * day; if the last close was several days ago it catches up to `toDate`,
 * posting each intervening day. Afterwards it runs the room auto-assign sweep
 * (when the property has that setting on) so newly-current arrivals that came
 * in without a room get one.
 */
export const rollBusinessDate = mutation({
  args: { id: v.id("properties"), toDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const property = await ctx.db.get(args.id);
    const biz = property?.businessDate ?? "2026-09-08";

    const rolled =
      args.toDate && args.toDate > biz
        ? await rollUpTo(ctx, args.id, args.toDate, 60)
        : await (async () => {
            const res = await rollOne(ctx, args.id);
            return {
              from: res.previous,
              to: res.businessDate,
              days: 1,
              behind: false,
            };
          })();

    const roomsAssigned = property?.autoAssignRooms
      ? (await assignPropertyRooms(ctx, args.id)).assigned
      : 0;

    return { ...rolled, roomsAssigned };
  },
});

/**
 * Cron entry point. For every property with automatic night audit enabled and
 * whose local time is at/after its scheduled hour, advance the business date to
 * the current wall-clock date — one day if on schedule, or catching up day by
 * day if the last close was missed. A gap wider than MAX_AUTO_CATCHUP days is
 * left for a manual catch-up so a badly wrong clock can't run the date away.
 */
export const runScheduledNightAudits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const properties = await ctx.db.query("properties").collect();
    const rolled: string[] = [];
    const needsManualCatchup: string[] = [];

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

      const bizDate = p.businessDate ?? "2026-09-08";
      if (wallTime < p.nightAuditTime || bizDate >= wallDate) continue;

      if (daysBetween(bizDate, wallDate) > MAX_AUTO_CATCHUP) {
        needsManualCatchup.push(p.name);
        continue;
      }

      const r = await rollUpTo(ctx, p._id, wallDate, MAX_AUTO_CATCHUP);
      const assigned = p.autoAssignRooms
        ? (await assignPropertyRooms(ctx, p._id)).assigned
        : 0;
      rolled.push(
        `${p.name} (+${r.days}d${assigned ? `, ${assigned} rooms` : ""})`
      );
    }

    return { rolled, needsManualCatchup };
  },
});
