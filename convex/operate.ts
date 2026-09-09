import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authorize, writeAudit } from "./authz";
import {
  roomCountsByType,
  sellableRoomCount,
  roomsSoldOn,
  occupancyPct,
  RELEASED_STATUSES,
  ARRIVAL_STATUSES,
  blockedRoomIds,
} from "./occupancy";
import { groupHeldRooms } from "./groups";
import { loadBaseRates } from "./rates";
import { addDaysIso } from "./rateModel";

import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function propertyBlocks(ctx: QueryCtx, propertyId: Id<"properties">) {
  return ctx.db
    .query("room_blocks")
    .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
    .collect();
}

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

/**
 * Night-audit hook: a room whose only blocks have expired (their `to` date
 * passed) comes back for housekeeping inspection.
 */
export async function expireRoomBlocks(
  ctx: MutationCtx,
  propertyId: Id<"properties">,
  refDate: string
): Promise<number> {
  const blocks = await ctx.db
    .query("room_blocks")
    .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
    .collect();
  const byRoom = new Map<string, typeof blocks>();
  for (const b of blocks) {
    if (b.clearedOn) continue;
    const list = byRoom.get(b.roomId) ?? [];
    list.push(b);
    byRoom.set(b.roomId, list);
  }
  let restored = 0;
  for (const [roomId, list] of byRoom) {
    const stillBlocked = list.some(
      (b) => b.from <= refDate && (b.to === "" || refDate < b.to)
    );
    if (stillBlocked) continue;
    const room = await ctx.db.get(roomId as Id<"rooms">);
    if (room && (room.status === "OOO" || room.status === "OOS")) {
      await ctx.db.patch(room._id, {
        status: "Vacant Dirty",
        updatedLabel: "just now",
      });
      restored += 1;
    }
  }
  return restored;
}

/** Scheduled OOO/OOS blocks for a property, with room + linked ticket. */
export const getRoomBlocks = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const [blocks, rooms] = await Promise.all([
      propertyBlocks(ctx, args.propertyId),
      ctx.db
        .query("rooms")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
    ]);
    const roomOf = new Map(rooms.map((r) => [r._id, r]));
    const today = await businessDate(ctx, args.propertyId);
    return blocks
      .filter((b) => !b.clearedOn)
      .map((b) => ({
        _id: b._id,
        roomNumber: roomOf.get(b.roomId)?.roomNumber ?? "—",
        roomType: roomOf.get(b.roomId)?.type ?? "—",
        kind: b.kind,
        from: b.from,
        to: b.to,
        reason: b.reason,
        ticketId: b.ticketId ?? null,
        active: b.from <= today && (b.to === "" || today < b.to),
      }))
      .sort((a, b) => a.from.localeCompare(b.from));
  },
});

/** Put a room out of order / service for a date range with a reason. */
export const setRoomOutOfService = mutation({
  args: {
    roomId: v.id("rooms"),
    kind: v.string(), // 'OOO' | 'OOS'
    from: v.string(),
    to: v.optional(v.string()),
    reason: v.string(),
    ticketId: v.optional(v.id("maintenance_tickets")),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    const scope = await authorize(ctx, {
      propertyId: room.propertyId,
      requireProperty: "maintenance",
    });
    const kind = args.kind === "OOS" ? "OOS" : "OOO";
    const blockId = await ctx.db.insert("room_blocks", {
      propertyId: room.propertyId,
      roomId: args.roomId,
      kind,
      from: args.from,
      // OOO is open-ended — the room is out until maintenance releases it.
      to: kind === "OOO" ? "" : args.to ?? "",
      reason: args.reason,
      ticketId: args.ticketId,
      createdBy: scope.email,
    });
    const today = await businessDate(ctx, room.propertyId);
    if (args.from <= today) {
      await ctx.db.patch(args.roomId, { status: kind, updatedLabel: "just now" });
    }
    await writeAudit(ctx, scope, "room.block", {
      propertyId: room.propertyId,
      target: `Room ${room.roomNumber}`,
      detail: `${kind} ${args.from}${args.to ? `→${args.to}` : ""} · ${args.reason}`,
    });
    return blockId;
  },
});

