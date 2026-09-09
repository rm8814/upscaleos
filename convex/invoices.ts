import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { authorize } from "./authz";

const money = (n: number) => `Rp ${Math.round(n).toLocaleString("en-US")}`;

async function businessDate(ctx: QueryCtx, propertyId: Id<"properties">) {
  const p = await ctx.db.get(propertyId);
  return p?.businessDate ?? "2026-09-08";
}

/** Next gapless invoice number for a property/year. Atomic within the mutation. */
async function nextInvoiceNumber(
  ctx: MutationCtx,
  propertyId: Id<"properties">,
  year: number
): Promise<{ number: string; seq: number; year: number }> {
  const existing = await ctx.db
    .query("invoice_counters")
    .withIndex("by_property_year", (q) =>
      q.eq("propertyId", propertyId).eq("year", year)
    )
    .first();
  let seq: number;
  if (existing) {
    seq = existing.next;
    await ctx.db.patch(existing._id, { next: seq + 1 });
  } else {
    seq = 1;
    await ctx.db.insert("invoice_counters", { propertyId, year, next: 2 });
  }
  return {
    number: `INV-${year}-${String(seq).padStart(4, "0")}`,
    seq,
    year,
  };
}

/**
 * Issue an invoice for a reservation's folio, snapshotting its lines. One live
 * invoice per folio — returns the existing one if already issued (and not
 * voided). Called on check-out and by the night audit; also exposed as a
 * mutation for a manual "issue bill" action.
 */
export async function issueInvoiceForFolio(
  ctx: MutationCtx,
  folioId: Id<"folios">
): Promise<Id<"invoices"> | null> {
  const folio = await ctx.db.get(folioId);
  if (!folio) return null;

  const prior = await ctx.db
    .query("invoices")
    .withIndex("by_folio", (q) => q.eq("folioId", folioId))
    .collect();
  const live = prior.find((i) => i.status !== "void");
  if (live) return live._id;

  const [lines, res, guest] = await Promise.all([
    ctx.db
      .query("folio_lines")
      .withIndex("by_folio", (q) => q.eq("folioId", folioId))
      .collect(),
    ctx.db.get(folio.reservationId),
    ctx.db.get(folio.guestId),
  ]);
  const active = lines
    .filter((l) => !l.voided)
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));

  const charges = active
    .filter((l) => l.amount > 0)
    .reduce((s, l) => s + l.amount, 0);
  const paid = -active
    .filter((l) => l.amount < 0)
    .reduce((s, l) => s + l.amount, 0);

  const bd = await businessDate(ctx, folio.propertyId);
  const year = Number(bd.slice(0, 4));
  const { number, seq } = await nextInvoiceNumber(ctx, folio.propertyId, year);

  const balance = charges - paid;
  return ctx.db.insert("invoices", {
    propertyId: folio.propertyId,
    number,
    year,
    seq,
    reservationId: folio.reservationId,
    folioId,
    guestId: folio.guestId,
    guestName: guest?.name ?? "Guest",
    issuedOn: bd,
    issuedAt: Date.now(),
    status: balance <= 0 ? "paid" : "issued",
    charges: Math.round(charges),
    paid: Math.round(paid),
    total: Math.round(charges),
    balance: Math.round(balance),
    lines: active.map((l) => ({
      description: l.description,
      code: l.code,
      kind: l.kind,
      amount: l.amount,
    })),
  });
}

export const issue = mutation({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, args) => {
    const folio = await ctx.db
      .query("folios")
      .withIndex("by_reservation", (q) =>
        q.eq("reservationId", args.reservationId)
      )
      .first();
    if (!folio) throw new Error("No folio for that reservation");
    await authorize(ctx, {
      propertyId: folio.propertyId,
      requireProperty: "front_office",
    });
    return issueInvoiceForFolio(ctx, folio._id);
  },
});

