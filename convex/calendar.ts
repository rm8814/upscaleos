import { query } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { addDaysIso } from "./rateModel";
import {
  RELEASED_STATUSES,
  sellableRoomCount,
  roomCountsByType,
  occupancyPct,
} from "./occupancy";
import { buildRateGrid } from "./rates";

async function businessDate(ctx: QueryCtx, propertyId: Id<"properties">) {
  const p = await ctx.db.get(propertyId);
  return p?.businessDate ?? "2026-09-08";
}

/** A reservation is "on the books" for a night if it holds inventory — sold,
 *  whether or not a physical room has been assigned yet. */
function onBooksOn(r: Doc<"reservations">, date: string) {
  return (
    !RELEASED_STATUSES.has(r.status) &&
    r.checkIn <= date &&
    r.checkOut > date
  );
}

/**
 * Everything the tape chart needs for a [from, to] window, in one query:
 * rooms, assigned reservations, sold-but-unassigned reservations, the rate
 * grid (rack / dynamic / manual), dated room blocks, group-held rooms, and
 * occupancy per day + per room type on the single occupancy basis.
 */
export const getCalendarBoard = query({
  args: {
    propertyId: v.id("properties"),
    from: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const bd = await businessDate(ctx, args.propertyId);
    const [rooms, resRows, blockRows, groupBlocks] = await Promise.all([
      ctx.db
        .query("rooms")
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
      ctx.db
        .query("group_blocks")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
    ]);

    const days: string[] = [];
    for (let d = args.from; d <= args.to; d = addDaysIso(d, 1)) days.push(d);

    // ---- guest / room join (mirrors reservations.getByProperty) ----
    const guestCache = new Map<string, Doc<"guests"> | null>();
    const getGuest = async (id: Id<"guests">) => {
      const k = id as string;
      if (!guestCache.has(k)) guestCache.set(k, await ctx.db.get(id));
      return guestCache.get(k) ?? null;
    };
    const roomById = new Map(rooms.map((r) => [r._id as string, r]));
    const hydrate = async (r: Doc<"reservations">) => {
      const guest = await getGuest(r.guestId);
      const room = r.roomId ? roomById.get(r.roomId as string) : undefined;
      return {
        ...r,
        guestName: guest?.name ?? "Unknown guest",
        guestTier: guest?.loyaltyTier ?? "Silver",
        roomNumber: r.roomNumber ?? room?.roomNumber ?? "—",
        roomType: r.roomType ?? room?.type ?? "—",
      };
    };

    const inWindow = (r: Doc<"reservations">) =>
      r.checkIn <= args.to && r.checkOut > args.from;

    const assigned = await Promise.all(
      resRows
        .filter(
          (r) => r.roomId && r.status !== "cancelled" && inWindow(r)
        )
        .map(hydrate)
    );

    // ---- sold, not yet assigned a room number ----
    const unassigned = await Promise.all(
      resRows
        .filter(
          (r) =>
            !r.roomId &&
            !RELEASED_STATUSES.has(r.status) &&
            r.checkOut > bd &&
            r.checkIn <= args.to
        )
        .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
        .map(hydrate)
    );

    // ---- rate grid (shared with the rates screen) ----
    const rateGrid = (
      await buildRateGrid(ctx, args.propertyId, args.from, args.to)
    ).filter((c) => c.date >= args.from && c.date <= args.to);

    // ---- dated room blocks overlapping the window ----
    const blocks = blockRows
      .filter(
        (b) =>
          !b.clearedOn &&
          b.from <= args.to &&
          (b.to === "" || b.to > args.from)
      )
      .map((b) => ({
        _id: b._id,
        roomId: b.roomId,
        from: b.from,
        to: b.to,
        kind: b.kind,
        reason: b.reason,
        ticketId: b.ticketId ?? null,
      }));

    // ---- group-held (blocked but not yet picked) rooms, per type per day ----
    const subblocks = (
      await Promise.all(
        groupBlocks.map((g) =>
          ctx.db
            .query("group_subblocks")
            .withIndex("by_group", (q) => q.eq("groupId", g._id))
            .collect()
        )
      )
    ).flat();
    const groupRes = resRows.filter((r) => r.groupId);
    const groupHolds: Record<string, Record<string, number>> = {};
    for (const g of groupBlocks) {
      const active =
        g.status !== "cancelled" && g.released !== true && g.cutoffDate >= bd;
      if (!active) continue;
      const gWindowEnd = addDaysIso(g.startDate, g.nights);
      for (const sub of subblocks.filter((s) => s.groupId === g._id)) {
        for (const date of days) {
          if (date < g.startDate || date >= gWindowEnd) continue;
          const picked = groupRes.filter(
            (r) =>
              r.groupId === g._id &&
              r.status !== "cancelled" &&
              r.roomType === sub.roomType &&
              r.checkIn <= date &&
              r.checkOut > date
          ).length;
          const held = Math.max(0, sub.blocked - picked);
          if (held <= 0) continue;
          (groupHolds[sub.roomType] ??= {})[date] =
            (groupHolds[sub.roomType]?.[date] ?? 0) + held;
        }
      }
    }

    // ---- occupancy: one basis (sellable rooms; every on-the-books stay) ----
    const sellableTotal = sellableRoomCount(rooms);
    const { sellable: sellableByType } = roomCountsByType(rooms);
    const roomTypes = [...sellableByType.keys()];

    const occByDay = days.map((date) => {
      const sold = resRows.filter((r) => onBooksOn(r, date)).length;
      const unassignedSold = resRows.filter(
        (r) => !r.roomId && onBooksOn(r, date)
      ).length;
      return {
        date,
        sold,
        unassignedSold,
        sellable: sellableTotal,
        occPct: occupancyPct(sold, sellableTotal),
      };
    });

    const typeOcc: Record<
      string,
      { date: string; sold: number; sellable: number; occPct: number }[]
    > = {};
    for (const t of roomTypes) {
      const cap = sellableByType.get(t) ?? 0;
      typeOcc[t] = days.map((date) => {
        const sold = resRows.filter(
          (r) => (r.roomType ?? "") === t && onBooksOn(r, date)
        ).length;
        return { date, sold, sellable: cap, occPct: occupancyPct(sold, cap) };
      });
    }

    return {
      businessDate: bd,
      from: args.from,
      to: args.to,
      days,
      rooms: rooms
        .map((r) => ({
          _id: r._id,
          roomNumber: r.roomNumber,
          type: r.type,
          floor: r.floor ?? "—",
          status: r.status,
        }))
        .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber)),
      reservations: assigned,
      unassigned,
      rateGrid,
      blocks,
      groupHolds,
      occByDay,
      typeOcc,
    };
  },
});
