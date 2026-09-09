import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { assignPropertyRooms, findOrCreateGuest } from "./reservations";
import { quoteStay } from "./rates";
import { authorize } from "./authz";

const addDaysIso = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const fmtRp = (n: number) => `Rp ${Math.round(n).toLocaleString("en-US")}`;

const ROOM_TYPES = [
  "Deluxe Twin",
  "Double Queen",
  "King Suite",
  "Presidential Suite",
];

interface IngestArgs {
  propertyId: Id<"properties">;
  channel: string;
  externalRef: string;
  guestName: string;
  email?: string;
  phone?: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  adults?: number;
  children?: number;
}

/**
 * Shared ingest body. Idempotent on `externalRef`. Creates the reservation
 * unassigned, then runs the property-wide auto-assign sweep if the property
 * has that setting on (so channel bookings get roomed without anyone opening
 * the New Reservation form).
 */
async function ingestOne(ctx: MutationCtx, args: IngestArgs) {
  const existing = await ctx.db
    .query("reservations")
    .withIndex("by_external_ref", (q) => q.eq("externalRef", args.externalRef))
    .first();
  if (existing) {
    return { created: false as const, reservationId: existing._id, roomsAssigned: 0 };
  }

  const guestId = await findOrCreateGuest(
    ctx,
    args.guestName,
    args.email,
    args.phone
  );
  const q = await quoteStay(ctx, {
    propertyId: args.propertyId,
    roomType: args.roomType,
    checkIn: args.checkIn,
    checkOut: args.checkOut,
  });
  const reservationId = await ctx.db.insert("reservations", {
    guestId,
    propertyId: args.propertyId,
    checkIn: args.checkIn,
    checkOut: args.checkOut,
    status: "confirmed",
    rate: fmtRp(q.nights[0]?.rate ?? 0),
    totalAmount: fmtRp(q.total),
    channel: args.channel,
    roomType: args.roomType,
    adults: args.adults ?? 2,
    children: args.children ?? 0,
    externalRef: args.externalRef,
  });

  const property = await ctx.db.get(args.propertyId);
  let roomsAssigned = 0;
  if (property?.autoAssignRooms) {
    ({ assigned: roomsAssigned } = await assignPropertyRooms(
      ctx,
      args.propertyId
    ));
  }
  return { created: true as const, reservationId, roomsAssigned };
}

/** Take one booking from a channel / OTA push and turn it into a reservation. */
export const ingestChannelBooking = mutation({
  args: {
    propertyId: v.id("properties"),
    channel: v.string(),
    externalRef: v.string(),
    guestName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    checkIn: v.string(),
    checkOut: v.string(),
    roomType: v.string(),
    adults: v.optional(v.number()),
    children: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "front_office",
    });
    return ingestOne(ctx, args);
  },
});

const FIRST = [
  "Liam", "Noah", "Ava", "Mia", "Lucas", "Chloe", "Ethan", "Aria",
  "Kai", "Zoe", "Arjun", "Priya", "Hiro", "Yuna", "Diego", "Elena",
];
const LAST = [
  "Walker", "Nguyen", "Silva", "Adams", "Okafor", "Meyer", "Rossi",
  "Haddad", "Larsen", "Costa", "Kumar", "Tan", "Park", "Novak",
];
const fakeName = (n: number) =>
  `${FIRST[n % FIRST.length]} ${LAST[(n * 7 + 3) % LAST.length]}`;

/**
 * Simulate "pull bookings now" for a channel: fabricate a few plausible new
 * bookings and ingest each. Returns how many landed and how many the sweep
 * could room.
 */
export const pullBookings = mutation({
  args: {
    propertyId: v.id("properties"),
    channel: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "front_office",
    });
    const property = await ctx.db.get(args.propertyId);
    const anchor = property?.businessDate ?? "2026-09-08";
    const n = Math.min(Math.max(args.count ?? 2, 1), 5);
    const stamp = Date.now().toString(36).toUpperCase().slice(-5);
    const seed = stamp.charCodeAt(0) + stamp.charCodeAt(1);

    let created = 0;
    let roomsAssigned = 0;
    for (let i = 0; i < n; i++) {
      const lead = 2 + ((i * 5 + seed) % 21);
      const nights = 1 + (i % 4);
      const checkIn = addDaysIso(anchor, lead);
      const result = await ingestOne(ctx, {
        propertyId: args.propertyId,
        channel: args.channel,
        externalRef: `${args.channel.slice(0, 3).toUpperCase()}-${stamp}-${i}`,
        guestName: fakeName(i + seed),
        checkIn,
        checkOut: addDaysIso(checkIn, nights),
        roomType: ROOM_TYPES[(i + seed) % ROOM_TYPES.length],
      });
      if (result.created) created += 1;
      roomsAssigned += result.roomsAssigned;
    }
    return { created, roomsAssigned, channel: args.channel };
  },
});

/** Recent channel-ingested reservations (have an externalRef), newest first. */
export const recentIngests = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("reservations")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const ingested = rows
      .filter((r) => r.externalRef)
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 20);
    return Promise.all(
      ingested.map(async (r) => {
        const guest = await ctx.db.get(r.guestId);
        return {
          _id: r._id,
          externalRef: r.externalRef ?? "",
          channel: r.channel ?? "—",
          guestName: guest?.name ?? "Guest",
          roomType: r.roomType ?? "—",
          roomNumber: r.roomNumber ?? null,
          assigned: !!r.roomId,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          status: r.status,
        };
      })
    );
  },
});
