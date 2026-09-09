import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authorize } from "./authz";
import {
  roomCountsByType,
  sellableRoomCount,
  roomsSoldOn,
  occupancyPct,
  RELEASED_STATUSES,
} from "./occupancy";
import { groupHeldRooms } from "./groups";

import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const FALLBACK_TODAY = "2026-09-08";

/** The PMS business date for a property (advances only on night audit). */
async function businessDate(ctx: QueryCtx, propertyId: Id<"properties">) {
  const p = await ctx.db.get(propertyId);
  return p?.businessDate ?? FALLBACK_TODAY;
}

export const getRooms = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    return rooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
  },
});

export const updateRoomStatus = mutation({
  args: { id: v.id("rooms"), status: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.id);
    if (!room) throw new Error("Room not found");
    await authorize(ctx, {
      propertyId: room.propertyId,
      requireProperty: "housekeeping",
    });
    await ctx.db.patch(args.id, { status: args.status, updatedLabel: "just now" });
  },
});

export const getMaintenanceTickets = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("maintenance_tickets")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    return rows.sort((a, b) => (a.created < b.created ? 1 : -1));
  },
});

export const createTicket = mutation({
  args: {
    propertyId: v.id("properties"),
    title: v.string(),
    location: v.string(),
    priority: v.string(),
    assignee: v.string(),
  },
  handler: async (ctx, args) => {
    await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "maintenance",
    });
    const count = (
      await ctx.db
        .query("maintenance_tickets")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect()
    ).length;
    return await ctx.db.insert("maintenance_tickets", {
      ...args,
      status: "Open",
      created: await businessDate(ctx, args.propertyId),
      oooLinked: false,
      cost: "0",
      slaText: "3d left",
      ticketCode: `MT-${1043 + count}`,
    });
  },
});

/**
 * Rooms that are bookable for the whole span [checkIn, checkOut): not
 * OOO/OOS and with no overlapping live reservation. Optionally filtered
 * to one room type.
 */
export const getAvailability = query({
  args: {
    propertyId: v.id("properties"),
    checkIn: v.string(),
    checkOut: v.string(),
    roomType: v.optional(v.string()),
    ignoreReservationId: v.optional(v.id("reservations")),
  },
  handler: async (ctx, args) => {
    const [rooms, reservations] = await Promise.all([
      ctx.db
        .query("rooms")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("reservations")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
    ]);
    const taken = new Set(
      reservations
        .filter(
          (r) =>
            r._id !== args.ignoreReservationId &&
            !RELEASED_STATUSES.has(r.status) &&
            r.checkIn < args.checkOut &&
            r.checkOut > args.checkIn
        )
        .map((r) => r.roomId)
    );
    const free = rooms
      .filter(
        (r) =>
          r.status !== "OOO" &&
          r.status !== "OOS" &&
          !taken.has(r._id) &&
          (!args.roomType || r.type === args.roomType)
      )
      .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));

    // Trim rooms held by group blocks (unpicked, cut-off ahead) for the
    // arrival night — group holds aren't pinned to specific rooms.
    const refDate = await businessDate(ctx, args.propertyId);
    const byType = new Map<string, number>();
    for (const r of free) byType.set(r.type, (byType.get(r.type) ?? 0) + 1);
    const dropByType = new Map<string, number>();
    for (const type of byType.keys()) {
      dropByType.set(
        type,
        await groupHeldRooms(ctx, args.propertyId, type, args.checkIn, refDate)
      );
    }
    const result = free.filter((r) => {
      const left = dropByType.get(r.type) ?? 0;
      if (left > 0) {
        dropByType.set(r.type, left - 1);
        return false;
      }
      return true;
    });

    return result.map((r) => ({
      _id: r._id,
      roomNumber: r.roomNumber,
      type: r.type,
    }));
  },
});

export const getRoomStatusSummary = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const order = [
      "Inspected",
      "Vacant Clean",
      "Occupied",
      "Vacant Dirty",
      "OOO",
      "OOS",
    ];
    return order.map((status) => ({
      status,
      count: rooms.filter((r) => r.status === status).length,
    }));
  },
});

/** Physical + sellable room counts per room type — for the rate grid. */
export const getRoomCounts = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const { total, sellable } = roomCountsByType(rooms);
    return [...total.keys()].map((type) => ({
      roomType: type,
      total: total.get(type) ?? 0,
      sellable: sellable.get(type) ?? 0,
    }));
  },
});

export const getDashboardStats = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const today = await businessDate(ctx, args.propertyId);
    const [rooms, reservations, tickets] = await Promise.all([
      ctx.db
        .query("rooms")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("reservations")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("maintenance_tickets")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
    ]);

    // Occupancy: rooms sold tonight (reservations holding a room) ÷ sellable
    // rooms. `inHouse` is the separate "physically here right now" count.
    const sellable = sellableRoomCount(rooms);
    const occupied = roomsSoldOn(reservations, today).length;
    const inHouse = reservations.filter((r) => r.status === "inhouse").length;

    return {
      roomsTotal: rooms.length,
      sellable,
      occupied,
      occupancyPct: occupancyPct(occupied, sellable),
      dirty: rooms.filter((r) => r.status === "Vacant Dirty").length,
      ooo: rooms.filter((r) => r.status === "OOO").length,
      arrivalsToday: reservations.filter((r) => r.checkIn === today).length,
      departuresToday: reservations.filter((r) => r.checkOut === today).length,
      inHouse,
      openTickets: tickets.filter((t) => t.status !== "Resolved").length,
      businessDate: today,
    };
  },
});
