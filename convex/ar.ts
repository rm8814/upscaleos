import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { authorize, writeAudit } from "./authz";

const money = (n: number) => `Rp ${Math.round(n).toLocaleString("en-US")}`;
const daysBetween = (a: string, b: string) =>
  Math.round(
    (Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000
  );

async function businessDate(ctx: QueryCtx, propertyId: Id<"properties">) {
  const p = await ctx.db.get(propertyId);
  return p?.businessDate ?? "2026-09-08";
}

async function accountTx(ctx: QueryCtx, accountId: Id<"ar_accounts">) {
  return ctx.db
    .query("ar_transactions")
    .withIndex("by_account", (q) => q.eq("accountId", accountId))
    .collect();
}

/** Aged balance of one account as of a business date. */
function age(
  tx: { date: string; amount: number }[],
  today: string
): { balance: number; a030: number; a3160: number; a60: number } {
  let balance = 0;
  let a030 = 0;
  let a3160 = 0;
  let a60 = 0;
  // Apply payments against the oldest charges first (FIFO), then bucket the
  // remaining open charges by age.
  const charges = tx
    .filter((t) => t.amount > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => ({ ...t }));
  let credit = tx.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0);
  for (const c of charges) {
    const applied = Math.min(credit, c.amount);
    c.amount -= applied;
    credit -= applied;
  }
  for (const c of charges) {
    if (c.amount <= 0) continue;
    balance += c.amount;
    const d = daysBetween(c.date, today);
    if (d <= 30) a030 += c.amount;
    else if (d <= 60) a3160 += c.amount;
    else a60 += c.amount;
  }
  return { balance, a030, a3160, a60 };
}

export const listAccounts = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const today = await businessDate(ctx, args.propertyId);
    const accounts = await ctx.db
      .query("ar_accounts")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const out = [];
    for (const acc of accounts) {
      const tx = await accountTx(ctx, acc._id);
      const a = age(tx, today);
      const lastPayment = tx
        .filter((t) => t.kind === "payment")
        .sort((x, y) => y.date.localeCompare(x.date))[0];
      out.push({
        id: acc._id,
        account: acc.name,
        type: acc.type,
        balance: a.balance,
        balanceLabel: money(a.balance),
        creditLimit: acc.creditLimit,
        creditLimitLabel: acc.creditLimit ? money(acc.creditLimit) : "—",
        a030Label: money(a.a030),
        a3160Label: money(a.a3160),
        a60Label: money(a.a60),
        lastPayment: lastPayment?.date ?? null,
        overdue:
          a.a60 > 0 || (acc.creditLimit > 0 && a.balance > acc.creditLimit),
      });
    }
    return out.sort((x, y) => y.balance - x.balance);
  },
});

export const getAccount = query({
  args: { accountId: v.id("ar_accounts") },
  handler: async (ctx, args) => {
    const acc = await ctx.db.get(args.accountId);
    if (!acc) return null;
    const today = await businessDate(ctx, acc.propertyId);
    const tx = await accountTx(ctx, args.accountId);
    const a = age(tx, today);
    return {
      id: acc._id,
      account: acc.name,
      type: acc.type,
      balance: a.balance,
      balanceLabel: money(a.balance),
      creditLimitLabel: acc.creditLimit ? money(acc.creditLimit) : "—",
      a030Label: money(a.a030),
      a3160Label: money(a.a3160),
      a60Label: money(a.a60),
      transactions: tx
        .sort((x, y) => y.date.localeCompare(x.date))
        .map((t) => ({
          _id: t._id,
          date: t.date,
          desc: t.description,
          ref: t.ref,
          amount: money(t.amount),
          credit: t.amount < 0,
        })),
    };
  },
});

/** Guest / deposit / city ledger totals for the property. */
export const ledgerSummary = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const [folios, lines, accounts] = await Promise.all([
      ctx.db
        .query("folios")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("folio_lines")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
      ctx.db
        .query("ar_accounts")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .collect(),
    ]);

    const balByFolio = new Map<string, number>();
    for (const l of lines) {
      if (l.voided) continue;
      balByFolio.set(
        l.folioId,
        (balByFolio.get(l.folioId) ?? 0) + l.amount
      );
    }

    let guest = 0;
    let deposit = 0;
    for (const f of folios) {
      if (f.status !== "open") continue;
      const bal = balByFolio.get(f._id) ?? 0;
      if ((f.ledger ?? "guest") === "deposit" || bal < 0) deposit += bal;
      else guest += bal;
    }

    let city = 0;
    for (const acc of accounts) {
      const tx = await accountTx(ctx, acc._id);
      city += tx.reduce((s, t) => s + t.amount, 0);
    }

    return {
      guest,
      guestLabel: money(guest),
      deposit,
      depositLabel: money(deposit),
      city,
      cityLabel: money(city),
    };
  },
});

