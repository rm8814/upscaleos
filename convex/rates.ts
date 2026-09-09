import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import { authorize, writeAudit } from "./authz";

/** "Rp 1,800,000" -> 1800000; 0 when unparseable. */
export const parseRp = (s: string | undefined) =>
  Number((s ?? "").replace(/[^\d]/g, "")) || 0;
import {
  ROOM_TYPES,
  BASE_RATE,
  DEFAULT_BASE,
  nightlyRateForBase,
  addDaysIso,
  money,
} from "./rateModel";
import { roomNightTaxes } from "./taxEngine";

const DYNAMIC_PCT = 0.06; // the grid's dynamic-pricing toggle uplift

type Ctx = QueryCtx | MutationCtx;
export type RateSource = "rack" | "dynamic" | "manual";

/**
 * Per-type base rate for a property, from the room_types table. Falls back to
 * the code table (rateModel.BASE_RATE) for any type without a row — so a
 * fresh install still prices before Room setup is used.
 */
export async function loadBaseRates(
  ctx: Ctx,
  propertyId: Id<"properties">
): Promise<{
  base: (roomType: string) => number;
  rack: (roomType: string, iso: string) => number;
  types: string[];
}> {
  const rows = await ctx.db
    .query("room_types")
    .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
    .collect();
  const byName = new Map(rows.map((r) => [r.name, r.baseRate]));
  const base = (roomType: string) =>
    byName.get(roomType) ?? BASE_RATE[roomType] ?? DEFAULT_BASE;
  return {
    base,
    rack: (roomType: string, iso: string) =>
      nightlyRateForBase(base(roomType), iso),
    types: rows.length
      ? [...rows]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((r) => r.name)
      : [...ROOM_TYPES],
  };
}

/* -------------------------------------------------- rate resolution ------ */

/**
 * Resolve one (roomType, date) against the property's rate rules, given the
 * rack rate:
 *   dynamic-pricing day  -> rack × (1 + pct)   (wins; the grid locks the cell)
 *   manual override      -> the typed amount
 *   otherwise            -> rack
 */
export async function applyRateRules(
  ctx: Ctx,
  propertyId: Id<"properties">,
  roomType: string,
  date: string,
  rack: number
): Promise<number> {
  const adj = await ctx.db
    .query("rate_adjustments")
    .withIndex("by_property_date", (q) =>
      q.eq("propertyId", propertyId).eq("date", date)
    )
    .first();
  if (adj) return Math.round(rack * (1 + adj.pct));

  const override = (
    await ctx.db
      .query("rate_overrides")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect()
  ).find((o) => o.roomType === roomType && o.date === date);
  return override ? override.amount : rack;
}

/**
 * THE nightly rate any part of the app should use for a booked / bookable
 * night: rack rate with the property's dynamic / manual rules applied.
 */
export async function effectiveNightlyRate(
  ctx: Ctx,
  propertyId: Id<"properties">,
  roomType: string,
  date: string
): Promise<number> {
  const { rack } = await loadBaseRates(ctx, propertyId);
  return applyRateRules(ctx, propertyId, roomType, date, rack(roomType, date));
}

/**
 * Apply a rate plan's modifier to the engine (rack + rules) price.
 *   flat         -> the plan's own nightly amount
 *   percent_off  -> engine × (1 − percent)
 *   amount_off   -> engine − amount (never below 0)
 *   engine       -> engine, unless a linked agreement carries a flat rate
 */
export function resolvePlanRate(
  plan: Doc<"rate_plans"> | null | undefined,
  engineRate: number,
  agreementRate: number
): number {
  if (!plan) return engineRate;
  switch (plan.pricing) {
    case "flat":
      return plan.amount && plan.amount > 0 ? plan.amount : engineRate;
    case "percent_off":
      return plan.percent
        ? Math.round(engineRate * (1 - plan.percent))
        : engineRate;
    case "amount_off":
      return plan.amount ? Math.max(0, engineRate - plan.amount) : engineRate;
    default:
      return agreementRate > 0 ? agreementRate : engineRate;
  }
}

const nightsBetween = (checkIn: string, checkOut: string) =>
  Math.max(
    0,
    Math.round(
      (Date.parse(checkOut + "T00:00:00Z") -
        Date.parse(checkIn + "T00:00:00Z")) /
        86400000
    )
  );

/**
 * Guard a rate plan's booking conditions. Throws a guest-readable error when
 * the stay doesn't qualify — call before putting a reservation on the plan.
 */
