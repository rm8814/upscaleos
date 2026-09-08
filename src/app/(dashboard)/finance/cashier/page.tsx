"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, Eyebrow } from "@/components/upx/primitives";
import { useProperty } from "@/components/providers/PropertyProvider";
import { useToast } from "@/components/providers/ToastProvider";
import PmsDateChip from "@/components/common/PmsDateChip";

type Tab = "till" | "txns" | "recon";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shiftDay = (iso: string, back: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - back);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};
const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("en-US")}`;

const OPENING_FLOAT = 2_000_000;
const CASH_METHODS = new Set(["Cash"]);

const METHODS = [
  "Cash",
  "Credit/debit card",
  "QRIS / e-wallet",
  "Bank transfer",
  "City ledger",
  "Voucher/gift card",
];

const buildShiftLog = (businessDate: string) => [
  { cashier: "Amira K.", date: shiftDay(businessDate, 1), shift: "07:00–15:00", expected: "Rp 8,240,000", counted: "Rp 8,240,000", variance: "Rp 0", status: "Balanced", color: "var(--accent-cyan)", handoverTo: "Rangga P." },
  { cashier: "Rangga P.", date: shiftDay(businessDate, 1), shift: "15:00–23:00", expected: "Rp 6,910,000", counted: "Rp 6,885,000", variance: "− Rp 25,000", status: "Short", color: "var(--res-tentative)", handoverTo: "Night audit" },
  { cashier: "Amira K.", date: shiftDay(businessDate, 2), shift: "07:00–15:00", expected: "Rp 7,500,000", counted: "Rp 7,520,000", variance: "+ Rp 20,000", status: "Over", color: "var(--res-tentative)", handoverTo: "Rangga P." },
];

const DENOMS = ["100,000", "50,000", "20,000", "10,000", "5,000", "2,000", "1,000"];

const TXN_GRID = "grid grid-cols-[0.7fr_1.6fr_1.1fr_0.9fr_0.6fr] gap-2.5 px-4";

export default function CashierPage() {
  const { activeProperty } = useProperty();
  const businessDate = activeProperty?.businessDate ?? "2026-09-08";
  const propArg = activeProperty ? { propertyId: activeProperty._id } : "skip";

  const openFolios = useQuery(api.folios.listOpen, propArg);
  const payments = useQuery(
    api.folios.listLinesByKind,
    activeProperty
      ? { propertyId: activeProperty._id, kind: "payment" }
      : "skip"
  );
  const recordPayment = useMutation(api.folios.recordPayment);
  const voidLine = useMutation(api.folios.voidLine);

  const SHIFT_LOG = buildShiftLog(businessDate);
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("till");
  const [closeOpen, setCloseOpen] = useState(false);

  const [resId, setResId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<string>("Cash");
  const [busy, setBusy] = useState(false);

  const todaysPayments = useMemo(
    () => (payments ?? []).filter((p) => p.date === businessDate && !p.voided),
    [payments, businessDate]
  );
  const cashCollected = useMemo(
    () =>
      todaysPayments
        .filter((p) => CASH_METHODS.has(p.method ?? ""))
        .reduce((s, p) => s - p.amount, 0),
    [todaysPayments]
  );
  const totalCollected = useMemo(
    () => todaysPayments.reduce((s, p) => s - p.amount, 0),
    [todaysPayments]
  );

  const submitPayment = async () => {
    const amt = Number(amount.replace(/[^\d]/g, ""));
    if (!resId || !amt) {
      toast("Pick a folio and enter an amount", "error");
      return;
    }
    setBusy(true);
    try {
      await recordPayment({
        reservationId: resId as Id<"reservations">,
        amount: amt,
        method,
        businessDate,
      });
      toast(`${rp(amt)} recorded — ${method}`, "success");
      setAmount("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not record payment", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-content">
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <select className="rounded-sm border border-line bg-elevated px-2.5 py-2 text-[12.5px] text-fg-1">
          <option>Front desk — Drawer 1</option>
          <option>Front desk — Drawer 2</option>
          <option>Concierge — Drawer 3</option>
        </select>
        <PmsDateChip className="ml-1" />
      </div>

      <div className="mb-3.5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Shift status", value: "Open", tone: "cyan" },
          { label: "Opening float", value: rp(OPENING_FLOAT), tone: "" },
          { label: "Cash collected", value: rp(cashCollected), tone: "" },
          {
            label: "Expected in drawer",
            value: rp(OPENING_FLOAT + cashCollected),
            tone: "",
          },
        ].map((m) => (
          <Card key={m.label} className="p-3.5">
            <div className="text-[11px] text-fg-3">{m.label}</div>
            <div
              className={`mt-1 font-mono text-19 font-bold ${
                m.tone === "cyan" ? "text-accent-cyan" : ""
              }`}
            >
              {m.value}
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-3.5 flex flex-wrap gap-2">
        {(
          [
            ["till", "Till"],
            ["txns", "Transactions"],
            ["recon", "Reconciliation"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-sm border px-3 py-1.5 text-[12.5px] transition-colors ${
              tab === id
                ? "border-accent-violet bg-violet-wash text-ice"
                : "border-line bg-elevated text-fg-2 hover:border-line-strong"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "till" && (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Card className="p-[18px]">
            <Eyebrow className="mb-3">Take payment</Eyebrow>
            <div className="flex flex-col gap-2">
              <select
                value={resId}
                onChange={(e) => setResId(e.target.value)}
                className="rounded-sm border border-line bg-deep px-2.5 py-2.5 text-[12.5px] text-fg-2"
              >
                <option value="">Select folio / reservation…</option>
                {(openFolios ?? []).map((f) => (
                  <option key={f.folioId} value={f.reservationId}>
                    {f.roomNumber ? `Room ${f.roomNumber}` : "Unassigned"} ·{" "}
                    {f.guestName} · bal {f.balanceLabel}
                  </option>
                ))}
              </select>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount (IDR)"
                inputMode="numeric"
                className="rounded-sm border border-line bg-deep px-2.5 py-2.5 font-mono text-[12.5px] text-fg-1 outline-none focus:border-accent-violet"
              />
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="rounded-sm border border-line bg-deep px-2.5 py-2.5 text-[12.5px] text-fg-2"
              >
                {METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <button
                disabled={busy}
                onClick={submitPayment}
                className="rounded-sm bg-accent-violet py-2.5 text-[12.5px] font-medium text-ice hover:bg-accent-violet-hi disabled:opacity-40"
              >
                {busy ? "Recording…" : "Record payment"}
              </button>
              {openFolios && openFolios.length === 0 && (
                <div className="text-[11px] text-fg-3">
                  No open folios. Check a guest in to open one.
                </div>
              )}
            </div>
          </Card>

          <div className="flex flex-col gap-2.5">
            <Card className="p-4">
              <div className="mb-2.5 text-[12.5px] text-fg-2">
                Opened by Amira K. at 07:02 · {rp(totalCollected)} collected this
                shift.
              </div>
              <button
                onClick={() => setCloseOpen((v) => !v)}
                className="w-full rounded-sm border border-line bg-fg-1/[0.06] py-2.5 text-[12.5px] hover:border-line-strong"
              >
                Close shift &amp; count drawer
              </button>
            </Card>

            {closeOpen && (
              <Card className="p-4">
                <Eyebrow className="mb-2.5">Cash count</Eyebrow>
                {DENOMS.map((d) => (
                  <div key={d} className="mb-1.5 flex items-center gap-2">
                    <span className="w-20 font-mono text-12 text-fg-3">Rp {d}</span>
                    <input
                      placeholder="0"
                      className="flex-1 rounded-sm border border-line bg-deep px-2 py-1.5 font-mono text-12 text-fg-1 outline-none"
                    />
                  </div>
                ))}
                <div className="mt-2.5 flex justify-between border-t border-line-soft pt-2.5 text-[12.5px]">
                  <span>Expected total</span>
                  <span className="font-mono font-bold">
                    {rp(OPENING_FLOAT + cashCollected)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setCloseOpen(false);
                    toast("Shift closed and handed over", "success");
                  }}
                  className="mt-3 w-full rounded-sm bg-accent-violet py-2.5 text-[12.5px] font-medium text-ice"
                >
                  Confirm close &amp; hand over
                </button>
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === "txns" && (
        <Card className="overflow-x-auto p-0">
          <div className="min-w-[720px]">
            <div className={`${TXN_GRID} border-b border-line py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3`}>
              <div>Date</div>
              <div>Guest / reference</div>
              <div>Method</div>
              <div>Amount</div>
              <div />
            </div>
            {payments === undefined && (
              <div className="px-4 py-6 text-13 text-fg-3">Loading…</div>
            )}
            {payments && payments.length === 0 && (
              <div className="px-4 py-6 text-13 text-fg-3">
                No payments recorded yet.
              </div>
            )}
            {(payments ?? []).map((t) => (
              <div
                key={t._id}
                className={`${TXN_GRID} items-center border-b border-line-soft py-3 text-13 last:border-0`}
              >
                <div className="font-mono text-12 text-fg-3">{t.date}</div>
                <div>
                  <div className={`font-semibold ${t.voided ? "text-fg-3 line-through" : ""}`}>
                    {t.guestName}
                  </div>
                  <div className="text-[11px] text-fg-3">
                    {t.roomNumber ? `Room ${t.roomNumber}` : "—"}
                  </div>
                </div>
                <div className="text-12 text-fg-3">{t.method ?? "—"}</div>
                <div className={`font-mono ${t.voided ? "text-fg-3 line-through" : ""}`}>
                  {rp(-t.amount)}
                </div>
                <div>
                  {t.voided ? (
                    <span className="text-[11px] font-semibold text-room-ooo">Voided</span>
                  ) : (
                    <button
                      onClick={async () => {
                        await voidLine({ lineId: t._id });
                        toast(`Voided ${rp(-t.amount)} — ${t.guestName}`);
                      }}
                      className="rounded-sm border border-line px-2 py-1 text-[11px] text-fg-3 hover:text-ice"
                    >
                      Void
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "recon" && (
        <Card className="overflow-x-auto p-0">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[1.1fr_0.7fr_1.1fr_1fr_1fr_1fr_0.9fr_1fr] border-b border-line px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3">
              <div>Cashier</div>
              <div>Date</div>
              <div>Shift</div>
              <div>Expected</div>
              <div>Counted</div>
              <div>Variance</div>
              <div>Status</div>
              <div>Handover</div>
            </div>
            {SHIFT_LOG.map((s, i) => (
              <div
                key={i}
                className="grid grid-cols-[1.1fr_0.7fr_1.1fr_1fr_1fr_1fr_0.9fr_1fr] items-center border-b border-line-soft px-4 py-3 text-13 last:border-0"
              >
                <div className="font-semibold">{s.cashier}</div>
                <div className="text-12 text-fg-3">{s.date}</div>
                <div className="text-12">{s.shift}</div>
                <div className="font-mono text-12">{s.expected}</div>
                <div className="font-mono text-12">{s.counted}</div>
                <div className="font-mono text-12">{s.variance}</div>
                <div className="text-[11.5px] font-semibold" style={{ color: s.color }}>
                  {s.status}
                </div>
                <div className="text-[11.5px] text-fg-3">{s.handoverTo}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
