import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const FALLBACK_TODAY = "2026-09-08";

async function businessDate(ctx: QueryCtx, propertyId: Id<"properties">) {
  const p = await ctx.db.get(propertyId);
  return p?.businessDate ?? FALLBACK_TODAY;
}

const NIGHTLY: Record<string, number> = {
  "Deluxe Twin": 1_450_000,
  "Double Queen": 1_850_000,
  "King Suite": 2_600_000,
  "Presidential Suite": 6_900_000,
};
const fmtRp = (n: number) => `Rp ${Math.round(n).toLocaleString("en-US")}`;
const nights = (a: string, b: string) =>
  Math.max(
    1,
    Math.round(
      (new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) /
        86400000
    )
  );

/**
 * First bookable room of `roomType` at this property with no stay overlapping
 * [checkIn, checkOut). `ignoreId` lets a reservation exclude its own row when
 * re-checking. Returns undefined when the type is fully booked / out of order.
 */
async function pickFreeRoom(
  ctx: MutationCtx,
  propertyId: Id<"properties">,
  roomType: string,
  checkIn: string,
  checkOut: string,
  ignoreId?: Id<"reservations">
): Promise<Id<"rooms"> | undefined> {
  const [rooms, existing] = await Promise.all([
    ctx.db
      .query("rooms")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect(),
    ctx.db
      .query("reservations")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect(),
  ]);
  const taken = new Set(
    existing
      .filter(
        (r) =>
          r._id !== ignoreId &&
          r.status !== "cancelled" &&
          r.status !== "departed" &&
          r.checkIn < checkOut &&
          r.checkOut > checkIn
      )
      .map((r) => r.roomId)
  );
  const free = rooms.find(
    (rm) =>
      rm.type === roomType &&
      rm.status !== "OOO" &&
      rm.status !== "OOS" &&
      !taken.has(rm._id)
  );
  return free?._id;
}

/**
 * Assign a room to every unassigned, still-relevant reservation at a property
 * where one is available. Earliest arrivals get first pick. This is what makes
 * the property-wide "auto-assign" setting cover bookings that never touched the
 * New Reservation form — OTA / channel-manager pushes, API imports, etc.
 */
async function assignPropertyRooms(ctx: MutationCtx, propertyId: Id<"properties">) {
  const today = await businessDate(ctx, propertyId);
  const rows = await ctx.db
    .query("reservations")
    .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
    .collect();

  const pending = rows
    .filter(
      (r) =>
        !r.roomId &&
        r.checkOut > today &&
        r.status !== "cancelled" &&
        r.status !== "departed"
    )
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  let assigned = 0;
  for (const r of pending) {
    const type = r.roomType ?? "";
    const roomId = await pickFreeRoom(
      ctx,
      propertyId,
      type,
      r.checkIn,
      r.checkOut,
      r._id
    );
    if (!roomId) continue;
    const room = await ctx.db.get(roomId);
    await ctx.db.patch(r._id, {
      roomId,
      roomNumber: room?.roomNumber,
      roomType: room?.type ?? r.roomType,
    });
    assigned += 1;
  }
  return { assigned, remaining: pending.length - assigned };
}

async function joinGuestAndRoom(ctx: QueryCtx, rows: Doc<"reservations">[]) {
  return Promise.all(
    rows.map(async (r) => {
      const guest = await ctx.db.get(r.guestId);
      let roomNumber = r.roomNumber;
      let roomType = r.roomType;
      if ((!roomNumber || !roomType) && r.roomId) {
        const room = await ctx.db.get(r.roomId);
        roomNumber = roomNumber ?? room?.roomNumber ?? undefined;
        roomType = roomType ?? room?.type ?? undefined;
      }
      return {
        ...r,
        guestName: guest?.name ?? "Unknown guest",
        guestTier: guest?.loyaltyTier ?? "Silver",
        roomNumber: roomNumber ?? "—",
        roomType: roomType ?? "—",
      };
    })
  );
}

export const getByProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("reservations")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    return joinGuestAndRoom(ctx, rows);
  },
});

