"use client";

import React, { useState } from "react";
import { Clock, FileSpreadsheet, FileText } from "lucide-react";
import { Card } from "@/components/upx/primitives";

type ReportTab = "pace" | "pickup" | "source" | "roomType" | "forecast" | "monthly";

const TABS: { id: ReportTab; label: string }[] = [
  { id: "pace", label: "Booking pace" },
  { id: "pickup", label: "Pickup" },
  { id: "source", label: "By source" },
  { id: "roomType", label: "By room type" },
  { id: "forecast", label: "Forecast" },
  { id: "monthly", label: "Monthly P&L" },
];

const TABLES: Record<Exclude<ReportTab, "monthly">, { cols: string[]; rows: string[][] }> = {
  pace: {
    cols: ["Stay date", "OTB rooms", "Pace vs. LY", "ADR", "Revenue OTB", "Pickup 7d"],
    rows: [
      ["12 Sep", "24", "+8%", "Rp 2,060,000", "Rp 49,400,000", "+6"],
      ["13 Sep", "27", "+14%", "Rp 2,310,000", "Rp 62,400,000", "+9"],
      ["14 Sep", "19", "−4%", "Rp 1,880,000", "Rp 35,700,000", "+2"],
      ["15 Sep", "22", "+3%", "Rp 1,970,000", "Rp 43,300,000", "+4"],
      ["16 Sep", "20", "−1%", "Rp 1,910,000", "Rp 38,200,000", "+3"],
      ["17 Sep", "25", "+11%", "Rp 2,140,000", "Rp 53,500,000", "+7"],
    ],
  },
  pickup: {
    cols: ["Date booked", "Rooms", "Room-nights", "ADR", "Revenue", "Cxl"],
    rows: [
      ["07 Sep", "11", "24", "Rp 2,020,000", "Rp 48,500,000", "1"],
      ["06 Sep", "9", "19", "Rp 1,960,000", "Rp 37,200,000", "0"],
      ["05 Sep", "13", "31", "Rp 2,110,000", "Rp 65,400,000", "2"],
      ["04 Sep", "7", "14", "Rp 1,880,000", "Rp 26,300,000", "1"],
      ["03 Sep", "10", "22", "Rp 2,040,000", "Rp 44,900,000", "0"],
    ],
  },
  source: {
    cols: ["Source", "Rooms", "Room-nights", "ADR", "Revenue", "Commission"],
    rows: [
      ["Direct", "68", "152", "Rp 2,180,000", "Rp 331,400,000", "Rp 0"],
      ["Booking.com", "62", "138", "Rp 2,040,000", "Rp 281,500,000", "Rp 42,200,000"],
      ["Agoda", "38", "84", "Rp 1,960,000", "Rp 164,600,000", "Rp 28,000,000"],
      ["Traveloka", "29", "61", "Rp 1,990,000", "Rp 121,400,000", "Rp 19,400,000"],
      ["Expedia", "21", "44", "Rp 1,920,000", "Rp 84,500,000", "Rp 15,200,000"],
    ],
  },
  roomType: {
    cols: ["Room type", "Sold", "Occ %", "ADR", "RevPAR", "Revenue"],
    rows: [
      ["Deluxe Twin", "142", "82%", "Rp 1,510,000", "Rp 1,240,000", "Rp 214,400,000"],
      ["Double Queen", "128", "76%", "Rp 1,920,000", "Rp 1,460,000", "Rp 245,800,000"],
      ["King Suite", "74", "71%", "Rp 2,710,000", "Rp 1,920,000", "Rp 200,500,000"],
      ["Presidential Suite", "18", "60%", "Rp 7,100,000", "Rp 4,260,000", "Rp 127,800,000"],
    ],
  },
  forecast: {
    cols: ["Week", "Fcst occ", "Fcst ADR", "Fcst RevPAR", "Confidence", "Delta vs. budget"],
    rows: [
      ["15–21 Sep", "79%", "Rp 2,080,000", "Rp 1,640,000", "High", "+4.2%"],
      ["22–28 Sep", "74%", "Rp 2,010,000", "Rp 1,490,000", "Medium", "+1.1%"],
      ["29 Sep–5 Oct", "68%", "Rp 1,940,000", "Rp 1,320,000", "Medium", "−2.4%"],
      ["6–12 Oct", "72%", "Rp 1,980,000", "Rp 1,430,000", "Low", "+0.3%"],
    ],
  },
};

