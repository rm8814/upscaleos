import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const resolveTicket = mutation({
  args: { id: v.id("maintenance_tickets"), notes: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "Resolved",
      // In a real app, we'd store the notes in a separate table or a field
    });
    return { success: true };
  },
});
