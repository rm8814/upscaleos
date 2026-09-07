import { query } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const TODAY = "2026-09-08";

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
    const rows = await ctx.db
      .query("reservations")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    return joinGuestAndRoom(
      ctx,
      rows.filter((r) => r.checkIn === TODAY)
    );
  },
});
