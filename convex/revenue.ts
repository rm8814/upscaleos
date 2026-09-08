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
      adr: "Rp 2,350,000",
      revpar: "Rp 1,900,000",
      avgLeadTime: "14 Days",
      marketShare: "24%",
    };
  },
});

export const getRateSuggestions = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    return [
      { date: "Sep 10", currentRate: "Rp 2,200,000", suggestedRate: "Rp 2,800,000", delta: "+Rp 600,000", confidence: "94%", reason: "High demand forecast due to Java Jazz Festival", demand: "High" },
      { date: "Sep 11", currentRate: "Rp 2,200,000", suggestedRate: "Rp 2,500,000", delta: "+Rp 300,000", confidence: "88%", reason: "Mid-week corporate peak", demand: "Medium" },
      { date: "Sep 12", currentRate: "Rp 2,200,000", suggestedRate: "Rp 2,100,000", delta: "-Rp 100,000", confidence: "72%", reason: "Low organic demand detected", demand: "Low" },
      { date: "Sep 13", currentRate: "Rp 2,500,000", suggestedRate: "Rp 3,200,000", delta: "+Rp 700,000", confidence: "91%", reason: "Weekend peak + wedding block", demand: "High" },
    ];
  },
});