export function assertPlanEligible(
  plan: Doc<"rate_plans">,
  checkIn: string,
  checkOut: string,
  businessDate: string
) {
  if (!plan.active) {
    throw new Error(`Rate plan ${plan.code} is not open for sale.`);
  }
  const los = nightsBetween(checkIn, checkOut);
  if (plan.minLos && los < plan.minLos) {
    throw new Error(
      `${plan.code} needs a minimum stay of ${plan.minLos} night${
        plan.minLos > 1 ? "s" : ""
      } — this stay is ${los}.`
    );
  }
  if (plan.advanceDays) {
    const lead = nightsBetween(businessDate, checkIn);
    if (lead < plan.advanceDays) {
      throw new Error(
        `${plan.code} must be booked at least ${plan.advanceDays} days ahead — this arrival is ${lead} day${
          lead === 1 ? "" : "s"
        } out.`
      );
    }
  }
}

/**
 * THE nightly rate for a specific reservation on a date. Precedence:
 *   1. a linked rate plan's modifier over the engine price
 *   2. (legacy) a directly-linked corporate agreement's flat rate
 *   3. the engine (rack + property rules) price
 */
export async function nightlyRateForReservation(
  ctx: Ctx,
  res: Doc<"reservations">,
  date: string
): Promise<number> {
  const engine = await effectiveNightlyRate(
    ctx,
    res.propertyId,
    res.roomType ?? "",
    date
  );
  if (res.ratePlanId) {
    const plan = await ctx.db.get(res.ratePlanId);
    if (plan) {
      let agRate = 0;
      if (plan.agreementId) {
        agRate = parseRp((await ctx.db.get(plan.agreementId))?.rate);
      }
      return resolvePlanRate(plan, engine, agRate);
    }
  }
  if (res.corporateAccountId) {
    const neg = parseRp((await ctx.db.get(res.corporateAccountId))?.rate);
    if (neg > 0) return neg;
  }
  return engine;
}

/**
 * Batched (reservation, date) -> rate resolver, for hot loops (KPIs,
 * night-audit stats, pickup fan-out, reports). Honours negotiated corporate
 * rates.
 */
export async function loadReservationRates(
  ctx: Ctx,
  propertyId: Id<"properties">
) {
  const [rules, bases, agreements, plans] = await Promise.all([
    loadRateRules(ctx, propertyId),
    loadBaseRates(ctx, propertyId),
    ctx.db
      .query("corporate_agreements")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect(),
    ctx.db
      .query("rate_plans")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect(),
  ]);
  const negByAgreement = new Map(
    agreements.map((a) => [a._id, parseRp(a.rate)])
  );
  const planById = new Map(plans.map((p) => [p._id, p]));
  return (res: Doc<"reservations">, date: string): number => {
    const engine = rules(
      res.roomType ?? "",
      date,
      bases.rack(res.roomType ?? "", date)
    );
    if (res.ratePlanId) {
      const plan = planById.get(res.ratePlanId);
      if (plan) {
        const agRate = plan.agreementId
          ? negByAgreement.get(plan.agreementId) ?? 0
          : 0;
        return resolvePlanRate(plan, engine, agRate);
      }
    }
    if (res.corporateAccountId) {
      const neg = negByAgreement.get(res.corporateAccountId);
      if (neg && neg > 0) return neg;
    }
    return engine;
  };
}

/** Batched resolver for hot loops (KPIs, night-audit stats, pickup fan-out). */
export async function loadRateRules(ctx: Ctx, propertyId: Id<"properties">) {
  const [adjustments, overrides] = await Promise.all([
    ctx.db
      .query("rate_adjustments")
      .withIndex("by_property_date", (q) => q.eq("propertyId", propertyId))
      .collect(),
    ctx.db
      .query("rate_overrides")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect(),
  ]);
  const adjByDate = new Map(adjustments.map((a) => [a.date, a.pct]));
  const overrideByCell = new Map(
    overrides.map((o) => [`${o.roomType}|${o.date}`, o.amount])
  );
  /** rack in -> effective rate out, applying the same precedence as above. */
  return (roomType: string, date: string, rack: number): number => {
    const pct = adjByDate.get(date);
    if (pct !== undefined) return Math.round(rack * (1 + pct));
    const manual = overrideByCell.get(`${roomType}|${date}`);
    return manual !== undefined ? manual : rack;
  };
}

/**
 * Priced quote for a whole stay — per-night effective rates plus the property's
 * tax engine. The single source of truth for "what will this stay cost": used
 * by the booking quote query AND by reservations.create / updateDates so the
 * stored estimate never drifts from what the folio will actually post.
 */
