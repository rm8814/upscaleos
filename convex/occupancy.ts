import type { Doc } from "./_generated/dataModel";

/**
 * ONE occupancy definition for the whole app.
 *
 *   available rooms  = physical rooms that aren't OOO / OOS
 *   rooms sold       = reservations that hold a room and aren't cancelled,
 *                      overlapping the night in question (a guest who has since
 *                      departed still occupied the room that night)
 *   occupancy %      = sold / available
 *
 * Dashboard, KPI tiles, daily_stats and the rate grid all go through here.
 */

const OUT_OF_SERVICE = new Set(["OOO", "OOS"]);

/** A room in inventory: not retired in Room setup. */
export function activeRoom(r: Doc<"rooms">): boolean {
  return r.active !== false;
}

/** Statuses where a reservation no longer holds / needs a room. */
export const RELEASED_STATUSES = new Set([
  "cancelled",
  "departed",
  "no_show",
]);
/** Room statuses a same-day arrival can actually move into. */
export const READY_ROOM_STATUSES = new Set(["Inspected", "Vacant Clean"]);

export function sellableRoom(r: Doc<"rooms">): boolean {
  return activeRoom(r) && !OUT_OF_SERVICE.has(r.status);
}

/** A room_block covers `date` (from inclusive, to exclusive; '' to = open). */
export function blockCovers(b: Doc<"room_blocks">, date: string): boolean {
  if (b.clearedOn) return false;
  return b.from <= date && (b.to === "" || date < b.to);
}

/** roomIds that are out of order/service on `date` per active room_blocks. */
export function blockedRoomIds(
  blocks: Doc<"room_blocks">[],
  date: string
): Set<string> {
  return new Set(
    blocks.filter((b) => blockCovers(b, date)).map((b) => b.roomId)
  );
}

export function sellableRoomCount(rooms: Doc<"rooms">[]): number {
  return rooms.filter(sellableRoom).length;
}

/** Physical + sellable room counts per room type. */
export function roomCountsByType(rooms: Doc<"rooms">[]): {
  total: Map<string, number>;
  sellable: Map<string, number>;
} {
  const total = new Map<string, number>();
  const sellable = new Map<string, number>();
  for (const r of rooms) {
    total.set(r.type, (total.get(r.type) ?? 0) + 1);
    if (sellableRoom(r))
      sellable.set(r.type, (sellable.get(r.type) ?? 0) + 1);
  }
  return { total, sellable };
}

/** Reservations occupying a billable room on `date` (optionally one type). */
export function roomsSoldOn(
  reservations: Doc<"reservations">[],
  date: string,
  roomType?: string
): Doc<"reservations">[] {
  return reservations.filter(
    (r) =>
      r.status !== "cancelled" &&
      r.status !== "no_show" &&
      !!r.roomId &&
      (!roomType || r.roomType === roomType) &&
      r.checkIn <= date &&
      r.checkOut > date
  );
}

export function occupancyPct(sold: number, available: number): number {
  return available > 0 ? Math.round((sold / available) * 100) : 0;
}
