"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Card, Eyebrow } from "@/components/upx/primitives";
import { useProperty } from "@/components/providers/PropertyProvider";
import { buildBills, STATUS_COLOR } from "./data";

type Tab = "bills" | "runs" | "vendors";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const runDate = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const rp = (n: number) => `Rp ${n.toLocaleString("en-US")}`;

const RUN_SPECS = [
  { offset: -3, billCount: "6", total: "Rp 74,200,000", method: "Bank transfer — BCA", status: "Completed", color: "var(--accent-cyan)" },
  { offset: -17, billCount: "4", total: "Rp 38,900,000", method: "Bank transfer — BCA", status: "Completed", color: "var(--accent-cyan)" },
  { offset: -31, billCount: "5", total: "Rp 51,400,000", method: "Bank transfer + cheque", status: "Completed", color: "var(--accent-cyan)" },
];
const VENDORS = [
  { name: "PLN (electricity)", category: "Utilities", contact: "billing@pln.co.id", terms: "Net 14", bank: "BNI ****4821", openBalance: "Rp 12,400,000" },
  { name: "Bali Fresh Produce", category: "F&B supplies", contact: "+62 361 555 210", terms: "Net 14", bank: "BCA ****9930", openBalance: "Rp 8,900,000" },
  { name: "PT Sanitasi Jaya", category: "Maintenance", contact: "admin@sanitasijaya.id", terms: "Net 14", bank: "Mandiri ****1177", openBalance: "Rp 21,600,000" },
  { name: "Expedia Group", category: "OTA commission", contact: "partner-finance@expedia.com", terms: "Net 30", bank: "Netted from payout", openBalance: "Rp 0" },
  { name: "PT Kolam Sehat", category: "Maintenance", contact: "+62 812 340 990", terms: "Net 7", bank: "BCA ****3305", openBalance: "Rp 2,100,000" },
  { name: "Sri Rejeki Laundry", category: "Housekeeping", contact: "+62 361 555 884", terms: "Net 14", bank: "BRI ****6642", openBalance: "Rp 4,700,000" },
];

const BILL_GRID = "grid grid-cols-[1.2fr_1fr_0.9fr_0.9fr_0.9fr_0.9fr_1fr] gap-2.5 px-4";

