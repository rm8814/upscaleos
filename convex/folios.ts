import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authorize, writeAudit } from "./authz";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { roomNightTaxes, chargeTaxes } from "./taxEngine";
import { codeForPayment } from "./transactionCodes";
import { nightlyRateForReservation } from "./rates";

const money = (n: number) => `Rp ${Math.round(n).toLocaleString("en-US")}`;

async function propertyTaxes(ctx: QueryCtx, propertyId: Id<"properties">) {
  return ctx.db
    .query("taxes")
    .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
    .collect();
}

const addDaysIso = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/* -------------------------------------------------- internal helpers ------ */

async function folioForReservation(
  ctx: QueryCtx,
  reservationId: Id<"reservations">
) {
  return ctx.db
    .query("folios")
    .withIndex("by_reservation", (q) => q.eq("reservationId", reservationId))
    .first();
}

/** Post one night's room + tax charge to a folio, unless already posted. */
async function postNight(
  ctx: MutationCtx,
  folio: Doc<"folios">,
  res: Doc<"reservations">,
  date: string
) {
  const existing = await ctx.db
    .query("folio_lines")
    .withIndex("by_folio", (q) => q.eq("folioId", folio._id))
    .collect();
  if (existing.some((l) => l.kind === "room" && l.date === date && !l.voided))
    return;

  const gross = await nightlyRateForReservation(ctx, res, date);
  const taxes = await propertyTaxes(ctx, folio.propertyId);
  const { roomNet, taxLines } = roomNightTaxes(taxes, gross, {
    firstNight: date === res.checkIn,
  });

  await ctx.db.insert("folio_lines", {
    folioId: folio._id,
    propertyId: folio.propertyId,
    date,
    kind: "room",
    code: "RM",
    description: `Room — ${res.roomType ?? "Room"} · night of ${date}`,
    amount: roomNet,
  });
  for (const t of taxLines) {
    await ctx.db.insert("folio_lines", {
      folioId: folio._id,
      propertyId: folio.propertyId,
      date,
      kind: "tax",
      code: t.code,
      description: t.name,
      amount: t.amount,
    });
  }
}

/**
 * Open a folio for a reservation on check-in and post every night already
 * stayed (arrival night through the current business date).
 */
export async function openFolioForReservation(
  ctx: MutationCtx,
  res: Doc<"reservations">,
  businessDate: string
) {
  let folio = await folioForReservation(ctx, res._id);
  if (folio && folio.status === "closed") {
    await ctx.db.patch(folio._id, { status: "open", closedOn: undefined });
    folio = await ctx.db.get(folio._id);
  }
  // A deposit folio opened before arrival becomes the guest folio on check-in.
  if (folio && folio.ledger === "deposit") {
    await ctx.db.patch(folio._id, { ledger: undefined, status: "open" });
    folio = await ctx.db.get(folio._id);
  }
  if (!folio) {
    const id = await ctx.db.insert("folios", {
      propertyId: res.propertyId,
      reservationId: res._id,
      guestId: res.guestId,
      status: "open",
      openedOn: businessDate,
    });
    folio = await ctx.db.get(id);
  }
  if (!folio) return;

  const lastNight =
    businessDate < addDaysIso(res.checkOut, -1)
      ? businessDate
      : addDaysIso(res.checkOut, -1);
  for (let d = res.checkIn; d <= lastNight; d = addDaysIso(d, 1)) {
    await postNight(ctx, folio, res, d);
  }
}

/** Night-audit hook: post the night that just ended to every open folio. */
export async function postNightlyToOpenFolios(
  ctx: MutationCtx,
  propertyId: Id<"properties">,
  night: string
) {
  const folios = await ctx.db
    .query("folios")
    .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
    .collect();
  for (const folio of folios) {
    if (folio.status !== "open") continue;
    const res = await ctx.db.get(folio.reservationId);
    if (!res) continue;
    if (res.checkIn <= night && night < res.checkOut) {
      await postNight(ctx, folio, res, night);
    }
  }
}

export async function closeFolio(
  ctx: MutationCtx,
  reservationId: Id<"reservations">,
  businessDate: string
) {
  const folio = await folioForReservation(ctx, reservationId);
  if (folio && folio.status === "open") {
    await ctx.db.patch(folio._id, { status: "closed", closedOn: businessDate });
  }
}

export async function reopenFolio(
  ctx: MutationCtx,
  reservationId: Id<"reservations">
) {
  const folio = await folioForReservation(ctx, reservationId);
  if (folio && folio.status === "closed") {
    await ctx.db.patch(folio._id, { status: "open", closedOn: undefined });
  }
}

/**
 * Undo a check-in / cancel a reservation: reverse the folio without destroying
 * it. Every un-voided charge line is voided (kept for the audit trail). If no
 * payment was taken the folio is marked "void"; if a payment exists the folio
 * stays open carrying a credit balance (a refund is owed).
 */
