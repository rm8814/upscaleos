import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { assignPropertyRooms, findOrCreateGuest } from "./reservations";
import { quoteStay } from "./rates";
import { authorize } from "./authz";
import { createTransientCore, appendPartyRooms } from "./groups";

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

/** Strip a trailing "-01" / "-2" room suffix, returning the parent ref. */
function parentRefOf(ref: string): { parent: string; suffixed: boolean } {
  const m = ref.match(/^(.*?)[-_](\d{1,3})$/);
  return m ? { parent: m[1], suffixed: true } : { parent: ref, suffixed: false };
}

/**
 * OTA / channel-manager booking, single- or multi-room. Handles both OTA
 * shapes:
 *   Booking.com  — one `externalRef`, several `rooms`
 *   Agoda/Expedia — parent ref + per-room suffix ("ABC-01", "ABC-02"),
 *                   pushed one room at a time; each call appends to the
 *                   same transient group.
 * Idempotent: a repeat of the same parent ref (single room) or exact room
 * ref is a no-op.
 */
type IngestBookingArgs = {
  propertyId: Id<"properties">;
  channel: string;
  externalRef: string;
  guestName: string;
  email?: string;
  phone?: string;
  checkIn: string;
  checkOut: string;
  rooms: {
    roomType: string;
    adults?: number;
    children?: number;
    roomExternalRef?: string;
  }[];
};

async function ingestBookingImpl(ctx: MutationCtx, args: IngestBookingArgs) {
  {
    const { parent, suffixed } = parentRefOf(args.externalRef);

    // Already have a transient group for this parent ref? Append the rooms.
    const existingGroup = await ctx.db
      .query("group_blocks")
      .withIndex("by_external_ref", (q) => q.eq("externalRef", parent))
      .first();
    if (existingGroup) {
      // Idempotency: skip rooms whose exact suffix ref already exists.
      const have = new Set(
        (
          await ctx.db
            .query("reservations")
            .withIndex("by_group", (q) => q.eq("groupId", existingGroup._id))
            .collect()
        ).map((r) => r.externalRef)
      );
      const fresh = args.rooms.filter(
        (r) => !r.roomExternalRef || !have.has(r.roomExternalRef)
      );
      if (fresh.length === 0)
        return { created: false as const, appended: 0, groupId: existingGroup._id };
      const guest = await findOrCreateGuest(
        ctx,
        args.guestName,
        args.email,
        args.phone
      );
      const ids = await appendPartyRooms(ctx, existingGroup, guest, fresh, {
        channel: args.channel,
        status: "confirmed",
        refBase: parent,
      });
      await ctx.db.patch(existingGroup._id, {
        name: `${args.guestName} · ${have.size + ids.length} rooms`,
      });
      return { created: false as const, appended: ids.length, groupId: existingGroup._id };
    }

    // Single-room, no suffix — a plain reservation (idempotent on the ref).
    if (args.rooms.length === 1 && !suffixed) {
      return ingestOne(ctx, {
        propertyId: args.propertyId,
        channel: args.channel,
        externalRef: args.externalRef,
        guestName: args.guestName,
        email: args.email,
        phone: args.phone,
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        roomType: args.rooms[0].roomType,
        adults: args.rooms[0].adults,
        children: args.rooms[0].children,
      });
    }

    // Multi-room (or first push of a suffixed booking) — new transient group.
    const groupId = await createTransientCore(ctx, {
      propertyId: args.propertyId,
      guestName: args.guestName,
      email: args.email,
      phone: args.phone,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      channel: args.channel,
      status: "confirmed",
      externalRef: parent,
      rooms: args.rooms.map((r) => ({
        roomType: r.roomType,
        roomExternalRef: r.roomExternalRef,
      })),
    });
    const property = await ctx.db.get(args.propertyId);
    let roomsAssigned = 0;
    if (property?.autoAssignRooms)
      ({ assigned: roomsAssigned } = await assignPropertyRooms(
        ctx,
        args.propertyId
      ));
    return { created: true as const, appended: args.rooms.length, groupId, roomsAssigned };
  }
}

export const ingestBooking = mutation({
  args: {
    propertyId: v.id("properties"),
    channel: v.string(),
    externalRef: v.string(),
    guestName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    checkIn: v.string(),
    checkOut: v.string(),
    rooms: v.array(
      v.object({
        roomType: v.string(),
        adults: v.optional(v.number()),
        children: v.optional(v.number()),
        roomExternalRef: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "front_office",
    });
    return ingestBookingImpl(ctx, args);
  },
});

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
      const stayNights = 1 + (i % 4);
      const checkIn = addDaysIso(anchor, lead);
      const checkOut = addDaysIso(checkIn, stayNights);
      const ref = `${args.channel.slice(0, 3).toUpperCase()}-${stamp}-${i}`;
      // every third fabricated booking is a 2–3 room party
      const roomCount = i % 3 === 2 ? 2 + (i % 2) : 1;
      const res = await ingestBookingImpl(ctx, {
        propertyId: args.propertyId,
        channel: args.channel,
        externalRef: ref,
        guestName: fakeName(i + seed),
        checkIn,
        checkOut,
        rooms: Array.from({ length: roomCount }, (_, k) => ({
          roomType: ROOM_TYPES[(i + seed + k) % ROOM_TYPES.length],
        })),
      });
      if (res.created) created += 1;
      if ("roomsAssigned" in res && res.roomsAssigned)
        roomsAssigned += res.roomsAssigned;
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