export const getArrivalsToday = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const today = await businessDate(ctx, args.propertyId);
    const rows = await ctx.db
      .query("reservations")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    return joinGuestAndRoom(
      ctx,
      rows.filter((r) => r.checkIn === today)
    );
  },
});

/* --------------------------------------------------------------- mutations */

async function findOrCreateGuest(
  ctx: MutationCtx,
  name: string,
  email?: string,
  phone?: string
): Promise<Id<"guests">> {
  const guests = await ctx.db.query("guests").collect();
  const match = guests.find(
    (g) =>
      (email && g.email.toLowerCase() === email.toLowerCase()) ||
      g.name.toLowerCase() === name.toLowerCase()
  );
  if (match) return match._id;
  return ctx.db.insert("guests", {
    name,
    email: email || `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@guest.upscale.id`,
    phone: phone || "—",
    loyaltyTier: "Silver",
  });
}

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    guestName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    checkIn: v.string(),
    checkOut: v.string(),
    roomId: v.optional(v.id("rooms")),
    roomType: v.string(),
    channel: v.string(),
    status: v.string(),
    adults: v.optional(v.number()),
    children: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const guestId = await findOrCreateGuest(ctx, args.guestName, args.email, args.phone);

    let roomId = args.roomId;

    // Auto-assign: no room chosen and the property has the setting switched on.
    if (!roomId) {
      const property = await ctx.db.get(args.propertyId);
      if (property?.autoAssignRooms) {
        roomId = await pickFreeRoom(
          ctx,
          args.propertyId,
          args.roomType,
          args.checkIn,
          args.checkOut
        );
      }
    }

    let roomNumber: string | undefined;
    if (roomId) {
      const room = await ctx.db.get(roomId);
      roomNumber = room?.roomNumber;
    }
    const rate = NIGHTLY[args.roomType] ?? 1_850_000;
    const n = nights(args.checkIn, args.checkOut);
    return await ctx.db.insert("reservations", {
      guestId,
      propertyId: args.propertyId,
      roomId,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      status: args.status,
      rate: fmtRp(rate),
      totalAmount: fmtRp(rate * n),
      channel: args.channel,
      roomNumber,
      roomType: args.roomType,
      adults: args.adults ?? 2,
      children: args.children ?? 0,
    });
  },
});

export const updateDates = mutation({
  args: {
    id: v.id("reservations"),
    checkIn: v.string(),
    checkOut: v.string(),
    roomId: v.optional(v.id("rooms")),
  },
  handler: async (ctx, args) => {
    const res = await ctx.db.get(args.id);
    if (!res) return;
    const rate =
      NIGHTLY[res.roomType ?? ""] ??
      (Number(res.rate.replace(/[^\d]/g, "")) || 1_850_000);
    const patch: Record<string, unknown> = {
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      totalAmount: fmtRp(rate * nights(args.checkIn, args.checkOut)),
    };
    if (args.roomId) {
      patch.roomId = args.roomId;
      const room = await ctx.db.get(args.roomId);
      if (room) {
        patch.roomNumber = room.roomNumber;
        patch.roomType = room.type;
      }
    }
    await ctx.db.patch(args.id, patch);
  },
});

export const setStatus = mutation({
  args: { id: v.id("reservations"), status: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

/** Manual trigger for the property-wide sweep (button on the reservation list). */
export const assignRooms = mutation({
  args: { propertyId: v.id("properties") },
  handler: (ctx, args) => assignPropertyRooms(ctx, args.propertyId),
});

/**
 * Cron entry point: sweep every property that has auto-assign switched on, so
 * OTA / channel-manager reservations that land without a room get one without
 * anyone opening the booking.
 */
export const autoAssignSweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const properties = await ctx.db.query("properties").collect();
    const assignedBy: Record<string, number> = {};
    for (const p of properties) {
      if (!p.autoAssignRooms) continue;
      const { assigned } = await assignPropertyRooms(ctx, p._id);
      if (assigned) assignedBy[p.name] = assigned;
    }
    return assignedBy;
  },
});
