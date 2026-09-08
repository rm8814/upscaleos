"use client";

import React, { useState } from "react";
import { Card, Eyebrow } from "@/components/upx/primitives";

type Tab = "till" | "txns" | "recon";

const TXNS = [
  { time: "14:22", guest: "Kadek Surya — RSV-8DZ7K6", ref: "Folio 204", method: "QRIS / e-wallet", amount: "Rp 1,240,000", voided: false },
  { time: "13:05", guest: "Walk-in — spa treatment", ref: "Counter sale", method: "Cash", amount: "Rp 450,000", voided: false },
  { time: "12:40", guest: "Emma Thompson — RSV-8DYNT2", ref: "Folio 301", method: "Credit/debit card", amount: "Rp 890,000", voided: false },
  { time: "11:18", guest: "Michael Chen — RSV-8DZFQH", ref: "Folio 201", method: "Cash", amount: "Rp 620,000", voided: true },
  { time: "09:52", guest: "City ledger — Accor Global", ref: "Group folio", method: "City ledger", amount: "Rp 3,100,000", voided: false },
];

const SHIFT_LOG = [
  { cashier: "Amira K.", date: "3 Sep", shift: "07:00–15:00", expected: "Rp 8,240,000", counted: "Rp 8,240,000", variance: "Rp 0", status: "Balanced", color: "var(--accent-cyan)", handoverTo: "Rangga P." },
  { cashier: "Rangga P.", date: "3 Sep", shift: "15:00–23:00", expected: "Rp 6,910,000", counted: "Rp 6,885,000", variance: "− Rp 25,000", status: "Short", color: "var(--res-tentative)", handoverTo: "Night audit" },
  { cashier: "Amira K.", date: "2 Sep", shift: "07:00–15:00", expected: "Rp 7,500,000", counted: "Rp 7,520,000", variance: "+ Rp 20,000", status: "Over", color: "var(--res-tentative)", handoverTo: "Rangga P." },
];

const DENOMS = ["100,000", "50,000", "20,000", "10,000", "5,000", "2,000", "1,000"];

const TXN_GRID = "grid grid-cols-[0.7fr_1.4fr_1fr_0.9fr_0.6fr] gap-2.5 px-4";

export default function CashierPage() {
  const [tab, setTab] = useState<Tab>("till");
  const [closeOpen, setCloseOpen] = useState(false);

  return (
    <div className="mx-auto max-w-content">
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <select className="rounded-sm border border-line bg-elevated px-2.5 py-2 text-[12.5px] text-fg-1">
          <option>Front desk — Drawer 1</option>
          <option>Front desk — Drawer 2</option>
          <option>Concierge — Drawer 3</option>
        </select>
        <span className="text-[11.5px] text-fg-3">Business date 4 Sep 2026 · GMT+8</span>
      </div>

      <div className="mb-3.5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Shift status", value: "Open", tone: "cyan" },
          { label: "Opening float", value: "Rp 2,000,000", tone: "" },
          { label: "Cash collected", value: "Rp 1,520,000", tone: "" },
          { label: "Expected in drawer", value: "Rp 3,520,000", tone: "" },
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
              <select className="rounded-sm border border-line bg-deep px-2.5 py-2.5 text-[12.5px] text-fg-2">
                <option value="">Select folio / reservation…</option>
                <option>Folio 204 · Kadek Surya</option>
                <option>Folio 301 · Emma Thompson</option>
                <option>Walk-in / other</option>
              </select>
              <input
                placeholder="Amount (IDR)"
                className="rounded-sm border border-line bg-deep px-2.5 py-2.5 font-mono text-[12.5px] text-fg-1 outline-none"
              />
              <select className="rounded-sm border border-line bg-deep px-2.5 py-2.5 text-[12.5px] text-fg-2">
                <option>Cash</option>
                <option>Credit/debit card</option>
                <option>QRIS / e-wallet</option>
                <option>Bank transfer</option>
                <option>City ledger</option>
                <option>Voucher/gift card</option>
              </select>
              <button className="rounded-sm bg-accent-violet py-2.5 text-[12.5px] font-medium text-ice hover:bg-accent-violet-hi">
                Record payment
              </button>
            </div>
          </Card>

          <div className="flex flex-col gap-2.5">
            <Card className="p-4">
              <div className="mb-2.5 text-[12.5px] text-fg-2">
                Opened by Amira K. at 07:02.
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
                  <span>Counted total</span>
                  <span className="font-mono font-bold">Rp 3,495,000</span>
                </div>
                <div className="mt-1 flex justify-between text-[12.5px]">
                  <span>Variance</span>
                  <span className="font-mono font-bold text-res-tentative">− Rp 25,000</span>
                </div>
                <button className="mt-3 w-full rounded-sm bg-accent-violet py-2.5 text-[12.5px] font-medium text-ice">
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
              <div>Time</div>
              <div>Guest / reference</div>
              <div>Method</div>
              <div>Amount</div>
              <div />
            </div>
            {TXNS.map((t) => (
              <div
                key={t.time + t.guest}
                className={`${TXN_GRID} items-center border-b border-line-soft py-3 text-13 last:border-0`}
              >
                <div className="font-mono text-12 text-fg-3">{t.time}</div>
                <div>
                  <div className={`font-semibold ${t.voided ? "text-fg-3 line-through" : ""}`}>
                    {t.guest}
                  </div>
                  <div className="text-[11px] text-fg-3">{t.ref}</div>
                </div>
                <div className="text-12 text-fg-3">{t.method}</div>
                <div className={`font-mono ${t.voided ? "text-fg-3 line-through" : ""}`}>
                  {t.amount}
                </div>
                <div>
                  {t.voided ? (
                    <span className="text-[11px] font-semibold text-room-ooo">Voided</span>
                  ) : (
                    <button className="rounded-sm border border-line px-2 py-1 text-[11px] text-fg-3">
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
