import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { authorize, writeAudit } from "./authz";

export const resolveTicket = mutation({
  args: { id: v.id("maintenance_tickets"), notes: v.string() },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.id);
    if (!ticket || !ticket.propertyId) throw new Error("Ticket not found");
    const propertyId = ticket.propertyId;
    const scope = await authorize(ctx, {
      propertyId,
      requireProperty: "maintenance",
    });
    await ctx.db.patch(args.id, { status: "Resolved" });

    // Clear any room block this ticket put in place; the room returns for
    // housekeeping inspection.
    const blocks = await ctx.db
      .query("room_blocks")
      .withIndex("by_ticket", (q) => q.eq("ticketId", args.id))
      .collect();
    const property = await ctx.db.get(propertyId);
    const bd = property?.businessDate ?? ticket.created;
    for (const b of blocks) {
      if (b.clearedOn) continue;
      await ctx.db.patch(b._id, { clearedOn: bd });
      const room = await ctx.db.get(b.roomId);
      if (room && (room.status === "OOO" || room.status === "OOS")) {
        await ctx.db.patch(b.roomId, {
          status: "Vacant Dirty",
          updatedLabel: "just now",
        });
      }
    }

    await writeAudit(ctx, scope, "maintenance.resolve", {
      propertyId,
      target: ticket.title,
      detail: blocks.length ? "room released" : undefined,
    });
    return { success: true };
  },
});
