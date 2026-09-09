import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { authorize, writeAudit } from "./authz";

async function roomHasHistory(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">,
  propertyId: Id<"properties">
): Promise<boolean> {
  const res = await ctx.db
    .query("reservations")
    .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
    .collect();
  if (res.some((r) => r.roomId === roomId)) return true;
  const blocks = await ctx.db
    .query("room_blocks")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();
  return blocks.length > 0;
}

/* -------------------------------------------------- read --------------- */

export const listSetup = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const [rooms, types, reservations, blocks] = await Promise.all([
      ctx.db
        .query("rooms")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("room_types")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("reservations")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("room_blocks")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
    ]);
    const resRooms = new Set(
      reservations.map((r) => r.roomId).filter(Boolean) as string[]
    );
    const blockRooms = new Set(blocks.map((b) => b.roomId as string));
    const numByRoom = new Map(rooms.map((r) => [r._id as string, r.roomNumber]));

    const countByType = new Map<string, number>();
    for (const r of rooms)
      if (r.active !== false)
        countByType.set(r.type, (countByType.get(r.type) ?? 0) + 1);

    return {
      types: [...types]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((t) => ({
          _id: t._id,
          name: t.name,
          baseRate: t.baseRate,
          maxAdults: t.maxAdults,
          maxChildren: t.maxChildren,
          bedConfig: t.bedConfig,
          sizeSqm: t.sizeSqm ?? null,
          sortOrder: t.sortOrder,
          active: t.active,
          rooms: countByType.get(t.name) ?? 0,
        })),
      rooms: [...rooms]
        .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
        .map((r) => ({
          _id: r._id,
          roomNumber: r.roomNumber,
          type: r.type,
          floor: r.floor ?? "",
          status: r.status,
          active: r.active !== false,
          maxAdults: r.maxAdults ?? null,
          maxChildren: r.maxChildren ?? null,
          bedConfig: r.bedConfig ?? "",
          accessible: r.accessible === true,
          view: r.view ?? "None",
          smoking: r.smoking === true,
          connectingRoom: r.connectingRoomId
            ? numByRoom.get(r.connectingRoomId as string) ?? null
            : null,
          connectingRoomId: r.connectingRoomId ?? null,
          notes: r.notes ?? "",
          hasHistory:
            resRooms.has(r._id as string) || blockRooms.has(r._id as string),
        })),
    };
  },
});

/* -------------------------------------------------- room types -------- */

export const upsertRoomType = mutation({
  args: {
    propertyId: v.id("properties"),
    id: v.optional(v.id("room_types")),
    name: v.string(),
    baseRate: v.number(),
    maxAdults: v.number(),
    maxChildren: v.number(),
    bedConfig: v.string(),
    sizeSqm: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "gm",
    });
    const { id, propertyId, ...rest } = args;
    if (id) {
      const prev = await ctx.db.get(id);
      await ctx.db.patch(id, { ...rest, active: args.active ?? true });
      // Rename cascades to the rooms that carry the type as a string.
      if (prev && prev.name !== args.name) {
        const rooms = await ctx.db
          .query("rooms")
          .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
          .collect();
        for (const r of rooms)
          if (r.type === prev.name)
            await ctx.db.patch(r._id, { type: args.name });
      }
      await writeAudit(ctx, scope, "roomtype.update", {
        propertyId,
        target: args.name,
      });
      return id;
    }
    const existing = await ctx.db
      .query("room_types")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect();
    const newId = await ctx.db.insert("room_types", {
      propertyId,
      ...rest,
      sortOrder: existing.length,
      active: args.active ?? true,
    });
    await writeAudit(ctx, scope, "roomtype.create", {
      propertyId,
      target: args.name,
    });
    return newId;
  },
});

/** Rewrite room-type display order from a full ordered id list. */
export const reorderRoomTypes = mutation({
  args: {
    propertyId: v.id("properties"),
    orderedIds: v.array(v.id("room_types")),
  },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "gm",
    });
    for (let i = 0; i < args.orderedIds.length; i++) {
      const t = await ctx.db.get(args.orderedIds[i]);
      if (t && t.propertyId === args.propertyId && t.sortOrder !== i)
        await ctx.db.patch(args.orderedIds[i], { sortOrder: i });
    }
    await writeAudit(ctx, scope, "roomtype.reorder", {
      propertyId: args.propertyId,
      detail: `${args.orderedIds.length} types`,
    });
  },
});

