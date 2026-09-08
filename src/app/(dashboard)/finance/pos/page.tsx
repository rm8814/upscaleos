"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AlertTriangle, FileSpreadsheet, ExternalLink } from "lucide-react";
import { Card, Eyebrow } from "@/components/upx/primitives";
import { useProperty } from "@/components/providers/PropertyProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { downloadCsv } from "@/lib/csv";

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("en-US")}`;

const OUTLETS = [
  { name: "Ombak Restaurant", type: "All-day dining", status: "Online", color: "var(--accent-cyan)", revenue: "Rp 14,200,000", postings: 62, sync: "2m ago" },
  { name: "Cliff Bar", type: "Bar & lounge", status: "Online", color: "var(--accent-cyan)", revenue: "Rp 8,900,000", postings: 41, sync: "1m ago" },
  { name: "Spa Samudra", type: "Wellness", status: "Online", color: "var(--accent-cyan)", revenue: "Rp 6,400,000", postings: 12, sync: "6m ago" },
  { name: "Pool Snacks", type: "Kiosk", status: "Offline", color: "var(--room-ooo)", revenue: "Rp 0", postings: 0, sync: "3h ago" },
];
const ALERTS = [
  "Pool Snacks terminal offline for 3h — 0 postings today.",
  "Ombak Restaurant — Rp 380,000 posting unmatched to any folio.",
];
const CATEGORY_MIX = [
  { label: "Food", pct: "54%", amount: "Rp 16,000,000" },
  { label: "Beverage", pct: "31%", amount: "Rp 9,200,000" },
  { label: "Spa", pct: "10%", amount: "Rp 3,000,000" },
  { label: "Retail", pct: "5%", amount: "Rp 1,300,000" },
];
const PAYMENT_MIX = [
  { label: "Charge to room", pct: "48%", amount: "Rp 14,200,000" },
  { label: "QRIS / e-wallet", pct: "27%", amount: "Rp 8,000,000" },
  { label: "Card", pct: "16%", amount: "Rp 4,700,000" },
  { label: "Cash", pct: "9%", amount: "Rp 2,600,000" },
];
const HOURS = [1, 1, 0, 0, 0, 1, 2, 4, 6, 5, 4, 7, 9, 6, 4, 3, 4, 6, 8, 9, 7, 5, 3, 2];
const TOP_ITEMS = [
  { name: "Nasi Goreng Samudra", qty: 34, revenue: "Rp 2,380,000" },
  { name: "Fresh coconut", qty: 51, revenue: "Rp 1,530,000" },
  { name: "Grilled snapper", qty: 18, revenue: "Rp 3,240,000" },
  { name: "Signature spa ritual", qty: 6, revenue: "Rp 4,200,000" },
];
const STAFF = [
  { name: "Wayan S.", outlet: "Ombak Restaurant", sales: "Rp 6,900,000" },
  { name: "Komang A.", outlet: "Cliff Bar", sales: "Rp 5,100,000" },
  { name: "Luh D.", outlet: "Spa Samudra", sales: "Rp 4,400,000" },
];
function Bars({ rows, color }: { rows: { label: string; pct: string; amount: string }[]; color: string }) {
  return (
    <>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2.5 py-1.5">
          <span className="w-[100px] text-[12.5px] text-fg-2">{r.label}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-deep">
            <span className="block h-full" style={{ width: r.pct, background: color }} />
          </span>
          <span className="w-[110px] text-right font-mono text-12 text-fg-3">{r.amount}</span>
        </div>
      ))}
    </>
  );
}

export default function PosDashboardPage() {
  const { activeProperty } = useProperty();
  const toast = useToast();
  const businessDate = activeProperty?.businessDate ?? "2026-09-08";
  const max = Math.max(...HOURS);

  const openFolios = useQuery(
    api.folios.listOpen,
    activeProperty ? { propertyId: activeProperty._id } : "skip"
  );
  const fnbLines = useQuery(
    api.folios.listLinesByKind,
    activeProperty
      ? { propertyId: activeProperty._id, kind: "fnb" }
      : "skip"
  );
  const postCharge = useMutation(api.folios.postCharge);

  const [outlet, setOutlet] = useState(OUTLETS[0].name);
  const [resId, setResId] = useState("");
  const [amt, setAmt] = useState("");
  const [item, setItem] = useState("");
  const [busy, setBusy] = useState(false);

  const charge = async () => {
    const n = Number(amt.replace(/[^\d]/g, ""));
    if (!resId || !n) {
      toast("Pick a room folio and enter an amount", "error");
      return;
    }
    setBusy(true);
    try {
      await postCharge({
        reservationId: resId as Id<"reservations">,
        amount: n,
        kind: "fnb",
        description: `${outlet}${item ? ` — ${item}` : ""}`,
        source: outlet,
        businessDate,
      });
      toast(`${rp(n)} charged to room — ${outlet}`, "success");
      setAmt("");
      setItem("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not post charge", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-content">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          key={businessDate}
          type="date"
          defaultValue={businessDate}
          className="rounded-sm border border-line bg-elevated px-2.5 py-1.5 font-mono text-12 text-fg-2"
        />
        <select className="rounded-sm border border-line bg-elevated px-2.5 py-2 text-12 text-fg-2">
          <option>All outlets</option>
          {OUTLETS.map((o) => (
            <option key={o.name}>{o.name}</option>
          ))}
        </select>
        <Link
          href="/pos"
          target="_blank"
          className="ml-auto flex items-center gap-1.5 rounded-sm border border-line bg-fg-1/[0.06] px-3 py-2 text-12 text-fg-1 hover:border-line-strong"
        >
          <ExternalLink className="h-[13px] w-[13px]" /> Open guest terminal
        </Link>
        <button
          onClick={() =>
            downloadCsv(
              `pos-outlets-${businessDate}.csv`,
              OUTLETS.map((o) => ({
                outlet: o.name,
                type: o.type,
                status: o.status,
                revenue: o.revenue,
                postings: o.postings,
                lastSync: o.sync,
              }))
            )
          }
          className="flex items-center gap-1.5 rounded-sm bg-accent-violet px-3.5 py-2 text-12 font-medium text-ice hover:bg-accent-violet-hi"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-1.5 rounded-lg border border-res-tentative bg-elevated p-3.5">
        <Eyebrow>Discrepancy alerts</Eyebrow>
        {ALERTS.map((a) => (
          <div key={a} className="flex items-start gap-2 text-[12.5px]">
            <AlertTriangle className="mt-px h-[13px] w-[13px] flex-none text-res-tentative" /> {a}
          </div>
        ))}
      </div>

      <Card className="mb-5 p-4">
        <Eyebrow className="mb-2.5">Charge to room</Eyebrow>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr_1.4fr_1fr_1fr_auto]">
          <select
            value={outlet}
            onChange={(e) => setOutlet(e.target.value)}
            className="rounded-sm border border-line bg-deep px-2.5 py-2 text-[12.5px] text-fg-2"
          >
            {OUTLETS.map((o) => (
              <option key={o.name}>{o.name}</option>
            ))}
          </select>
          <select
            value={resId}
            onChange={(e) => setResId(e.target.value)}
            className="rounded-sm border border-line bg-deep px-2.5 py-2 text-[12.5px] text-fg-2"
          >
            <option value="">Select room folio…</option>
            {(openFolios ?? []).map((f) => (
              <option key={f.folioId} value={f.reservationId}>
                {f.roomNumber ? `Room ${f.roomNumber}` : "Unassigned"} · {f.guestName}
              </option>
            ))}
          </select>
          <input
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="Item (optional)"
            className="rounded-sm border border-line bg-deep px-2.5 py-2 text-[12.5px] text-fg-1 outline-none focus:border-accent-violet"
          />
          <input
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
            placeholder="Amount (IDR)"
            inputMode="numeric"
            className="rounded-sm border border-line bg-deep px-2.5 py-2 font-mono text-[12.5px] text-fg-1 outline-none focus:border-accent-violet"
          />
          <button
            disabled={busy}
            onClick={charge}
            className="rounded-sm bg-accent-violet px-4 py-2 text-[12.5px] font-medium text-ice hover:bg-accent-violet-hi disabled:opacity-40"
          >
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
        {openFolios && openFolios.length === 0 && (
          <div className="mt-2 text-[11px] text-fg-3">
            No open folios to charge — check a guest in first.
          </div>
        )}
      </Card>

      <Eyebrow className="mb-2.5">Connected outlets</Eyebrow>
      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {OUTLETS.map((o) => (
          <Card key={o.name} className="flex flex-col gap-1.5 p-3.5">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-pill" style={{ background: o.color }} />
              <span className="text-[11px] text-fg-3">{o.status}</span>
            </div>
            <div className="text-14 font-semibold">{o.name}</div>
            <div className="text-[11px] text-fg-3">{o.type}</div>
            <div className="mt-1 font-mono text-13">{o.revenue}</div>
            <div className="text-[11px] text-fg-3">
              {o.postings} postings · synced {o.sync}
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <Card className="p-4">
          <Eyebrow className="mb-2.5">Sales by category</Eyebrow>
          <Bars rows={CATEGORY_MIX} color="var(--accent-violet)" />
        </Card>
        <Card className="p-4">
          <Eyebrow className="mb-2.5">Payment method</Eyebrow>
          <Bars rows={PAYMENT_MIX} color="var(--accent-cyan)" />
        </Card>
      </div>

      <Card className="mb-5 p-4">
        <Eyebrow className="mb-2.5">Sales by hour · 24h</Eyebrow>
        <div className="flex h-20 items-end gap-[3px]">
          {HOURS.map((h, i) => (
            <div key={i} className="flex-1">
              <div
                className="w-full rounded-t-[2px] bg-accent-violet"
                style={{ height: `${(h / max) * 100}%`, minHeight: 2 }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-[3px]">
          {HOURS.map((_, i) => (
            <div key={i} className="flex-1 text-center font-mono text-[9px] text-fg-3">
              {i % 4 === 0 ? i : ""}
            </div>
          ))}
        </div>
      </Card>

      <div className="mb-5 grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <Card className="p-4">
          <Eyebrow className="mb-2.5">Top-selling items</Eyebrow>
          {TOP_ITEMS.map((t) => (
            <div
              key={t.name}
              className="flex justify-between border-b border-line-soft py-2 text-[12.5px] last:border-0"
            >
              <div className="flex-1">{t.name}</div>
              <div className="w-[50px] text-right text-fg-3">{t.qty}x</div>
              <div className="w-[110px] text-right font-mono">{t.revenue}</div>
            </div>
          ))}
        </Card>
        <Card className="p-4">
          <Eyebrow className="mb-2.5">Staff performance</Eyebrow>
          {STAFF.map((s) => (
            <div
              key={s.name}
              className="flex justify-between border-b border-line-soft py-2 text-[12.5px] last:border-0"
            >
              <div className="flex-1">
                <div className="font-medium">{s.name}</div>
                <div className="text-[11px] text-fg-3">{s.outlet}</div>
              </div>
              <div className="text-right font-mono">{s.sales}</div>
            </div>
          ))}
        </Card>
      </div>

      <Eyebrow className="mb-2.5">Recent postings to folio</Eyebrow>
      <Card className="overflow-x-auto p-0">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[0.9fr_1.4fr_0.8fr_1.4fr_1fr_0.9fr] border-b border-line px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3">
            <div>Date</div>
            <div>Outlet</div>
            <div>Room</div>
            <div>Guest</div>
            <div>Amount</div>
            <div>Folio</div>
          </div>
          {fnbLines === undefined && (
            <div className="px-4 py-6 text-13 text-fg-3">Loading…</div>
          )}
          {fnbLines && fnbLines.length === 0 && (
            <div className="px-4 py-6 text-13 text-fg-3">
              No room charges posted yet — use “Charge to room” above.
            </div>
          )}
          {(fnbLines ?? []).map((p) => (
            <div
              key={p._id}
              className="grid grid-cols-[0.9fr_1.4fr_0.8fr_1.4fr_1fr_0.9fr] items-center border-b border-line-soft px-4 py-2.5 text-13 last:border-0"
            >
              <div className="font-mono text-fg-3">{p.date}</div>
              <div>{p.source ?? p.description}</div>
              <div className="font-mono">{p.roomNumber ?? "—"}</div>
              <div className="text-fg-2">{p.guestName}</div>
              <div className={`font-mono ${p.voided ? "text-fg-3 line-through" : ""}`}>
                {p.amountLabel}
              </div>
              <div
                className="text-[11.5px]"
                style={{ color: p.voided ? "var(--room-ooo)" : "var(--accent-cyan)" }}
              >
                {p.voided ? "Voided" : "Posted"}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