export const voidInvoice = mutation({
  args: { invoiceId: v.id("invoices"), reason: v.string() },
  handler: async (ctx, args) => {
    const inv = await ctx.db.get(args.invoiceId);
    if (!inv) throw new Error("Invoice not found");
    await authorize(ctx, {
      propertyId: inv.propertyId,
      requireProperty: "gm",
    });
    if (inv.status === "void") return;
    await ctx.db.patch(args.invoiceId, {
      status: "void",
      voidReason: args.reason,
    });
  },
});

/** A credit note reverses an issued invoice; it takes its own sequential number. */
export const creditNote = mutation({
  args: { invoiceId: v.id("invoices"), reason: v.string() },
  handler: async (ctx, args) => {
    const inv = await ctx.db.get(args.invoiceId);
    if (!inv) throw new Error("Invoice not found");
    await authorize(ctx, { propertyId: inv.propertyId, requireProperty: "gm" });
    if (inv.status === "credit_note")
      throw new Error("Can't credit a credit note");

    const { number, seq } = await nextInvoiceNumber(
      ctx,
      inv.propertyId,
      inv.year
    );
    return ctx.db.insert("invoices", {
      propertyId: inv.propertyId,
      number,
      year: inv.year,
      seq,
      reservationId: inv.reservationId,
      folioId: inv.folioId,
      guestId: inv.guestId,
      guestName: inv.guestName,
      issuedOn: await businessDate(ctx, inv.propertyId),
      issuedAt: Date.now(),
      status: "credit_note",
      creditOf: inv._id,
      voidReason: args.reason,
      charges: -inv.charges,
      paid: -inv.paid,
      total: -inv.total,
      balance: -inv.balance,
      lines: inv.lines.map((l) => ({ ...l, amount: -l.amount })),
    });
  },
});

/* ------------------------------------------------------------------ reads */

export const getForReservation = query({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, args) => {
    const inv = (
      await ctx.db
        .query("invoices")
        .withIndex("by_reservation", (q) =>
          q.eq("reservationId", args.reservationId)
        )
        .collect()
    )
      .filter((i) => i.status !== "void")
      .sort((a, b) => b.issuedAt - a.issuedAt)[0];
    if (!inv) return null;
    return {
      _id: inv._id,
      number: inv.number,
      status: inv.status,
      totalLabel: money(inv.total),
      balanceLabel: money(inv.balance),
    };
  },
});

export const get = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const inv = await ctx.db.get(args.invoiceId);
    if (!inv) return null;
    const [property, res] = await Promise.all([
      ctx.db.get(inv.propertyId),
      ctx.db.get(inv.reservationId),
    ]);
    return {
      number: inv.number,
      status: inv.status,
      issuedOn: inv.issuedOn,
      voidReason: inv.voidReason ?? null,
      creditOf: inv.creditOf ?? null,
      guestName: inv.guestName,
      property: property
        ? {
            name: property.name,
            address: property.address ?? "",
            contactEmail: property.contactEmail ?? "",
            id: property.id,
          }
        : null,
      stay: res
        ? { checkIn: res.checkIn, checkOut: res.checkOut, room: res.roomNumber ?? "—", roomType: res.roomType ?? "—" }
        : null,
      lines: inv.lines.map((l) => ({
        description: l.description,
        code: l.code ?? "",
        kind: l.kind,
        amount: l.amount,
        amountLabel: money(l.amount),
      })),
      chargesLabel: money(inv.charges),
      paidLabel: money(inv.paid),
      totalLabel: money(inv.total),
      balanceLabel: money(inv.balance),
    };
  },
});

export const list = query({
  args: { propertyId: v.id("properties"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("invoices")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .order("desc")
      .take(Math.min(args.limit ?? 50, 200));
    return rows.map((i) => ({
      _id: i._id,
      number: i.number,
      guestName: i.guestName,
      issuedOn: i.issuedOn,
      status: i.status,
      totalLabel: money(i.total),
      balanceLabel: money(i.balance),
    }));
  },
});