const MONTHLY_METRICS = [
  { label: "Room-nights sold", value: "3,412" },
  { label: "ADR", value: "Rp 2,040,000" },
  { label: "Cancellations", value: "48" },
  { label: "Direct share", value: "39%" },
];

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>("pace");

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
        <div className="ml-auto flex gap-2">
          <button className="flex items-center gap-1.5 rounded-sm border border-line bg-fg-1/[0.06] px-3 py-2 text-12 text-fg-1 hover:border-line-strong">
            <Clock className="h-[13px] w-[13px]" /> Schedule
          </button>
        </div>
      </div>

      {tab !== "monthly" && (
        <>
          <div className="mb-3.5 flex flex-wrap items-center gap-2">
            <input
              type="date"
              defaultValue="2026-09-12"
              className="rounded-sm border border-line bg-deep px-2.5 py-1.5 font-mono text-12 text-fg-2"
            />
            <select className="rounded-sm border border-line bg-deep px-2.5 py-2 text-12 text-fg-2">
              <option>All sources</option>
              <option>Direct</option>
              <option>OTA</option>
            </select>
            <select className="rounded-sm border border-line bg-deep px-2.5 py-2 text-12 text-fg-2">
              <option>All room types</option>
            </select>
            <label className="flex items-center gap-1.5 text-12 text-fg-2">
              <input type="checkbox" defaultChecked /> Compare vs. last period
            </label>
            <div className="ml-auto flex gap-2">
              <button className="flex items-center gap-1.5 rounded-sm bg-accent-violet px-3.5 py-2 text-12 font-medium text-ice hover:bg-accent-violet-hi">
                <FileSpreadsheet className="h-3.5 w-3.5" /> XLSX
              </button>
              <button className="flex items-center gap-1.5 rounded-sm border border-line bg-fg-1/[0.06] px-3.5 py-2 text-12 text-fg-1 hover:border-line-strong">
                <FileText className="h-3.5 w-3.5" /> PDF
              </button>
            </div>
          </div>

          <Card className="overflow-x-auto p-0">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-6 border-b border-line px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3">
                {TABLES[tab].cols.map((c) => (
                  <div key={c}>{c}</div>
                ))}
              </div>
              {TABLES[tab].rows.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-6 items-center border-b border-line-soft px-4 py-2.5 font-mono text-[12.5px] text-fg-2 last:border-0 hover:bg-elevated"
                >
                  {row.map((cell, j) => (
                    <div key={j}>{cell}</div>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {tab === "monthly" && (
        <>
          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            {[
              { label: "MTD revenue", value: "Rp 890,400,000", delta: "+6.8% vs. last year", tone: "cyan" },
              { label: "Occupancy", value: "78%", delta: "+3pt vs. last year", tone: "muted" },
              { label: "RevPAR", value: "Rp 1,011,000", delta: "+4.2% vs. last year", tone: "cyan" },
            ].map((m) => (
              <Card key={m.label} className="p-4">
                <div className="text-[11px] uppercase tracking-[0.08em] text-fg-3">{m.label}</div>
                <div className="mt-1.5 font-mono text-22 font-semibold text-ice">{m.value}</div>
                <div
                  className={`mt-1 text-12 ${m.tone === "cyan" ? "text-accent-cyan" : "text-fg-3"}`}
                >
                  {m.delta}
                </div>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            {MONTHLY_METRICS.map((m) => (
              <Card key={m.label} className="p-3.5">
                <div className="text-[11px] uppercase tracking-[0.08em] text-fg-3">{m.label}</div>
                <div className="mt-1 font-mono text-17 font-semibold">{m.value}</div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