export const setRoomTypeActive = mutation({
  args: { id: v.id("room_types"), active: v.boolean() },
  handler: async (ctx, args) => {
    const t = await ctx.db.get(args.id);
    if (!t) throw new Error("Room type not found");
    const scope = await authorize(ctx, {
      propertyId: t.propertyId,
      requireProperty: "gm",
    });
    await ctx.db.patch(args.id, { active: args.active });
    await writeAudit(ctx, scope, "roomtype.update", {
      propertyId: t.propertyId,
      target: t.name,
      detail: args.active ? "activated" : "deactivated",
    });
  },
});

/* -------------------------------------------------- rooms ------------- */

export const upsertRoom = mutation({
  args: {
    propertyId: v.id("properties"),
    id: v.optional(v.id("rooms")),
    roomNumber: v.string(),
    type: v.string(),
    floor: v.optional(v.string()),
    maxAdults: v.optional(v.number()),
    maxChildren: v.optional(v.number()),
    bedConfig: v.optional(v.string()),
    accessible: v.optional(v.boolean()),
    view: v.optional(v.string()),
    smoking: v.optional(v.boolean()),
    connectingRoomId: v.optional(v.id("rooms")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "gm",
    });
    const { id, propertyId, ...rest } = args;
    if (id) {
      await ctx.db.patch(id, rest);
      await writeAudit(ctx, scope, "room.update", {
        propertyId,
        target: `Room ${args.roomNumber}`,
      });
      return id;
    }
    const dup = (
      await ctx.db
        .query("rooms")
        .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
        .collect()
    ).some((r) => r.roomNumber === args.roomNumber);
    if (dup) throw new Error(`Room ${args.roomNumber} already exists`);
    const newId = await ctx.db.insert("rooms", {
      propertyId,
      roomNumber: args.roomNumber,
      type: args.type,
      status: "Vacant Dirty",
      floor: args.floor,
      active: true,
      maxAdults: args.maxAdults,
      maxChildren: args.maxChildren,
      bedConfig: args.bedConfig,
      accessible: args.accessible,
      view: args.view,
      smoking: args.smoking,
      connectingRoomId: args.connectingRoomId,
      notes: args.notes,
    });
    await writeAudit(ctx, scope, "room.create", {
      propertyId,
      target: `Room ${args.roomNumber}`,
      detail: args.type,
    });
    return newId;
  },
});

export const bulkAddRooms = mutation({
  args: {
    propertyId: v.id("properties"),
    type: v.string(),
    floor: v.string(),
    fromNumber: v.number(),
    toNumber: v.number(),
    pad: v.optional(v.number()), // digits to pad the number to
  },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "gm",
    });
    const lo = Math.min(args.fromNumber, args.toNumber);
    const hi = Math.max(args.fromNumber, args.toNumber);
    if (hi - lo > 200) throw new Error("Range too large (max 200 rooms)");
    const existing = new Set(
      (
        await ctx.db
          .query("rooms")
          .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
          .collect()
      ).map((r) => r.roomNumber)
    );
    const type = await ctx.db
      .query("room_types")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect()
      .then((rows) => rows.find((t) => t.name === args.type));
    const pad = args.pad ?? String(hi).length;
    let created = 0;
    for (let i = lo; i <= hi; i++) {
      const roomNumber = String(i).padStart(pad, "0");
      if (existing.has(roomNumber)) continue;
      await ctx.db.insert("rooms", {
        propertyId: args.propertyId,
        roomNumber,
        type: args.type,
        status: "Vacant Dirty",
        floor: args.floor,
        active: true,
        maxAdults: type?.maxAdults,
        maxChildren: type?.maxChildren,
        bedConfig: type?.bedConfig,
        smoking: false,
      });
      created += 1;
    }
    await writeAudit(ctx, scope, "room.bulk_add", {
      propertyId: args.propertyId,
      target: `${args.floor} · ${args.type}`,
      detail: `${created} rooms`,
    });
    return { created };
  },
});

export const setRoomActive = mutation({
  args: { roomId: v.id("rooms"), active: v.boolean() },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    const scope = await authorize(ctx, {
      propertyId: room.propertyId,
      requireProperty: "gm",
    });
    await ctx.db.patch(args.roomId, { active: args.active });
    await writeAudit(ctx, scope, "room.update", {
      propertyId: room.propertyId,
      target: `Room ${room.roomNumber}`,
      detail: args.active ? "reactivated" : "retired",
    });
  },
});

export const deleteRoom = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    const scope = await authorize(ctx, {
      propertyId: room.propertyId,
      requireProperty: "gm",
    });
    if (await roomHasHistory(ctx, args.roomId, room.propertyId))
      throw new Error(
        `Room ${room.roomNumber} has reservation or maintenance history — retire it instead.`
      );
    await ctx.db.delete(args.roomId);
    await writeAudit(ctx, scope, "room.delete", {
      propertyId: room.propertyId,
      target: `Room ${room.roomNumber}`,
    });
  },
});