/** End a room block early / on completion; room returns for inspection. */
export const clearRoomBlock = mutation({
  args: { blockId: v.id("room_blocks") },
  handler: async (ctx, args) => {
    const block = await ctx.db.get(args.blockId);
    if (!block || block.clearedOn) return;
    const scope = await authorize(ctx, {
      propertyId: block.propertyId,
      requireProperty: "maintenance",
    });
    const today = await businessDate(ctx, block.propertyId);
    await ctx.db.patch(args.blockId, { clearedOn: today });
    const room = await ctx.db.get(block.roomId);
    if (room && (room.status === "OOO" || room.status === "OOS")) {
      await ctx.db.patch(block.roomId, {
        status: "Vacant Dirty",
        updatedLabel: "just now",
      });
    }
    await writeAudit(ctx, scope, "room.unblock", {
      propertyId: block.propertyId,
      target: `Room ${room?.roomNumber ?? "?"}`,
      detail: block.reason,
    });
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
    // Optionally take the named room out of order until the ticket is resolved.
    blockRoomId: v.optional(v.id("rooms")),
  },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "maintenance",
    });
    const { blockRoomId, ...ticketArgs } = args;
    const count = (
      await ctx.db
        .query("maintenance_tickets")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect()
    ).length;
    const today = await businessDate(ctx, args.propertyId);
    const ticketId = await ctx.db.insert("maintenance_tickets", {
      ...ticketArgs,
      status: "Open",
      created: today,
      oooLinked: !!blockRoomId,
      cost: "0",
      slaText: "3d left",
      ticketCode: `MT-${1043 + count}`,
    });

    if (blockRoomId) {
      const room = await ctx.db.get(blockRoomId);
      if (room) {
        await ctx.db.insert("room_blocks", {
          propertyId: args.propertyId,
          roomId: blockRoomId,
          kind: "OOO",
          from: today,
          to: "",
          reason: args.title,
          ticketId,
          createdBy: scope.email,
        });
        await ctx.db.patch(blockRoomId, {
          status: "OOO",
          updatedLabel: "just now",
        });
      }
    }
    await writeAudit(ctx, scope, "maintenance.ticket", {
      propertyId: args.propertyId,
      target: args.title,
      detail: `${args.priority}${blockRoomId ? " · room blocked" : ""}`,
    });
    return ticketId;
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
    const [rooms, reservations, blocks] = await Promise.all([
      ctx.db
        .query("rooms")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("reservations")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      propertyBlocks(ctx, args.propertyId),
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
    // A room is out if it's OOO/OOS now or blocked on any night of the stay.
    const oos = new Set<string>();
    for (let d = args.checkIn; d < args.checkOut; ) {
      for (const id of blockedRoomIds(blocks, d)) oos.add(id);
      const nd = new Date(d + "T00:00:00Z");
      nd.setUTCDate(nd.getUTCDate() + 1);
      d = nd.toISOString().slice(0, 10);
    }
    const free = rooms
      .filter(
        (r) =>
          r.active !== false &&
          r.status !== "OOO" &&
          r.status !== "OOS" &&
          !oos.has(r._id) &&
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

    const { types } = await loadBaseRates(ctx, args.propertyId);
    const rank = (t: string) => {
      const i = types.indexOf(t);
      return i === -1 ? 999 : i;
    };
    return result
      .sort(
        (a, b) =>
          rank(a.type) - rank(b.type) ||
          a.roomNumber.localeCompare(b.roomNumber)
      )
      .map((r) => ({
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
    const { types } = await loadBaseRates(ctx, args.propertyId);
    const rank = (t: string) => {
      const i = types.indexOf(t);
      return i === -1 ? 999 : i;
    };
    return [...total.keys()]
      .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
      .map((type) => ({
        roomType: type,
        total: total.get(type) ?? 0,
        sellable: sellable.get(type) ?? 0,
      }));
  },
});

const money = (n: number) => `Rp ${Math.round(n).toLocaleString("en-US")}`;

const ACTIVITY_VERB: Record<string, string> = {
  "reservation.create": "New reservation",
  "reservation.status": "Reservation",
  "reservation.dates": "Reservation dates changed",
  "reservation.corporate": "Corporate link",
  "reservation.rate_plan": "Rate plan",
  "folio.payment": "Payment posted",
  "folio.charge": "Charge posted",
  "folio.void": "Folio line voided",
  "ar.payment": "A/R payment",
  "invoice.issue": "Invoice issued",
  "invoice.void": "Invoice voided",
  "invoice.credit_note": "Credit note",
  "rate.dynamic": "Dynamic pricing",
  "rate.manual": "Manual rate",
  "rate.plan": "Rate plan",
  "channel.terms": "Channel terms",
  "maintenance.ticket": "Maintenance ticket",
  "maintenance.resolve": "Maintenance resolved",
  "room.block": "Room blocked",
};

/**
 * Everything the dashboard shows beyond the KPI tiles, from live data:
 * channel mix, revenue by source, 14-day occupancy outlook, average length
 * of stay, the activity feed (audit log) and a derived task list.
 */
export const getDashboardBoard = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const today = await businessDate(ctx, args.propertyId);
    const [rooms, reservations, lines, audit, groups] = await Promise.all([
      ctx.db
        .query("rooms")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("reservations")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("folio_lines")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("audit_log")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("group_blocks")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
    ]);

    const sellable = sellableRoomCount(rooms);
    const live = reservations.filter((r) => !RELEASED_STATUSES.has(r.status));

    // ---- channel mix: room-nights over the next 30 stay dates ----
    const chan = new Map<string, number>();
    let chanTotal = 0;
    for (let i = 0; i < 30; i++) {
      const d = addDaysIso(today, i);
      for (const r of live) {
        if (r.checkIn <= d && r.checkOut > d && r.roomId) {
          const c = r.channel ?? "Direct";
          chan.set(c, (chan.get(c) ?? 0) + 1);
          chanTotal += 1;
        }
      }
    }
    const channelMix = [...chan.entries()]
      .map(([name, n]) => ({
        name,
        pct: chanTotal ? Math.round((n / chanTotal) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct);

    // ---- revenue by source: posted folio lines, trailing 30 days ----
    const since = addDaysIso(today, -30);
    const bucket = { Rooms: 0, "F&B": 0, Other: 0 };
    for (const l of lines) {
      if (l.voided || l.amount <= 0 || l.date < since) continue;
      if (l.kind === "room" || l.kind === "tax") bucket.Rooms += l.amount;
      else if (l.kind === "fnb") bucket["F&B"] += l.amount;
      else if (l.kind !== "payment") bucket.Other += l.amount;
    }
    const revTotal = bucket.Rooms + bucket["F&B"] + bucket.Other;
    const revenueSources = (
      Object.entries(bucket) as [keyof typeof bucket, number][]
    ).map(([label, amount]) => ({
      label,
      amount: money(amount),
      pct: revTotal ? Math.round((amount / revTotal) * 100) : 0,
    }));

    // ---- occupancy outlook: today + the next 14 days ----
    //   Forward-looking, so it counts every booking on the books for the
    //   night (same basis as the reports pace tab) — a confirmed stay
    //   without a room assigned yet still fills a room.
    const outlook = Array.from({ length: 15 }, (_, i) => {
      const d = addDaysIso(today, i);
      const onBooks = live.filter(
        (r) => r.checkIn <= d && r.checkOut > d
      ).length;
      return {
        date: d,
        dow: new Date(d + "T00:00:00Z").getUTCDay(),
        dom: Number(d.slice(8, 10)),
        isToday: i === 0,
        occPct: occupancyPct(onBooks, sellable),
      };
    });

    // ---- average length of stay (current + future stays) ----
    const losRes = live.filter((r) => r.checkOut > today);
    const losNights = losRes.reduce(
      (s, r) =>
        s +
        Math.max(
          1,
          Math.round(
            (Date.parse(r.checkOut + "T00:00:00Z") -
              Date.parse(r.checkIn + "T00:00:00Z")) /
              86400000
          )
        ),
      0
    );
    const avgLos = losRes.length ? losNights / losRes.length : 0;

    // ---- activity feed from the audit log ----
    const activity = [...audit]
      .sort((a, b) => b.at - a.at)
      .slice(0, 7)
      .map((a) => ({
        at: a.at,
        atLabel: new Date(a.at).toISOString().slice(11, 16),
        text: [
          ACTIVITY_VERB[a.action] ?? a.action,
          a.target ? ` — ${a.target}` : "",
          a.detail ? ` (${a.detail})` : "",
        ]
          .join("")
          .trim(),
      }));

    // ---- derived task list ----
    const dirty = rooms.filter((r) => r.status === "Vacant Dirty").length;
    const ooo = rooms.filter(
      (r) => r.status === "OOO" || r.status === "OOS"
    ).length;
    const unassignedArrivals = reservations.filter(
      (r) =>
        r.checkIn === today && !r.roomId && ARRIVAL_STATUSES.has(r.status)
    ).length;
    const tentativeGroups = groups.filter(
      (g) => g.status === "Tentative" || g.status === "tentative"
    ).length;
    const openDeposits = reservations.filter(
      (r) => r.status === "confirmed" && r.checkIn === today
    ).length;

    // ---- per-block group tasks: cut-off, unsigned contract, deposit ----
    const groupSubs = await ctx.db.query("group_subblocks").collect();
    const daysTo = (d: string) =>
      Math.round(
        (Date.parse(d + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) /
          86400000
      );
    const groupTasks: string[] = [];
    for (const gb of groups) {
      if (gb.status === "cancelled" || gb.released === true) continue;
      const blocked = groupSubs
        .filter((s) => s.groupId === gb._id)
        .reduce((s, x) => s + x.blocked, 0);
      const picked = reservations.filter(
        (r) => r.groupId === gb._id && !RELEASED_STATUSES.has(r.status)
      ).length;
      const co = daysTo(gb.cutoffDate);
      if (co >= 0 && co <= 5 && picked < blocked) {
        groupTasks.push(
          `${gb.name}: cut-off ${co === 0 ? "today" : `in ${co}d`} — ${picked}/${blocked} picked, release or extend`
        );
      } else if (
        gb.contractLabel === "Awaiting signature" &&
        co >= 0 &&
        co <= 21
      ) {
        groupTasks.push(
          `${gb.name}: contract unsigned, cut-off in ${co}d`
        );
      }
      if (gb.depositStatus === "Not received" && daysTo(gb.startDate) <= 30) {
        groupTasks.push(`${gb.name}: deposit not received`);
      }
    }

    const tasks = [
      unassignedArrivals > 0 &&
        `Assign rooms to ${unassignedArrivals} arrival${
          unassignedArrivals > 1 ? "s" : ""
        } due today`,
      dirty > 0 &&
        `${dirty} vacant-dirty room${dirty > 1 ? "s" : ""} to clean before 3 PM cut-off`,
      ...groupTasks.slice(0, 3),
      tentativeGroups > 0 &&
        groupTasks.length === 0 &&
        `Confirm ${tentativeGroups} tentative group block${
          tentativeGroups > 1 ? "s" : ""
        }`,
      ooo > 0 && `Follow up on ${ooo} out-of-order room${ooo > 1 ? "s" : ""}`,
      openDeposits > 0 &&
        `Take deposit / check in ${openDeposits} confirmed arrival${
          openDeposits > 1 ? "s" : ""
        }`,
      `Sign off tonight's night audit`,
    ].filter(Boolean) as string[];

    return {
      businessDate: today,
      channelMix,
      revenueSources,
      revenueTotal: money(revTotal),
      outlook,
      avgLos: Math.round(avgLos * 10) / 10,
      activity,
      tasks,
    };
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
      arrivalsToday: reservations.filter(
        (r) => r.checkIn === today && ARRIVAL_STATUSES.has(r.status)
      ).length,
      departuresToday: reservations.filter(
        (r) => r.checkOut === today && r.status === "inhouse"
      ).length,
      inHouse,
      openTickets: tickets.filter((t) => t.status !== "Resolved").length,
      businessDate: today,
    };
  },
});