export default function AccountsPayablePage() {
  const { activeProperty } = useProperty();
  const businessDate = activeProperty?.businessDate ?? "2026-09-08";
  const BILLS = useMemo(() => buildBills(businessDate), [businessDate]);
  const RUNS = RUN_SPECS.map((r) => ({ ...r, date: runDate(businessDate, r.offset) }));

  const [tab, setTab] = useState<Tab>("bills");

  const unpaid = BILLS.filter((b) => b.status !== "Paid");
  const weekEndIso = (() => {
    const d = new Date(businessDate + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString().slice(0, 10);
  })();
  const totalPayable = unpaid.reduce((s, b) => s + b.amountValue, 0);
  const overdueTotal = BILLS.filter((b) => b.status === "Overdue").reduce(
    (s, b) => s + b.amountValue,
    0
  );
  const dueThisWeek = unpaid
    .filter((b) => b.dueIso >= businessDate && b.dueIso <= weekEndIso)
    .reduce((s, b) => s + b.amountValue, 0);
  const pendingCount = BILLS.filter((b) => b.status === "Pending approval").length;

  return (
    <div className="mx-auto max-w-content">
      <div className="mb-3.5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total payable", value: rp(totalPayable), tone: "", border: "line" },
          { label: "Overdue", value: rp(overdueTotal), tone: "rose", border: "room-ooo" },
          { label: "Due this week", value: rp(dueThisWeek), tone: "", border: "line" },
          { label: "Pending approval", value: String(pendingCount), tone: "amber", border: "line" },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-lg border bg-elevated p-3.5"
            style={{ borderColor: m.border === "room-ooo" ? "var(--room-ooo)" : "var(--line)" }}
          >
            <div className="text-[11px] text-fg-3">{m.label}</div>
            <div
              className={`mt-1 font-mono text-19 font-bold ${
                m.tone === "rose" ? "text-room-ooo" : m.tone === "amber" ? "text-res-tentative" : ""
              }`}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>

      <Card className="mb-3.5 p-3.5">
        <Eyebrow className="mb-2">Aging summary</Eyebrow>
        <div className="mb-2 flex h-2.5 overflow-hidden rounded-pill">
          <div style={{ width: "45%", background: "var(--accent-cyan)" }} />
          <div style={{ width: "18%", background: "var(--res-tentative)" }} />
          <div style={{ width: "37%", background: "var(--room-ooo)" }} />
        </div>
        <div className="flex gap-4 text-[11.5px] text-fg-3">
          <span>
            <span className="text-accent-cyan">●</span> Current — Rp 26,100,000
          </span>
          <span>
            <span className="text-res-tentative">●</span> 31–60d — Rp 10,400,000
          </span>
          <span>
            <span className="text-room-ooo">●</span> 60d+ — Rp 21,600,000
          </span>
        </div>
      </Card>

      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        {(
          [
            ["bills", "Bills"],
            ["runs", "Payment runs"],
            ["vendors", "Vendors"],
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
        <button className="ml-auto rounded-sm bg-accent-violet px-3.5 py-2 text-[12.5px] font-medium text-ice hover:bg-accent-violet-hi">
          + New bill
        </button>
      </div>

      {tab === "bills" && (
        <Card className="overflow-x-auto p-0">
          <div className="min-w-[900px]">
            <div className={`${BILL_GRID} border-b border-line py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3`}>
              <div>Vendor</div>
              <div>Bill no.</div>
              <div>Category</div>
              <div>Issued</div>
              <div>Due</div>
              <div>Amount</div>
              <div>Status</div>
            </div>
            {BILLS.map((b) => (
              <Link
                key={b.id}
                href={`/finance/accounts-payable/${b.id}`}
                className={`${BILL_GRID} items-center border-b border-line-soft py-3 text-13 transition-colors last:border-0 hover:bg-elevated`}
              >
                <div className="font-semibold">{b.vendor}</div>
                <div className="font-mono text-12 text-fg-3">{b.billNo}</div>
                <div className="text-12 text-fg-3">{b.category}</div>
                <div className="text-12">{b.issued}</div>
                <div className="text-12">{b.due}</div>
                <div className="font-mono">{b.amount}</div>
                <div className="text-[11.5px] font-semibold" style={{ color: STATUS_COLOR[b.status] }}>
                  {b.status}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {tab === "runs" && (
        <>
          <Card className="overflow-hidden p-0">
            <div className="grid grid-cols-[1fr_0.8fr_1fr_1.3fr_1fr] border-b border-line px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3">
              <div>Run date</div>
              <div>Bills</div>
              <div>Total</div>
              <div>Method</div>
              <div>Status</div>
            </div>
            {RUNS.map((r) => (
              <div
                key={r.date}
                className="grid grid-cols-[1fr_0.8fr_1fr_1.3fr_1fr] items-center border-b border-line-soft px-4 py-3 text-13 last:border-0"
              >
                <div className="font-semibold">{r.date}</div>
                <div className="font-mono text-12">{r.billCount}</div>
                <div className="font-mono">{r.total}</div>
                <div className="text-12 text-fg-3">{r.method}</div>
                <div className="text-[11.5px] font-semibold" style={{ color: r.color }}>
                  {r.status}
                </div>
              </div>
            ))}
          </Card>
          <div className="mt-2.5 text-11 text-fg-3">
            Select approved bills in the Bills tab to create a new payment run.
          </div>
        </>
      )}

      {tab === "vendors" && (
        <Card className="overflow-x-auto p-0">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[1.2fr_0.9fr_1fr_0.8fr_1fr_0.9fr] border-b border-line px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3">
              <div>Vendor</div>
              <div>Category</div>
              <div>Contact</div>
              <div>Terms</div>
              <div>Bank info</div>
              <div>Open balance</div>
            </div>
            {VENDORS.map((v) => (
              <div
                key={v.name}
                className="grid grid-cols-[1.2fr_0.9fr_1fr_0.8fr_1fr_0.9fr] items-center border-b border-line-soft px-4 py-3 text-13 last:border-0"
              >
                <div className="font-semibold">{v.name}</div>
                <div className="text-12 text-fg-3">{v.category}</div>
                <div className="text-12">{v.contact}</div>
                <div className="text-12">{v.terms}</div>
                <div className="font-mono text-[11.5px] text-fg-3">{v.bank}</div>
                <div className="font-mono text-[12.5px] font-semibold">{v.openBalance}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
