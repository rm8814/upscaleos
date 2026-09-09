import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { assignPropertyRooms } from "./reservations";
import { postNightlyToOpenFolios, closeFolio } from "./folios";
import { transferClosedFoliosToCityLedger } from "./ar";
import { issueInvoiceForFolio } from "./invoices";
import { loadReservationRates } from "./rates";
import { sellableRoomCount, roomsSoldOn } from "./occupancy";
import { authorize, resolveScope, currentEmail, writeAudit } from "./authz";

const PICKUP_HORIZON_DAYS = 45;
const addIso = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Night-audit statistics: write one immutable `daily_stats` row for the night
 * that just closed and a `pickup_snapshots` fan-out for the booking curve.
 * Includes a trial-balance check — expected room revenue (from the in-house
 * reservations) vs. what actually posted to folios that night.
 */
async function writeNightStats(
  ctx: MutationCtx,
  propertyId: Id<"properties">,
  closedDate: string,
  newDate: string
) {
  const [rooms, reservations, folioLines] = await Promise.all([
    ctx.db
      .query("rooms")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect(),
    ctx.db
      .query("reservations")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect(),
    ctx.db
      .query("folio_lines")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect(),
  ]);

  const availableRooms = sellableRoomCount(rooms);
  const oooRooms = rooms.filter((r) => r.status === "OOO").length;

  const soldThatNight = roomsSoldOn(reservations, closedDate);
  const roomsSold = soldThatNight.length;
  const rate = await loadReservationRates(ctx, propertyId);
  const roomRevenue = soldThatNight.reduce(
    (s, r) => s + rate(r, closedDate),
    0
  );
  const postedRoomRevenue = folioLines
    .filter((l) => l.kind === "room" && l.date === closedDate && !l.voided)
    .reduce((s, l) => s + l.amount, 0);
  const variance = roomRevenue - postedRoomRevenue;

  const stat = {
    propertyId,
    date: closedDate,
    roomsSold,
    availableRooms,
    oooRooms,
    roomRevenue,
    postedRoomRevenue,
    variance,
    balanced: variance === 0,
    adr: roomsSold ? Math.round(roomRevenue / roomsSold) : 0,
    revpar: availableRooms ? Math.round(roomRevenue / availableRooms) : 0,
    occupancyPct: availableRooms
      ? Math.round((roomsSold / availableRooms) * 100)
      : 0,
    arrivals: reservations.filter((r) => r.checkIn === closedDate).length,
    departures: reservations.filter((r) => r.checkOut === newDate).length,
    closedAt: Date.now(),
  };

  const existing = (
    await ctx.db
      .query("daily_stats")
      .withIndex("by_property", (q) =>
        q.eq("propertyId", propertyId).eq("date", closedDate)
      )
      .collect()
  )[0];
  if (existing) await ctx.db.patch(existing._id, stat);
  else await ctx.db.insert("daily_stats", stat);

  // Booking-curve snapshot: rooms & revenue on the books as of the new date.
  const onBooks = reservations.filter(
    (r) => r.status === "confirmed" || r.status === "tentative" || r.status === "inhouse"
  );
  const priorSnaps = await ctx.db
    .query("pickup_snapshots")
    .withIndex("by_property_asof", (q) =>
      q.eq("propertyId", propertyId).eq("asOf", newDate)
    )
    .collect();
  const priorByDate = new Map(priorSnaps.map((s) => [s.forDate, s._id]));

  for (let i = 0; i < PICKUP_HORIZON_DAYS; i++) {
    const forDate = addIso(newDate, i);
    const staying = onBooks.filter(
      (r) => r.checkIn <= forDate && r.checkOut > forDate
    );
    const row = {
      propertyId,
      asOf: newDate,
      forDate,
      roomsOnBooks: staying.length,
      revenueOnBooks: staying.reduce((s, r) => s + rate(r, forDate), 0),
    };
    const id = priorByDate.get(forDate);
    if (id) await ctx.db.patch(id, row);
    else await ctx.db.insert("pickup_snapshots", row);
  }
}

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

/**
 * Properties the signed-in user can open. Account owner / admin / analyst see
 * every property in their account; everyone else sees only the properties they
 * have an explicit `property_members` row for.
 */
