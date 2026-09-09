import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  openFolioForReservation,
  closeFolio,
  reopenFolio,
  reverseFolioCharges,
  reconcileFolioToStay,
} from "./folios";
import { authorize, writeAudit } from "./authz";
import { issueInvoiceForFolio } from "./invoices";
import { quoteStay, assertPlanEligible } from "./rates";
import { RELEASED_STATUSES, READY_ROOM_STATUSES } from "./occupancy";
import { groupHeldRooms } from "./groups";

const FALLBACK_TODAY = "2026-09-08";

async function businessDate(ctx: QueryCtx, propertyId: Id<"properties">) {
  const p = await ctx.db.get(propertyId);
  return p?.businessDate ?? FALLBACK_TODAY;
}

const fmtRp = (n: number) => `Rp ${Math.round(n).toLocaleString("en-US")}`;
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
  ignoreId?: Id<"reservations">,
  forGroupId?: Id<"group_blocks">
): Promise<Id<"rooms"> | undefined> {
  const bd = await businessDate(ctx, propertyId);
  const sameDay = checkIn <= bd; // arrives today or is overdue
  const [rooms, existing, blocks] = await Promise.all([
    ctx.db
      .query("rooms")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect(),
    ctx.db
      .query("reservations")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect(),
    ctx.db
      .query("room_blocks")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect(),
  ]);
  const taken = new Set(
    existing
      .filter(
        (r) =>
          r._id !== ignoreId &&
          !RELEASED_STATUSES.has(r.status) &&
          r.checkIn < checkOut &&
          r.checkOut > checkIn
      )
      .map((r) => r.roomId)
  );
  // Rooms blocked (OOO/OOS) on any night of the stay.
  const blocked = new Set<string>();
  for (let d = checkIn; d < checkOut; ) {
    for (const b of blocks) {
      if (!b.clearedOn && b.from <= d && (b.to === "" || d < b.to)) {
        blocked.add(b.roomId);
      }
    }
    const nd = new Date(d + "T00:00:00Z");
    nd.setUTCDate(nd.getUTCDate() + 1);
    d = nd.toISOString().slice(0, 10);
  }
  const candidates = rooms.filter((rm) => {
    if (rm.type !== roomType || taken.has(rm._id) || blocked.has(rm._id))
      return false;
    if (rm.active === false) return false; // retired in Room setup
    if (rm.status === "OOO" || rm.status === "OOS") return false;
    // A same-day arrival needs a room that is actually clean and ready; a
    // future arrival can be given one that will be cleaned before check-in.
    if (sameDay) return READY_ROOM_STATUSES.has(rm.status);
    return rm.status !== "Occupied";
  });

  // Don't take a room another group is holding (this reservation's own group
  // hold is excluded — it's picking up its block).
  const held = await groupHeldRooms(
    ctx,
    propertyId,
    roomType,
    checkIn,
    bd,
    forGroupId
  );
  if (candidates.length <= held) return undefined;
  return candidates[0]._id;
}

/**
 * Assign a room to every unassigned, still-relevant reservation at a property
 * where one is available. Earliest arrivals get first pick. This is what makes
 * the property-wide "auto-assign" setting cover bookings that never touched the
 * New Reservation form — OTA / channel-manager pushes, API imports, etc.
 */
export async function assignPropertyRooms(
  ctx: MutationCtx,
  propertyId: Id<"properties">
) {
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
        !RELEASED_STATUSES.has(r.status)
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
      r._id,
      r.groupId
    );
    if (!roomId) continue;
    const room = await ctx.db.get(roomId);
    await ctx.db.patch(r._id, {
      roomId,
      roomNumber: room?.roomNumber,
      roomType: room?.type ?? r.roomType,
      roomAutoAssigned: true,
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
      rows.filter(
        (r) => r.checkIn === today && !RELEASED_STATUSES.has(r.status)
      )
    );
  },
});

/* --------------------------------------------------------------- mutations */