export async function reverseFolioCharges(
  ctx: MutationCtx,
  reservationId: Id<"reservations">,
  businessDate: string
) {
  const folio = await folioForReservation(ctx, reservationId);
  if (!folio || folio.status === "void") return;
  const lines = await ctx.db
    .query("folio_lines")
    .withIndex("by_folio", (q) => q.eq("folioId", folio._id))
    .collect();

  for (const l of lines) {
    if (l.kind === "payment" || l.voided) continue;
    await ctx.db.patch(l._id, { voided: true });
  }
  const hasPayment = lines.some((l) => l.kind === "payment" && !l.voided);
  await ctx.db.patch(folio._id, {
    status: hasPayment ? "open" : "void",
    closedOn: hasPayment ? undefined : businessDate,
  });
}

/**
 * Reconcile an open folio's room/tax lines to the reservation's current dates
 * (and room type). Called after a stay change. Nights no longer in the stay are
 * voided; missing nights up to the business date are posted. `repriceExisting`
 * re-posts in-range nights too (used when the room type changed).
 */
export async function reconcileFolioToStay(
  ctx: MutationCtx,
  reservationId: Id<"reservations">,
  businessDate: string,
  opts: { repriceExisting?: boolean } = {}
) {
  const folio = await folioForReservation(ctx, reservationId);
  if (!folio || folio.status === "void") return;
  const res = await ctx.db.get(reservationId);
  if (!res) return;

  const lastNight =
    businessDate < addDaysIso(res.checkOut, -1)
      ? businessDate
      : addDaysIso(res.checkOut, -1);
  const inStay = new Set<string>();
  for (let d = res.checkIn; d <= lastNight; d = addDaysIso(d, 1)) {
    inStay.add(d);
  }

  const lines = await ctx.db
    .query("folio_lines")
    .withIndex("by_folio", (q) => q.eq("folioId", folio._id))
    .collect();
  for (const l of lines) {
    if ((l.kind !== "room" && l.kind !== "tax") || l.voided) continue;
    if (!inStay.has(l.date) || opts.repriceExisting) {
      await ctx.db.patch(l._id, { voided: true });
    }
  }

  for (const night of inStay) {
    await postNight(ctx, folio, res, night);
  }
}

/* -------------------------------------------------- public query --------- */

export const getForReservation = query({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, args) => {
    const folio = await folioForReservation(ctx, args.reservationId);
    if (!folio) return null;
    const lines = (
      await ctx.db
        .query("folio_lines")
        .withIndex("by_folio", (q) => q.eq("folioId", folio._id))
        .collect()
    ).sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
    const balance = lines
      .filter((l) => !l.voided)
      .reduce((s, l) => s + l.amount, 0);
    return {
      status: folio.status,
      openedOn: folio.openedOn,
      closedOn: folio.closedOn ?? null,
      lines: lines.map((l) => ({
        _id: l._id,
        date: l.date,
        kind: l.kind,
        description: l.description,
        amount: money(l.amount),
        raw: l.amount,
        voided: l.voided ?? false,
      })),
      balance: money(balance),
      balanceRaw: balance,
    };
  },
});

/* -------------------------------------------------- open-folio directory -- */

/** Every open folio for a property with guest, room and live balance. */
export const listOpen = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const folios = await ctx.db
      .query("folios")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const out = [];
    for (const folio of folios) {
      if (folio.status !== "open") continue;
      const [res, guest, lines] = await Promise.all([
        ctx.db.get(folio.reservationId),
        ctx.db.get(folio.guestId),
        ctx.db
          .query("folio_lines")
          .withIndex("by_folio", (q) => q.eq("folioId", folio._id))
          .collect(),
      ]);
      const balance = lines
        .filter((l) => !l.voided)
        .reduce((s, l) => s + l.amount, 0);
      out.push({
        folioId: folio._id,
        reservationId: folio.reservationId,
        guestName: guest?.name ?? "Guest",
        roomNumber: res?.roomNumber ?? null,
        roomType: res?.roomType ?? null,
        balance,
        balanceLabel: money(balance),
      });
    }
    return out.sort((a, b) =>
      (a.roomNumber ?? "~").localeCompare(b.roomNumber ?? "~")
    );
  },
});

/** Folio lines of a given kind across a property (newest first). */
export const listLinesByKind = query({
  args: { propertyId: v.id("properties"), kind: v.string() },
  handler: async (ctx, args) => {
    const lines = await ctx.db
      .query("folio_lines")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const rows = [];
    for (const l of lines.filter((x) => x.kind === args.kind)) {
      const folio = await ctx.db.get(l.folioId);
      const res = folio ? await ctx.db.get(folio.reservationId) : null;
      const guest = folio ? await ctx.db.get(folio.guestId) : null;
      rows.push({
        _id: l._id,
        date: l.date,
        postedAt: l.postedAt ?? 0,
        description: l.description,
        amount: l.amount,
        amountLabel: money(l.amount),
        method: l.method ?? null,
        source: l.source ?? null,
        voided: l.voided ?? false,
        guestName: guest?.name ?? "Guest",
        roomNumber: res?.roomNumber ?? null,
      });
    }
    return rows.sort((a, b) =>
      a.date === b.date ? b.postedAt - a.postedAt : a.date < b.date ? 1 : -1
    );
  },
});

