import { query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { nightlyRateFor } from "./revenue";

const TAX_RATE = 0.21; // 11% government + 10% service
const money = (n: number) => `Rp ${Math.round(n).toLocaleString("en-US")}`;

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
  if (existing.some((l) => l.kind === "room" && l.date === date)) return;

  const room = nightlyRateFor(res.roomType ?? "", date);
  await ctx.db.insert("folio_lines", {
    folioId: folio._id,
    propertyId: folio.propertyId,
    date,
    kind: "room",
    description: `Room — ${res.roomType ?? "Room"} · night of ${date}`,
    amount: room,
  });
  await ctx.db.insert("folio_lines", {
    folioId: folio._id,
    propertyId: folio.propertyId,
    date,
    kind: "tax",
    description: "Service + government tax (21%)",
    amount: Math.round(room * TAX_RATE),
  });
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

/** Undo a mistaken check-in: drop the folio if nothing has been paid on it. */
export async function voidFolioIfUnpaid(
  ctx: MutationCtx,
  reservationId: Id<"reservations">
) {
  const folio = await folioForReservation(ctx, reservationId);
  if (!folio) return;
  const lines = await ctx.db
    .query("folio_lines")
    .withIndex("by_folio", (q) => q.eq("folioId", folio._id))
    .collect();
  if (lines.some((l) => l.kind === "payment")) return; // keep a folio with money on it
  for (const l of lines) await ctx.db.delete(l._id);
  await ctx.db.delete(folio._id);
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
    const balance = lines.reduce((s, l) => s + l.amount, 0);
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
      })),
      balance: money(balance),
      balanceRaw: balance,
    };
  },
});
