import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getCorporateAgreements = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("corporate_agreements")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
  },
});

export const getAgreementProduction = query({
  args: { agreementId: v.id("corporate_agreements") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("corporate_production")
      .withIndex("by_agreement", (q) => q.eq("agreementId", args.agreementId))
      .first();
  },
});

export const applyRateSuggestion = mutation({
  args: { agreementId: v.id("corporate_agreements"), newRate: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agreementId, { rate: args.newRate });
    return { success: true };
  },
});

export const getRevenueMetrics = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    return {
      adr: "Rp 2.35M",
      revpar: "Rp 1.9M",
      avgLeadTime: "14 Days",
      marketShare: "24%",
    };
  },
});

export const getRateSuggestions = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    return [
      { date: "Sep 10", currentRate: "Rp 2.2M", suggestedRate: "Rp 2.8M", delta: "+Rp 600k", confidence: "94%", reason: "High demand forecast due to Java Jazz Festival", demand: "High" },
      { date: "Sep 11", currentRate: "Rp 2.2M", suggestedRate: "Rp 2.5M", delta: "+Rp 300k", confidence: "88%", reason: "Mid-week corporate peak", demand: "Medium" },
      { date: "Sep 12", currentRate: "Rp 2.2M", suggestedRate: "Rp 2.1M", delta: "-Rp 100k", confidence: "72%", reason: "Low organic demand detected", demand: "Low" },
      { date: "Sep 13", currentRate: "Rp 2.5M", suggestedRate: "Rp 3.2M", delta: "+Rp 700k", confidence: "91%", reason: "Weekend peak + wedding block", demand: "High" },
    ];
  },
});