export const listForUser = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const email = await currentEmail(ctx, args.email);
    if (!email) return [];
    const scope = await resolveScope(ctx, email);

    if (scope.accountId && scope.seesAllAccountProperties) {
      return (await ctx.db.query("properties").collect())
        .filter((p) => p.accountId === scope.accountId)
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    const memberships = await ctx.db
      .query("property_members")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    const props = await Promise.all(
      memberships.map((m) => ctx.db.get(m.propertyId))
    );
    return props
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

/** @deprecated use listForUser — kept so an old client doesn't hard-fail. */
export const listForMember = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const scope = await resolveScope(ctx, args.email.toLowerCase());
    if (scope.accountId && scope.seesAllAccountProperties) {
      return (await ctx.db.query("properties").collect())
        .filter((p) => p.accountId === scope.accountId)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    const memberships = await ctx.db
      .query("property_members")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
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
    creatorEmail: v.optional(v.string()), // identity; ignored once real auth is wired
    creatorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Only an account owner or admin can onboard a property.
    const scope = await authorize(ctx, {
      email: args.creatorEmail,
      requireAccount: "admin",
    });
    if (!scope.accountId) throw new Error("You are not part of an account.");

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
      accountId: scope.accountId,
    });

    // The person who onboarded it manages it from the start.
    await ctx.db.insert("property_members", {
      propertyId,
      accountId: scope.accountId,
      email: scope.email,
      name: args.creatorName ?? scope.email,
      role: "gm",
      status: "active",
    });

    await writeAudit(ctx, scope, "property.create", {
      propertyId,
      target: args.name,
    });
    return propertyId;
  },
});

export const update = mutation({
  args: {
    id: v.id("properties"),
    email: v.optional(v.string()),
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
    const scope = await authorize(ctx, {
      email: args.email,
      propertyId: args.id,
      requireProperty: "gm",
    });
    const { externalId, initials, ...rest } = args.patch;
    const doc: Record<string, unknown> = { ...rest };
    if (externalId !== undefined) doc.id = externalId;
    if (initials !== undefined) doc.initials = initials.toUpperCase().slice(0, 4);
    await ctx.db.patch(args.id, doc);
    await writeAudit(ctx, scope, "property.update", {
      propertyId: args.id,
      detail: Object.keys(doc).join(", "),
    });
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
  const departedNow: Id<"reservations">[] = [];
  let noShows = 0;
  for (const r of reservations) {
    if (r.status === "inhouse" && r.checkOut <= newDate) {
      await ctx.db.patch(r._id, { status: "departed" });
      if (r.roomId)
        await ctx.db.patch(r.roomId, {
          status: "Vacant Dirty",
          updatedLabel: "just now",
        });
      await closeFolio(ctx, r._id, newDate);
      departedNow.push(r._id);
    }
    // No-show: a booking whose whole arrival day has passed and never checked
    // in. The room (if one was held) is released; no charge is posted — that
    // needs a guarantee-type / cancellation policy the model doesn't have yet.
    else if (
      (r.status === "confirmed" || r.status === "tentative") &&
      r.checkIn < newDate
    ) {
      await ctx.db.patch(r._id, { status: "no_show" });
      noShows += 1;
    }
  }

  // A/R transfer: move just-closed folios that settle to a channel account
  // off the guest ledger and onto the city ledger.
  await transferClosedFoliosToCityLedger(ctx, id, newDate);

  // Issue an invoice for each departed folio (after any A/R transfer, so a
  // city-ledger folio's invoice already shows settled).
  for (const rid of departedNow) {
    const folio = await ctx.db
      .query("folios")
      .withIndex("by_reservation", (q) => q.eq("reservationId", rid))
      .first();
    if (folio) await issueInvoiceForFolio(ctx, folio._id);
  }

  await writeNightStats(ctx, id, oldDate, newDate);

  return { businessDate: newDate, previous: oldDate, noShows };
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
  let noShows = 0;
  while (current < target && days < cap) {
    const r = await rollOne(ctx, id);
    current = r.businessDate;
    noShows += r.noShows;
    days += 1;
  }
  return { from: start, to: current, days, behind: current < target, noShows };
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
    await authorize(ctx, {
      propertyId: args.id,
      requireProperty: "night_auditor",
    });
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
              noShows: res.noShows,
            };
          })();

    const roomsAssigned = property?.autoAssignRooms
      ? (await assignPropertyRooms(ctx, args.id)).assigned
      : 0;

    // Trial balance: were all the nights just closed fully posted to folios?
    const closed = await ctx.db
      .query("daily_stats")
      .withIndex("by_property", (q) =>
        q.eq("propertyId", args.id).gte("date", rolled.from)
      )
      .collect();
    const outOfBalance = closed.filter((s) => s.date < rolled.to && !s.balanced);

    return {
      ...rolled,
      roomsAssigned,
      balanced: outOfBalance.length === 0,
      outOfBalance: outOfBalance.map((s) => ({
        date: s.date,
        variance: s.variance,
      })),
    };
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
