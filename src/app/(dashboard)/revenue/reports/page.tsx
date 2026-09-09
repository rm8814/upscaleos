"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Clock, FileSpreadsheet, FileText } from "lucide-react";
import { Card } from "@/components/upx/primitives";
import { useProperty } from "@/components/providers/PropertyProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { downloadCsv } from "@/lib/csv";
import PmsDateChip from "@/components/common/PmsDateChip";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dm = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]}`;
};
const wk = (iso: string) => {
  const a = new Date(iso + "T00:00:00Z");
  const b = new Date(iso + "T00:00:00Z");
  b.setUTCDate(b.getUTCDate() + 6);
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[a.getUTCMonth()]}`
    : `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
};

type ReportTab = "pace" | "pickup" | "source" | "roomType" | "forecast" | "monthly";
const TABS: { id: ReportTab; label: string }[] = [
  { id: "pace", label: "Booking pace" },
  { id: "pickup", label: "Pickup" },
  { id: "source", label: "By source" },
  { id: "roomType", label: "By room type" },
  { id: "forecast", label: "Forecast" },
  { id: "monthly", label: "Month to date" },
];

type Table = { cols: string[]; rows: string[][]; note?: string };
type Reports = NonNullable<ReturnType<typeof useReports>>;

function useReports() {
  const { activeProperty } = useProperty();
  return useQuery(
    api.reports.getReports,
    activeProperty ? { propertyId: activeProperty._id } : "skip"
  );
}

function tableFor(tab: ReportTab, d: Reports): Table {
  switch (tab) {
    case "pace":
      return {
        cols: ["Stay date", "OTB rooms", "Occ %", "ADR", "Revenue OTB"],
        rows: d.pace.map((r) => [
          dm(r.date),
          String(r.rooms),
          `${r.occPct}%`,
          r.adr,
          r.revenue,
        ]),
      };
    case "pickup":
      return {
        cols: ["Stay date", "On the books", "Δ since last audit", "Revenue OTB"],
        rows: d.pickup.map((r) => [
          dm(r.date),
          String(r.onBooks),
          `${r.added >= 0 ? "+" : ""}${r.added}`,
          r.revenue,
        ]),
        note: d.pickupAsOf
          ? `Pickup measured against the snapshot taken on ${dm(d.pickupAsOf)}.`
          : "No pickup history yet — it builds after each night audit.",
      };
    case "source":
      return {
        cols: [
          "Source",
          "Rooms",
          "Room-nights",
          "ADR",
          "Revenue OTB",
          "Commission",
          "Net revenue",
        ],
        rows: d.bySource.map((r) => [
          r.source,
          String(r.rooms),
          String(r.roomNights),
          r.adr,
          r.revenue,
          r.commission,
          r.netRevenue,
        ]),
        note: "On-the-books production for the next 30 nights. Commission from configured channel terms.",
      };
    case "roomType":
      return {
        cols: ["Room type", "Sold", "Occ %", "ADR", "RevPAR", "Revenue"],
        rows: d.byRoomType.map((r) => [
          r.roomType,
          String(r.sold),
          `${r.occPct}%`,
          r.adr,
          r.revpar,
          r.revenue,
        ]),
        note: "Room-nights on the books over the next 30 nights.",
      };
    case "forecast":
      return {
        cols: ["Week", "OTB occ", "OTB ADR", "OTB RevPAR", "Room-nights"],
        rows: d.forecast.map((r) => [
          wk(r.weekStart),
          `${r.occPct}%`,
          r.adr,
          r.revpar,
          String(r.roomNights),
        ]),
        note: "On-the-books only — no pickup projection applied.",
      };
    default:
      return { cols: [], rows: [] };
  }
}

export default function ReportsPage() {
  const { activeProperty } = useProperty();
  const toast = useToast();
  const data = useReports();
  const businessDate = activeProperty?.businessDate ?? "2026-09-08";
  const [tab, setTab] = useState<ReportTab>("pace");

  const table = useMemo(
    () => (data && tab !== "monthly" ? tableFor(tab, data) : null),
    [data, tab]
  );

  const exportCsv = () => {
    if (!table) {
      toast("Switch to a table tab to export");
      return;
    }
    downloadCsv(
      `report-${tab}-${businessDate}.csv`,
      table.rows.map((r) =>
        Object.fromEntries(table.cols.map((c, i) => [c, r[i]]))
      )
    );
  };

  return (
    <div className="mx-auto max-w-content">
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-sm border px-3 py-1.5 text-[12.5px] transition-colors ${
                tab === t.id
                  ? "border-accent-violet bg-violet-wash text-ice"
                  : "border-line bg-elevated text-fg-2 hover:border-line-strong"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <PmsDateChip className="ml-auto" />
        <button
          onClick={() => toast("Report scheduled — emailed daily at 07:00", "success")}
          className="flex items-center gap-1.5 rounded-sm border border-line bg-fg-1/[0.06] px-3 py-2 text-12 text-fg-1 hover:border-line-strong"
        >
          <Clock className="h-[13px] w-[13px]" /> Schedule
        </button>
      </div>

      {tab !== "monthly" && (
        <>
          <div className="mb-3.5 flex flex-wrap items-center gap-2">
            {table?.note && (
              <span className="text-[11.5px] text-fg-3">{table.note}</span>
            )}
            <div className="ml-auto flex gap-2">
              <button
                onClick={exportCsv}
                className="flex items-center gap-1.5 rounded-sm bg-accent-violet px-3.5 py-2 text-12 font-medium text-ice hover:bg-accent-violet-hi"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
              </button>
              <button
                onClick={() => toast("PDF export isn’t available in this preview")}
                className="flex items-center gap-1.5 rounded-sm border border-line bg-fg-1/[0.06] px-3.5 py-2 text-12 text-fg-1 hover:border-line-strong"
              >
                <FileText className="h-3.5 w-3.5" /> PDF
              </button>
            </div>
          </div>

          <Card className="overflow-x-auto p-0">
            {!table ? (
              <div className="px-4 py-8 text-13 text-fg-3">Loading…</div>
            ) : table.rows.length === 0 ? (
              <div className="px-4 py-8 text-13 text-fg-3">No data yet.</div>
            ) : (
              <div className="min-w-[760px]">
                <div
                  className="grid border-b border-line px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3"
                  style={{ gridTemplateColumns: `repeat(${table.cols.length}, 1fr)` }}
                >
                  {table.cols.map((c) => (
                    <div key={c}>{c}</div>
                  ))}
                </div>
                {table.rows.map((row, i) => (
                  <div
                    key={i}
                    className="grid items-center border-b border-line-soft px-4 py-2.5 font-mono text-[12.5px] text-fg-2 last:border-0 hover:bg-elevated"
                    style={{ gridTemplateColumns: `repeat(${table.cols.length}, 1fr)` }}
                  >
                    {row.map((cell, j) => (
                      <div key={j}>{cell}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {tab === "monthly" && (
        <>
          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            {[
              { label: "MTD room revenue", value: data?.monthly.revenue ?? "—" },
              { label: "MTD occupancy", value: data ? `${data.monthly.occPct}%` : "—" },
              { label: "MTD RevPAR", value: data?.monthly.revpar ?? "—" },
            ].map((m) => (
              <Card key={m.label} className="p-4">
                <div className="text-[11px] uppercase tracking-[0.08em] text-fg-3">
                  {m.label}
                </div>
                <div className="mt-1.5 font-mono text-22 font-semibold text-ice">
                  {m.value}
                </div>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            {[
              { label: "Closed business days", value: data ? String(data.monthly.closedDays) : "—" },
              { label: "Room-nights sold", value: data ? String(data.monthly.roomsSold) : "—" },
              { label: "ADR", value: data?.monthly.adr ?? "—" },
              { label: "Cancellations / no-shows", value: data ? String(data.monthly.cancellations) : "—" },
            ].map((m) => (
              <Card key={m.label} className="p-3.5">
                <div className="text-[11px] uppercase tracking-[0.08em] text-fg-3">
                  {m.label}
                </div>
                <div className="mt-1 font-mono text-17 font-semibold">{m.value}</div>
              </Card>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-fg-3">
            Month to date is built from the night-audit history (daily_stats).
            Run the audit each day to accrue it.
          </p>
        </>
      )}
    </div>
  );
}