export async function findOrCreateGuest(
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
    corporateAgreementId: v.optional(v.id("corporate_agreements")),
    ratePlanId: v.optional(v.id("rate_plans")),
  },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "front_office",
    });
    // A corporate rate plan carries its own agreement link.
    const plan = args.ratePlanId ? await ctx.db.get(args.ratePlanId) : null;
    if (plan) {
      const bd = await businessDate(ctx, args.propertyId);
      assertPlanEligible(plan, args.checkIn, args.checkOut, bd);
    }
    const agreementId = args.corporateAgreementId ?? plan?.agreementId;
    const guestId = await findOrCreateGuest(ctx, args.guestName, args.email, args.phone);

    let roomId = args.roomId;
    let roomAutoAssigned = false;

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
        roomAutoAssigned = !!roomId;
      }
    }

    let roomNumber: string | undefined;
    if (roomId) {
      const room = await ctx.db.get(roomId);
      roomNumber = room?.roomNumber;
    }
    // Estimate via the single pricing path (rules + tax). The folio remains
    // the source of truth for what's actually owed; this is a cached estimate.
    const q = await quoteStay(ctx, {
      propertyId: args.propertyId,
      roomType: args.roomType,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      corporateAgreementId: agreementId,
      ratePlanId: args.ratePlanId,
    });
    const id = await ctx.db.insert("reservations", {
      guestId,
      propertyId: args.propertyId,
      roomId,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      status: args.status,
      rate: fmtRp(q.nights[0]?.rate ?? 0),
      totalAmount: fmtRp(q.total),
      channel: args.channel,
      roomNumber,
      roomType: args.roomType,
      adults: args.adults ?? 2,
      children: args.children ?? 0,
      roomAutoAssigned,
      corporateAccountId: agreementId,
      ratePlanId: args.ratePlanId,
    });
    await writeAudit(ctx, scope, "reservation.create", {
      propertyId: args.propertyId,
      target: args.guestName,
      detail: `${args.roomType} · ${args.checkIn}→${args.checkOut} · ${args.channel}`,
    });
    return id;
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
    const scope = await authorize(ctx, {
      propertyId: res.propertyId,
      requireProperty: "front_office",
    });

    const patch: Record<string, unknown> = {
      checkIn: args.checkIn,
      checkOut: args.checkOut,
    };

    // Moved to a different room — take that room's number and type.
    let effectiveType = res.roomType ?? "";
    if (args.roomId) {
      patch.roomId = args.roomId;
      patch.roomAutoAssigned = false; // a person picked this room
      const room = await ctx.db.get(args.roomId);
      if (room) {
        patch.roomNumber = room.roomNumber;
        patch.roomType = room.type;
        effectiveType = room.type;
      }
    }

    // Refuse a move that would double-book: the target room (new one, or the
    // one it already holds) must be free for every night of the new stay —
    // no other live reservation, no dated OOO/OOS block.
    const targetRoomId = args.roomId ?? res.roomId;
    if (targetRoomId) {
      const targetRoom = await ctx.db.get(targetRoomId);
      if (targetRoom && (targetRoom.status === "OOO" || targetRoom.status === "OOS")) {
        throw new Error(
          `Room ${targetRoom.roomNumber} is ${targetRoom.status} — not sellable.`
        );
      }
      const [siblings, blocks] = await Promise.all([
        ctx.db
          .query("reservations")
          .withIndex("by_property", (q) => q.eq("propertyId", res.propertyId))
          .collect(),
        ctx.db
          .query("room_blocks")
          .withIndex("by_room", (q) => q.eq("roomId", targetRoomId))
          .collect(),
      ]);
      const clash = siblings.find(
        (o) =>
          o._id !== res._id &&
          o.roomId === targetRoomId &&
          !RELEASED_STATUSES.has(o.status) &&
          o.checkIn < args.checkOut &&
          o.checkOut > args.checkIn
      );
      if (clash) {
        const room = await ctx.db.get(targetRoomId);
        throw new Error(
          `Room ${room?.roomNumber ?? ""} is already booked ${clash.checkIn} → ${clash.checkOut}.`
        );
      }
      const blocked = blocks.find(
        (b) =>
          !b.clearedOn &&
          b.from < args.checkOut &&
          (b.to === "" || b.to > args.checkIn)
      );
      if (blocked) {
        const room = await ctx.db.get(targetRoomId);
        throw new Error(
          `Room ${room?.roomNumber ?? ""} is ${blocked.kind} (${blocked.reason}) over those dates.`
        );
      }
    }

    // Re-price the cached estimate against the (possibly new) room type and
    // dates via the single pricing path.
    const q = await quoteStay(ctx, {
      propertyId: res.propertyId,
      roomType: effectiveType,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      corporateAgreementId: res.corporateAccountId,
      ratePlanId: res.ratePlanId,
    });
    patch.rate = fmtRp(q.nights[0]?.rate ?? 0);
    patch.totalAmount = fmtRp(q.total);

    await ctx.db.patch(args.id, patch);

    // Keep an open folio in step with the new dates / room type: void nights
    // that fell out of the stay, post nights that fell in.
    const typeChanged = effectiveType !== (res.roomType ?? "");
    const datesChanged =
      args.checkIn !== res.checkIn || args.checkOut !== res.checkOut;
    if (typeChanged || datesChanged) {
      const bd = await businessDate(ctx, res.propertyId);
      await reconcileFolioToStay(ctx, args.id, bd, {
        repriceExisting: typeChanged,
      });
    }
    if (typeChanged || datesChanged) {
      await writeAudit(ctx, scope, "reservation.dates", {
        propertyId: res.propertyId,
        target: (await ctx.db.get(res.guestId))?.name,
        detail: `${res.checkIn}→${res.checkOut} ⇒ ${args.checkIn}→${args.checkOut}${
          typeChanged ? ` · ${res.roomType}→${effectiveType}` : ""
        }`,
      });
    }
  },
});

