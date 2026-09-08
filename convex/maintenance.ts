import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { authorize } from "./authz";

export const resolveTicket = mutation({
  args: { id: v.id("maintenance_tickets"), notes: v.string() },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.id);
    if (!ticket) throw new Error("Ticket not found");
    await authorize(ctx, {
      propertyId: ticket.propertyId,
      requireProperty: "maintenance",
    });
    await ctx.db.patch(args.id, {
      status: "Resolved",
      // In a real app, we'd store the notes in a separate table or a field
    });
    return { success: true };
  },
});