/* -------------------------------------------------- cashier / POS writes -- */

/** Record a guest payment as a negative line on the reservation's folio. */
export const recordPayment = mutation({
  args: {
    reservationId: v.id("reservations"),
    amount: v.number(),
    method: v.string(),
    businessDate: v.string(),
  },
  handler: async (ctx, args) => {
    const res = await ctx.db.get(args.reservationId);
    if (!res) throw new Error("Reservation not found");
    const scope = await authorize(ctx, {
      propertyId: res.propertyId,
      requireProperty: "front_office",
    });
    const amt = Math.abs(Math.round(args.amount));
    if (!amt) throw new Error("Amount must be greater than zero");

    // No folio yet (guest hasn't checked in) → this is an advance deposit;
    // open a deposit-ledger folio for it. On check-in it becomes the guest folio.
    let folio = await folioForReservation(ctx, args.reservationId);
    if (!folio) {
      const id = await ctx.db.insert("folios", {
        propertyId: res.propertyId,
        reservationId: res._id,
        guestId: res.guestId,
        status: "open",
        ledger: "deposit",
        openedOn: args.businessDate,
      });
      folio = await ctx.db.get(id);
    }
    if (!folio) throw new Error("Could not open a folio");

    await ctx.db.insert("folio_lines", {
      folioId: folio._id,
      propertyId: folio.propertyId,
      date: args.businessDate,
      kind: "payment",
      code: codeForPayment(args.method),
      description: `Payment — ${args.method}`,
      amount: -amt,
      method: args.method,
      postedAt: Date.now(),
    });
    await writeAudit(ctx, scope, "folio.payment", {
      propertyId: res.propertyId,
      target: (await ctx.db.get(res.guestId))?.name,
      detail: `${money(amt)} · ${args.method}${
        folio.ledger === "deposit" ? " · deposit" : ""
      }`,
    });
  },
});

/** Post a charge (POS food & beverage, spa, minibar, ...) to a folio. */
export const postCharge = mutation({
  args: {
    reservationId: v.id("reservations"),
    amount: v.number(),
    kind: v.optional(v.string()),
    description: v.string(),
    source: v.optional(v.string()),
    businessDate: v.string(),
  },
  handler: async (ctx, args) => {
    const folio = await folioForReservation(ctx, args.reservationId);
    if (!folio) throw new Error("No folio for that reservation");
    const scope = await authorize(ctx, {
      propertyId: folio.propertyId,
      requireProperty: "front_office",
    });
    const amt = Math.abs(Math.round(args.amount));
    if (!amt) throw new Error("Amount must be greater than zero");
    const kind = (args.kind ?? "fnb") as "fnb" | "service";
    const taxes = await propertyTaxes(ctx, folio.propertyId);
    const { net, taxLines } = chargeTaxes(taxes, amt, kind);

    await ctx.db.insert("folio_lines", {
      folioId: folio._id,
      propertyId: folio.propertyId,
      date: args.businessDate,
      kind,
      code: kind === "fnb" ? "FB" : "SV",
      description: args.description,
      amount: net,
      source: args.source,
      postedAt: Date.now(),
    });
    for (const t of taxLines) {
      await ctx.db.insert("folio_lines", {
        folioId: folio._id,
        propertyId: folio.propertyId,
        date: args.businessDate,
        kind: "tax",
        code: t.code,
        description: t.name,
        amount: t.amount,
        source: args.source,
        postedAt: Date.now(),
      });
    }
    await writeAudit(ctx, scope, "folio.charge", {
      propertyId: folio.propertyId,
      target: args.description,
      detail: `${money(amt)}${args.source ? ` · ${args.source}` : ""}`,
    });
  },
});

/** Void a folio line (kept for the audit trail, excluded from the balance). */
export const voidLine = mutation({
  args: { lineId: v.id("folio_lines") },
  handler: async (ctx, args) => {
    const line = await ctx.db.get(args.lineId);
    if (!line) throw new Error("Line not found");
    const scope = await authorize(ctx, {
      propertyId: line.propertyId,
      requireProperty: "front_office",
    });
    await ctx.db.patch(args.lineId, { voided: true });
    await writeAudit(ctx, scope, "folio.void", {
      propertyId: line.propertyId,
      target: line.description,
      detail: money(line.amount),
    });
  },
});