export const setStatus = mutation({
  args: { id: v.id("reservations"), status: v.string() },
  handler: async (ctx, args) => {
    const res = await ctx.db.get(args.id);
    if (!res) return;
    const scope = await authorize(ctx, {
      propertyId: res.propertyId,
      requireProperty: "front_office",
    });
    const prev = res.status;
    const next = args.status;
    if (prev === next) return;

    await ctx.db.patch(args.id, { status: next });

    const bd = await businessDate(ctx, res.propertyId);
    const setRoom = async (roomStatus: string) => {
      if (res.roomId)
        await ctx.db.patch(res.roomId, {
          status: roomStatus,
          updatedLabel: "just now",
        });
    };

    // Check in: occupy the room and open the folio.
    if (next === "inhouse" && prev !== "inhouse") {
      await setRoom("Occupied");
      await openFolioForReservation(ctx, { ...res, status: next }, bd);
    }
    // Check out: release the room to housekeeping and close the folio.
    else if (next === "departed" && prev === "inhouse") {
      await setRoom("Vacant Dirty");
      await closeFolio(ctx, args.id, bd);
      const folio = await ctx.db
        .query("folios")
        .withIndex("by_reservation", (q) => q.eq("reservationId", args.id))
        .first();
      if (folio) await issueInvoiceForFolio(ctx, folio._id);
    }
    // Undo check-in: room back to clean, reverse the folio charges (kept, not
    // deleted; a taken payment leaves a credit balance to refund).
    else if (prev === "inhouse" && next === "confirmed") {
      await setRoom("Vacant Clean");
      await reverseFolioCharges(ctx, args.id, bd);
    }
    // Undo check-out.
    else if (prev === "departed" && next === "inhouse") {
      await setRoom("Occupied");
      await reopenFolio(ctx, args.id);
    }
    // Cancellation / reinstating a no-show back to confirmed: reverse the folio
    // if one exists.
    else if (next === "cancelled") {
      await reverseFolioCharges(ctx, args.id, bd);
    }

    const verb =
      next === "inhouse" && prev !== "inhouse"
        ? "check-in"
        : next === "departed" && prev === "inhouse"
          ? "check-out"
          : `${prev}→${next}`;
    await writeAudit(ctx, scope, "reservation.status", {
      propertyId: res.propertyId,
      target: (await ctx.db.get(res.guestId))?.name,
      detail: verb,
    });
  },
});