export async function quoteStay(
  ctx: Ctx,
  args: {
    propertyId: Id<"properties">;
    roomType: string;
    checkIn: string;
    checkOut: string;
    corporateAgreementId?: Id<"corporate_agreements">;
    ratePlanId?: Id<"rate_plans">;
  }
): Promise<{
  nights: { date: string; rate: number }[];
  subtotal: number;
  tax: number;
  total: number;
}> {
  const rules = await loadRateRules(ctx, args.propertyId);
  const bases = await loadBaseRates(ctx, args.propertyId);
  const taxRows = await ctx.db
    .query("taxes")
    .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
    .collect();

  // A linked rate plan (or, legacy, a bare corporate agreement) reshapes the
  // per-night price off the engine rate.
  let plan: Doc<"rate_plans"> | null = null;
  if (args.ratePlanId) plan = await ctx.db.get(args.ratePlanId);
  let agreementRate = 0;
  const agreementId = args.corporateAgreementId ?? plan?.agreementId;
  if (agreementId) agreementRate = parseRp((await ctx.db.get(agreementId))?.rate);

  const nights: { date: string; rate: number }[] = [];
  for (let d = args.checkIn; d < args.checkOut; d = addDaysIso(d, 1)) {
    const engine = rules(args.roomType, d, bases.rack(args.roomType, d));
    let rate = engine;
    if (plan) rate = resolvePlanRate(plan, engine, agreementRate);
    else if (agreementRate > 0) rate = agreementRate;
    nights.push({ date: d, rate });
  }
  const subtotal = nights.reduce((s, n) => s + n.rate, 0);
  const tax = nights.reduce(
    (s, n, i) =>
      s +
      roomNightTaxes(taxRows, n.rate, { firstNight: i === 0 }).taxLines.reduce(
        (a, t) => a + t.amount,
        0
      ),
    0
  );
  return { nights, subtotal, tax, total: subtotal + tax };
}

/* -------------------------------------------------- reads --------------- */

export const getAdjustments = query({
  args: { propertyId: v.id("properties"), from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    return (
      await ctx.db
        .query("rate_adjustments")
        .withIndex("by_property_date", (q) => q.eq("propertyId", args.propertyId))
        .collect()
    )
      .filter((r) => r.date >= args.from && r.date <= args.to)
      .map((r) => ({ date: r.date, pct: r.pct }));
  },
});

export const getOverrides = query({
  args: { propertyId: v.id("properties"), from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    return (
      await ctx.db
        .query("rate_overrides")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect()
    )
      .filter((o) => o.date >= args.from && o.date <= args.to)
      .map((o) => ({ roomType: o.roomType, date: o.date, amount: o.amount }));
  },
});

/**
 * The effective rate + which rule produced it, for every room type across a
 * date window. Shared by the rates screen and the calendar tape chart so
 * neither does rate math of its own.
 */
export async function buildRateGrid(
  ctx: Ctx,
  propertyId: Id<"properties">,
  from: string,
  to: string
): Promise<{ roomType: string; date: string; rate: number; source: RateSource }[]> {
  const [adjustments, overrides, bases] = await Promise.all([
    ctx.db
      .query("rate_adjustments")
      .withIndex("by_property_date", (q) => q.eq("propertyId", propertyId))
      .collect(),
    ctx.db
      .query("rate_overrides")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect(),
    loadBaseRates(ctx, propertyId),
  ]);
  const adjByDate = new Map(
    adjustments
      .filter((a) => a.date >= from && a.date <= to)
      .map((a) => [a.date, a.pct])
  );
  const ovByCell = new Map(
    overrides
      .filter((o) => o.date >= from && o.date <= to)
      .map((o) => [`${o.roomType}|${o.date}`, o.amount])
  );

  const out: {
    roomType: string;
    date: string;
    rate: number;
    source: RateSource;
  }[] = [];
  for (const roomType of bases.types) {
    for (let d = from; d <= to; d = addDaysIso(d, 1)) {
      const rack = bases.rack(roomType, d);
      const pct = adjByDate.get(d);
      const manual = ovByCell.get(`${roomType}|${d}`);
      let rate = rack;
      let source: RateSource = "rack";
      if (pct !== undefined) {
        rate = Math.round(rack * (1 + pct));
        source = "dynamic";
      } else if (manual !== undefined) {
        rate = manual;
        source = "manual";
      }
      out.push({ roomType, date: d, rate, source });
    }
  }
  return out;
}

export const getRatesGrid = query({
  args: { propertyId: v.id("properties"), from: v.string(), to: v.string() },
  handler: async (ctx, args) =>
    buildRateGrid(ctx, args.propertyId, args.from, args.to),
});

