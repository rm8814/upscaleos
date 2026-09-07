import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const TODAY = "2026-09-08"; // prototype "today"

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
    const count = (
      await ctx.db
        .query("maintenance_tickets")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect()
    ).length;
    return await ctx.db.insert("maintenance_tickets", {
      ...args,
      status: "Open",
      created: TODAY,
      oooLinked: false,
      cost: "0",
      slaText: "3d left",
      ticketCode: `MT-${1043 + count}`,
    });
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

export const getDashboardStats = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
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

    const sellable = rooms.filter((r) => r.status !== "OOO" && r.status !== "OOS").length;
    const occupied = rooms.filter((r) => r.status === "Occupied").length;
    const inHouse = reservations.filter((r) => r.status === "inhouse").length;

    return {
      roomsTotal: rooms.length,
      sellable,
      occupied,
      occupancyPct: sellable ? Math.round((occupied / sellable) * 100) : 0,
      dirty: rooms.filter((r) => r.status === "Vacant Dirty").length,
      ooo: rooms.filter((r) => r.status === "OOO").length,
      arrivalsToday: reservations.filter((r) => r.checkIn === TODAY).length,
      departuresToday: reservations.filter((r) => r.checkOut === TODAY).length,
      inHouse,
      openTickets: tickets.filter((t) => t.status !== "Resolved").length,
    };
  },
});