/** Link / unlink a reservation to a corporate agreement (negotiated rate). */
export const setCorporate = mutation({
  args: {
    id: v.id("reservations"),
    corporateAgreementId: v.optional(v.id("corporate_agreements")),
  },
  handler: async (ctx, args) => {
    const res = await ctx.db.get(args.id);
    if (!res) throw new Error("Reservation not found");
    const scope = await authorize(ctx, {
      propertyId: res.propertyId,
      requireProperty: "front_office",
    });
    await ctx.db.patch(args.id, {
      corporateAccountId: args.corporateAgreementId,
    });
    // Re-price the estimate and any open folio at the new (negotiated) rate.
    const q = await quoteStay(ctx, {
      propertyId: res.propertyId,
      roomType: res.roomType ?? "",
      checkIn: res.checkIn,
      checkOut: res.checkOut,
      corporateAgreementId: args.corporateAgreementId,
    });
    await ctx.db.patch(args.id, {
      rate: fmtRp(q.nights[0]?.rate ?? 0),
      totalAmount: fmtRp(q.total),
    });
    const bd = await businessDate(ctx, res.propertyId);
    await reconcileFolioToStay(ctx, args.id, bd, { repriceExisting: true });

    const agreement = args.corporateAgreementId
      ? await ctx.db.get(args.corporateAgreementId)
      : null;
    await writeAudit(ctx, scope, "reservation.corporate", {
      propertyId: res.propertyId,
      target: (await ctx.db.get(res.guestId))?.name,
      detail: agreement ? `linked ${agreement.accountName}` : "unlinked",
    });
  },
});

/** Put a reservation on a rate plan (or clear it back to BAR). */
export const setRatePlan = mutation({
  args: {
    id: v.id("reservations"),
    ratePlanId: v.optional(v.id("rate_plans")),
  },
  handler: async (ctx, args) => {
    const res = await ctx.db.get(args.id);
    if (!res) throw new Error("Reservation not found");
    const scope = await authorize(ctx, {
      propertyId: res.propertyId,
      requireProperty: "front_office",
    });
    const plan = args.ratePlanId ? await ctx.db.get(args.ratePlanId) : null;
    if (plan) {
      const bd = await businessDate(ctx, res.propertyId);
      assertPlanEligible(plan, res.checkIn, res.checkOut, bd);
    }
    // A corporate plan re-points the reservation's agreement link too; a
    // non-corporate plan leaves any manual corporate link untouched.
    const agreementId =
      plan && plan.kind === "corporate"
        ? plan.agreementId
        : res.corporateAccountId;
    await ctx.db.patch(args.id, {
      ratePlanId: args.ratePlanId,
      corporateAccountId: agreementId,
    });
    const q = await quoteStay(ctx, {
      propertyId: res.propertyId,
      roomType: res.roomType ?? "",
      checkIn: res.checkIn,
      checkOut: res.checkOut,
      corporateAgreementId: agreementId,
      ratePlanId: args.ratePlanId,
    });
    await ctx.db.patch(args.id, {
      rate: fmtRp(q.nights[0]?.rate ?? 0),
      totalAmount: fmtRp(q.total),
    });
    const bd = await businessDate(ctx, res.propertyId);
    await reconcileFolioToStay(ctx, args.id, bd, { repriceExisting: true });

    await writeAudit(ctx, scope, "reservation.rate_plan", {
      propertyId: res.propertyId,
      target: (await ctx.db.get(res.guestId))?.name,
      detail: plan ? `${plan.code} — ${plan.name}` : "BAR (cleared)",
    });
  },
});

/** Manual trigger for the property-wide sweep (button on the reservation list). */
export const assignRooms = mutation({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "front_office",
    });
    return assignPropertyRooms(ctx, args.propertyId);
  },
});

/** Auto-assign a room to one reservation (calendar "Unassigned bookings" row). */
export const assignOne = mutation({
  args: { id: v.id("reservations") },
  handler: async (ctx, args) => {
    const res = await ctx.db.get(args.id);
    if (!res) return { assigned: false as const };
    await authorize(ctx, {
      propertyId: res.propertyId,
      requireProperty: "front_office",
    });
    if (res.roomId) return { assigned: true as const, roomNumber: res.roomNumber };
    const roomId = await pickFreeRoom(
      ctx,
      res.propertyId,
      res.roomType ?? "",
      res.checkIn,
      res.checkOut,
      res._id,
      res.groupId
    );
    if (!roomId) return { assigned: false as const };
    const room = await ctx.db.get(roomId);
    await ctx.db.patch(args.id, {
      roomId,
      roomNumber: room?.roomNumber,
      roomType: room?.type ?? res.roomType,
      roomAutoAssigned: true,
    });
    return { assigned: true as const, roomNumber: room?.roomNumber };
  },
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