export const recordPayment = mutation({
  args: {
    accountId: v.id("ar_accounts"),
    amount: v.number(),
    method: v.string(),
  },
  handler: async (ctx, args) => {
    const acc = await ctx.db.get(args.accountId);
    if (!acc) throw new Error("Account not found");
    const scope = await authorize(ctx, {
      propertyId: acc.propertyId,
      requireProperty: "gm",
    });
    const amt = Math.abs(Math.round(args.amount));
    if (!amt) throw new Error("Amount must be greater than zero");
    const today = await businessDate(ctx, acc.propertyId);
    const count =
      (await accountTx(ctx, args.accountId)).filter((t) => t.kind === "payment")
        .length + 1;
    await ctx.db.insert("ar_transactions", {
      accountId: args.accountId,
      propertyId: acc.propertyId,
      date: today,
      kind: "payment",
      description: `Payment received — ${args.method}`,
      ref: `PMT-${3400 + count}`,
      amount: -amt,
    });
    await writeAudit(ctx, scope, "ar.payment", {
      propertyId: acc.propertyId,
      target: acc.name,
      detail: `${money(amt)} · ${args.method}`,
    });
  },
});

/**
 * Night-audit hook: move each just-closed folio that carries a balance and
 * settles to a channel account off the guest ledger and onto the city ledger.
 */
export async function transferClosedFoliosToCityLedger(
  ctx: MutationCtx,
  propertyId: Id<"properties">,
  closedDate: string
) {
  const accounts = await ctx.db
    .query("ar_accounts")
    .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
    .collect();
  const byChannel = new Map(
    accounts.filter((a) => a.matchChannel).map((a) => [a.matchChannel!, a])
  );
  const byAgreement = new Map(
    accounts.filter((a) => a.agreementId).map((a) => [a.agreementId!, a])
  );
  if (byChannel.size === 0 && byAgreement.size === 0) return 0;

  const folios = await ctx.db
    .query("folios")
    .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
    .collect();

  let moved = 0;
  for (const f of folios) {
    if (f.status !== "closed" || f.closedOn !== closedDate) continue;
    if (f.ledger === "city") continue;
    const res = await ctx.db.get(f.reservationId);
    // A linked corporate/TA agreement settles to its own A/R account;
    // otherwise fall back to an OTA channel match.
    const acc =
      (res?.corporateAccountId
        ? byAgreement.get(res.corporateAccountId)
        : undefined) ??
      (res?.channel ? byChannel.get(res.channel) : undefined);
    if (!acc) continue;

    const lines = await ctx.db
      .query("folio_lines")
      .withIndex("by_folio", (q) => q.eq("folioId", f._id))
      .collect();
    const balance = lines
      .filter((l) => !l.voided)
      .reduce((s, l) => s + l.amount, 0);
    if (balance <= 0) continue;

    const guest = await ctx.db.get(f.guestId);
    const seq =
      (await ctx.db
        .query("ar_transactions")
        .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
        .collect()
        .then((r) => r.filter((t) => t.kind === "invoice").length)) + 1;
    await ctx.db.insert("ar_transactions", {
      accountId: acc._id,
      propertyId,
      date: closedDate,
      kind: "invoice",
      description: `Folio transfer — ${guest?.name ?? "guest"}`,
      ref: `INV-${2026}-${String(seq).padStart(4, "0")}`,
      amount: Math.round(balance),
      folioId: f._id,
    });
    // zero the guest folio by posting an offsetting transfer line
    await ctx.db.insert("folio_lines", {
      folioId: f._id,
      propertyId,
      date: closedDate,
      kind: "payment",
      code: "PAY-LEDGER",
      description: `Transferred to city ledger — ${acc.name}`,
      amount: -Math.round(balance),
    });
    await ctx.db.patch(f._id, { ledger: "city" });
    moved += 1;
  }
  return moved;
}
