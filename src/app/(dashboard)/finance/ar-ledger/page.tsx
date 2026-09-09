"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AlertTriangle, X, FileSpreadsheet } from "lucide-react";
import { Card, Eyebrow } from "@/components/upx/primitives";
import { useProperty } from "@/components/providers/PropertyProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { downloadCsv } from "@/lib/csv";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00Z");
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const shortDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]}`;
};

const GRID =
  "grid grid-cols-[1.4fr_0.9fr_1fr_1fr_0.9fr_0.9fr_0.9fr_1fr] gap-2.5 px-4";

export default function ArLedgerPage() {
  const { activeProperty } = useProperty();
  const toast = useToast();
  const propArg = activeProperty ? { propertyId: activeProperty._id } : "skip";

  const accounts = useQuery(api.ar.listAccounts, propArg);
  const ledgers = useQuery(api.ar.ledgerSummary, propArg);
  const recordPayment = useMutation(api.ar.recordPayment);

  const [openId, setOpenId] = useState<Id<"ar_accounts"> | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [pay, setPay] = useState({ amount: "", method: "Bank transfer" });

  const detail = useQuery(
    api.ar.getAccount,
    openId ? { accountId: openId } : "skip"
  );

  const overdue = (accounts ?? []).filter((a) => a.overdue).length;

  const submitPayment = async () => {
    if (!openId) return;
    const amt = Number(pay.amount.replace(/[^\d]/g, ""));
    if (!amt) {
      toast("Enter an amount", "error");
      return;
    }
    try {
      await recordPayment({ accountId: openId, amount: amt, method: pay.method });
      toast("Payment recorded against the account", "success");
      setPay({ amount: "", method: "Bank transfer" });
      setPayOpen(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not record payment", "error");
    }
  };

  return (
    <div className="mx-auto max-w-content">
      {ledgers && (
        <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Guest ledger", value: ledgers.guestLabel, hint: "In-house folio balances" },
            { label: "Deposit ledger", value: ledgers.depositLabel, hint: "Advance deposits held" },
            { label: "City ledger (A/R)", value: ledgers.cityLabel, hint: "Billed to accounts" },
          ].map((m) => (
            <Card key={m.label} className="p-3.5">
              <Eyebrow>{m.label}</Eyebrow>
              <div className="mt-1 font-mono text-19 font-bold">{m.value}</div>
              <div className="mt-0.5 text-[11px] text-fg-3">{m.hint}</div>
            </Card>
          ))}
        </div>
      )}

      {overdue > 0 && (
        <div className="mb-3.5 flex items-center gap-2.5 rounded-lg border border-room-ooo bg-elevated p-3.5">
          <AlertTriangle className="h-[15px] w-[15px] flex-none text-room-ooo" />
          <span className="text-[12.5px]">
            {overdue} account{overdue > 1 ? "s have" : " has"} balances aged past 60 days or over the
            credit limit.
          </span>
        </div>
      )}

      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <button
          onClick={() =>
            downloadCsv(
              "ar-ledger.csv",
              (accounts ?? []).map((a) => ({
                account: a.account,
                type: a.type,
                balance: a.balanceLabel,
                creditLimit: a.creditLimitLabel,
                aged_0_30: a.a030Label,
                aged_31_60: a.a3160Label,
                aged_60_plus: a.a60Label,
                lastPayment: fmtDate(a.lastPayment),
              }))
            )
          }
          className="ml-auto flex items-center gap-1.5 rounded-sm bg-accent-violet px-3.5 py-2 text-12 font-medium text-ice hover:bg-accent-violet-hi"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <Card className="overflow-x-auto p-0">
        <div className="min-w-[900px]">
          <div className={`${GRID} border-b border-line py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3`}>
            <div>Account</div>
            <div>Type</div>
            <div>Balance</div>
            <div>Credit limit</div>
            <div>0–30d</div>
            <div>31–60d</div>
            <div>60d+</div>
            <div>Last payment</div>
          </div>
          {accounts === undefined && (
            <div className="px-4 py-4 text-13 text-fg-3">Loading…</div>
          )}
          {accounts && accounts.length === 0 && (
            <div className="px-4 py-4 text-13 text-fg-3">No A/R accounts.</div>
          )}
          {(accounts ?? []).map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setOpenId(a.id);
                setPayOpen(false);
              }}
              className={`${GRID} w-full items-center border-b border-line-soft py-3 text-left text-13 transition-colors last:border-0 hover:bg-elevated`}
            >
              <div className="font-semibold">{a.account}</div>
              <div className="text-12 text-fg-3">{a.type}</div>
              <div className="font-mono">{a.balanceLabel}</div>
              <div className="font-mono text-fg-3">{a.creditLimitLabel}</div>
              <div className="font-mono text-12">{a.a030Label}</div>
              <div className="font-mono text-12 text-res-tentative">{a.a3160Label}</div>
              <div className="font-mono text-12 text-room-ooo">{a.a60Label}</div>
              <div className="text-12 text-fg-3">{fmtDate(a.lastPayment)}</div>
            </button>
          ))}
        </div>
      </Card>

      {openId && (
        <>
          <div onClick={() => setOpenId(null)} className="fixed inset-0 z-20 bg-deepest/70 backdrop-blur-[6px]" />
          <div className="upx-scroll fixed right-0 top-0 bottom-0 z-30 flex w-[440px] max-w-[92vw] flex-col gap-4 overflow-y-auto border-l border-line bg-deep p-[22px] shadow-3">
            {!detail ? (
              <div className="text-13 text-fg-3">Loading…</div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display text-17 font-bold text-ice">{detail.account}</div>
                    <div className="mt-0.5 text-12 text-fg-3">{detail.type}</div>
                  </div>
                  <button onClick={() => setOpenId(null)} className="text-fg-3 hover:text-ice" aria-label="Close">
                    <X className="h-[18px] w-[18px]" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <Card className="p-3">
                    <div className="text-[11px] text-fg-3">Outstanding balance</div>
                    <div className="mt-0.5 font-mono text-16 font-bold">{detail.balanceLabel}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-[11px] text-fg-3">Credit limit</div>
                    <div className="mt-0.5 font-mono text-16 font-bold">{detail.creditLimitLabel}</div>
                  </Card>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  {[
                    ["0–30d", detail.a030Label],
                    ["31–60d", detail.a3160Label],
                    ["60d+", detail.a60Label],
                  ].map(([k, v]) => (
                    <Card key={k} className="p-2">
                      <div className="text-fg-3">{k}</div>
                      <div className="mt-0.5 font-mono text-12">{v}</div>
                    </Card>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPayOpen((v) => !v)}
                    className="flex-1 rounded-sm bg-accent-violet py-2 text-[12.5px] font-medium text-ice hover:bg-accent-violet-hi"
                  >
                    Record payment
                  </button>
                  <button
                    onClick={() => toast(`Statement emailed to ${detail.account}`, "success")}
                    className="flex-1 rounded-sm border border-line bg-fg-1/[0.06] py-2 text-[12.5px] hover:border-line-strong"
                  >
                    Send statement
                  </button>
                </div>

                {payOpen && (
                  <Card className="flex flex-col gap-2 p-3">
                    <Eyebrow>Record payment</Eyebrow>
                    <input
                      value={pay.amount}
                      onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))}
                      placeholder="Amount (IDR)"
                      inputMode="numeric"
                      className="rounded-sm border border-line bg-deep px-2.5 py-2 font-mono text-[12.5px] text-fg-1 outline-none focus:border-accent-violet"
                    />
                    <select
                      value={pay.method}
                      onChange={(e) => setPay((p) => ({ ...p, method: e.target.value }))}
                      className="rounded-sm border border-line bg-deep px-2.5 py-2 text-[12.5px] text-fg-2"
                    >
                      <option>Bank transfer</option>
                      <option>Cash</option>
                      <option>Cheque</option>
                      <option>Credit card</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={submitPayment}
                        className="flex-1 rounded-sm bg-accent-violet py-2 text-12 font-medium text-ice"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setPayOpen(false)}
                        className="flex-1 rounded-sm border border-line bg-fg-1/[0.06] py-2 text-12"
                      >
                        Cancel
                      </button>
                    </div>
                  </Card>
                )}

                <div>
                  <Eyebrow className="mb-2">Transaction history</Eyebrow>
                  {detail.transactions.map((tx) => (
                    <div
                      key={tx._id}
                      className="flex justify-between gap-2.5 border-b border-line-soft py-2.5 text-[12.5px] last:border-0"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="leading-snug">{tx.desc}</div>
                        <div className="text-[11px] text-fg-3">
                          {shortDate(tx.date)} · {tx.ref}
                        </div>
                      </div>
                      <div
                        className="whitespace-nowrap font-mono"
                        style={{ color: tx.credit ? "var(--accent-cyan)" : "var(--fg-1)" }}
                      >
                        {tx.amount}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