/** Every rate plan for a property, with a live count of linked reservations. */
export const getRatePlans = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const plans = await ctx.db
      .query("rate_plans")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const out = [];
    for (const p of plans) {
      const linked = await ctx.db
        .query("reservations")
        .withIndex("by_rate_plan", (q) => q.eq("ratePlanId", p._id))
        .collect();
      out.push({
        _id: p._id,
        code: p.code,
        name: p.name,
        kind: p.kind,
        pricing: p.pricing,
        amount: p.amount ?? null,
        percent: p.percent ?? null,
        agreementId: p.agreementId ?? null,
        minLos: p.minLos ?? null,
        advanceDays: p.advanceDays ?? null,
        includesBreakfast: p.includesBreakfast ?? false,
        components: p.components ?? [],
        active: p.active,
        reservations: linked.length,
      });
    }
    return out.sort((a, b) => a.code.localeCompare(b.code));
  },
});

/* -------------------------------------------------- writes ------------- */

/** Create or update a rate plan. */
export const upsertRatePlan = mutation({
  args: {
    propertyId: v.id("properties"),
    id: v.optional(v.id("rate_plans")),
    code: v.string(),
    name: v.string(),
    kind: v.string(),
    pricing: v.string(),
    amount: v.optional(v.number()),
    percent: v.optional(v.number()),
    agreementId: v.optional(v.id("corporate_agreements")),
    minLos: v.optional(v.number()),
    advanceDays: v.optional(v.number()),
    includesBreakfast: v.optional(v.boolean()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "gm",
    });
    const { id, propertyId, ...rest } = args;
    const doc = {
      propertyId,
      ...rest,
      active: args.active ?? true,
    };
    let planId: Id<"rate_plans">;
    if (id) {
      await ctx.db.patch(id, doc);
      planId = id;
    } else {
      planId = await ctx.db.insert("rate_plans", doc);
    }
    await writeAudit(ctx, scope, "rate.plan", {
      propertyId,
      target: args.code,
      detail: id ? "updated" : "created",
    });
    return planId;
  },
});

/** Toggle a rate plan on or off for sale. */
export const setRatePlanActive = mutation({
  args: { id: v.id("rate_plans"), active: v.boolean() },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.id);
    if (!plan) throw new Error("Rate plan not found");
    const scope = await authorize(ctx, {
      propertyId: plan.propertyId,
      requireProperty: "gm",
    });
    await ctx.db.patch(args.id, { active: args.active });
    await writeAudit(ctx, scope, "rate.plan", {
      propertyId: plan.propertyId,
      target: plan.code,
      detail: args.active ? "activated" : "deactivated",
    });
  },
});

/** Turn the dynamic-pricing toggle on/off for one stay date. */
export const setDynamic = mutation({
  args: { propertyId: v.id("properties"), date: v.string(), on: v.boolean() },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "gm",
    });
    const existing = await ctx.db
      .query("rate_adjustments")
      .withIndex("by_property_date", (q) =>
        q.eq("propertyId", args.propertyId).eq("date", args.date)
      )
      .first();

    if (args.on) {
      if (existing) await ctx.db.patch(existing._id, { pct: DYNAMIC_PCT });
      else
        await ctx.db.insert("rate_adjustments", {
          propertyId: args.propertyId,
          date: args.date,
          pct: DYNAMIC_PCT,
        });
    } else if (existing) {
      await ctx.db.delete(existing._id);
    }

    await writeAudit(ctx, scope, "rate.dynamic", {
      propertyId: args.propertyId,
      target: args.date,
      detail: args.on ? `+${Math.round(DYNAMIC_PCT * 100)}%` : "off",
    });
  },
});

/** Set (amount > 0) or clear (amount <= 0) a manual rate for one grid cell. */
export const setManualRate = mutation({
  args: {
    propertyId: v.id("properties"),
    roomType: v.string(),
    date: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      propertyId: args.propertyId,
      requireProperty: "gm",
    });
    const existing = (
      await ctx.db
        .query("rate_overrides")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect()
    ).find((o) => o.roomType === args.roomType && o.date === args.date);

    const amount = Math.round(args.amount);
    if (amount > 0) {
      if (existing) await ctx.db.patch(existing._id, { amount });
      else
        await ctx.db.insert("rate_overrides", {
          propertyId: args.propertyId,
          roomType: args.roomType,
          date: args.date,
          amount,
        });
    } else if (existing) {
      await ctx.db.delete(existing._id);
    }

    await writeAudit(ctx, scope, "rate.manual", {
      propertyId: args.propertyId,
      target: `${args.roomType} · ${args.date}`,
      detail: amount > 0 ? money(amount) : "cleared",
    });
  },
});
