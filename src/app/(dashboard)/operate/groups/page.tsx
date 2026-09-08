"use client";

import React, { useMemo, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { Card, Eyebrow } from "@/components/upx/primitives";
import PmsDateChip from "@/components/common/PmsDateChip";
import { useProperty } from "@/components/providers/PropertyProvider";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayOf = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};
const fmtDate = (iso: string, n: number) => {
  const d = dayOf(iso, n);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const fmtRange = (iso: string, start: number, nights: number) => {
  const a = dayOf(iso, start);
  const b = dayOf(iso, start + nights);
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[a.getUTCMonth()]} ${a.getUTCFullYear()}`
    : `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
};
const inDays = (n: number) =>
  n <= 0 ? "passed" : n === 1 ? "in 1 day" : `in ${n} days`;

interface Group {
  id: string;
  name: string;
  dates: string;
  cutoff: string;
  blocked: number;
  picked: number;
  pickupPct: string;
  status: string;
  contractLabel: string;
  contractColor: string;
  salesManager: string;
  billing: string;
  depositStatus: string;
  depositAmount: string;
  concessions: string;
  contact: string;
  trend: number[];
  subBlocks: { roomType: string; blocked: number; picked: number; rate: string }[];
  rooming: { guest: string; roomType: string; roomLabel: string; assigned: boolean }[];
  cutoffMessage: string;
}

type GroupSpec = Omit<Group, "dates" | "cutoff" | "cutoffMessage"> & {
  startOffset: number;
  nights: number;
  cutoffOffset: number; // days from the business date; <= 0 renders as "Passed"
  cutoffMessage: (days: number, confirmBy: string) => string;
};

const GROUP_SPECS: GroupSpec[] = [
  {
    id: "g1",
    name: "Astra International — Leadership Offsite",
    startOffset: 10,
    nights: 3,
    cutoffOffset: 3,
    blocked: 24,
    picked: 19,
    pickupPct: "79%",
    status: "Definite",
    contractLabel: "Signed",
    contractColor: "var(--accent-cyan)",
    salesManager: "Rangga Putra",
    billing: "Master folio — all room & tax",
    depositStatus: "Received",
    depositAmount: "Rp 42,000,000",
    concessions: "1 comp room per 20, free meeting room, 15:00 late checkout for VIPs.",
    contact: "Dewi Anggraini · dewi.a@astra.co.id · +62 811 900 4471",
    trend: [20, 34, 46, 52, 63, 70, 75, 79],
    subBlocks: [
      { roomType: "Double Queen", blocked: 16, picked: 13, rate: "Rp 1,750,000" },
      { roomType: "King Suite", blocked: 8, picked: 6, rate: "Rp 2,400,000" },
    ],
    rooming: [
      { guest: "Dewi Anggraini", roomType: "Suite", roomLabel: "501", assigned: true },
      { guest: "Arif Budiman", roomType: "Queen", roomLabel: "302", assigned: true },
      { guest: "Rina Kartika", roomType: "Queen", roomLabel: "TBD", assigned: false },
    ],
    cutoffMessage: (d) =>
      `Cut-off is ${inDays(d)}. 5 of 24 blocked rooms are still unpicked — release them to general inventory or extend the cut-off.`,
  },
  {
    id: "g2",
    name: "Wijaya–Santoso Wedding",
    startOffset: 19,
    nights: 2,
    cutoffOffset: 12,
    blocked: 18,
    picked: 11,
    pickupPct: "61%",
    status: "Definite",
    contractLabel: "Signed",
    contractColor: "var(--accent-cyan)",
    salesManager: "Sari Melati",
    billing: "Split — room to guests, F&B to master",
    depositStatus: "Partial",
    depositAmount: "Rp 15,000,000 of Rp 30,000,000",
    concessions: "Complimentary bridal suite, welcome drinks, 20% spa discount for the party.",
    contact: "Putri Santoso · putri.s@gmail.com · +62 812 555 8890",
    trend: [8, 14, 22, 30, 38, 47, 55, 61],
    subBlocks: [
      { roomType: "Deluxe Twin", blocked: 12, picked: 7, rate: "Rp 1,380,000" },
      { roomType: "King Suite", blocked: 6, picked: 4, rate: "Rp 2,200,000" },
    ],
    rooming: [
      { guest: "Putri Santoso", roomType: "Suite", roomLabel: "502", assigned: true },
      { guest: "Bagus Wijaya", roomType: "Suite", roomLabel: "502", assigned: true },
    ],
    cutoffMessage: (d) =>
      `7 rooms still unpicked with ${d} days to cut-off. Pick-up pace is on track for this lead time.`,
  },
  {
    id: "g3",
    name: "Java Jazz Pre-Tour Crew",
    startOffset: -1,
    nights: 3,
    cutoffOffset: -8,
    blocked: 10,
    picked: 10,
    pickupPct: "100%",
    status: "In-house",
    contractLabel: "Signed",
    contractColor: "var(--accent-cyan)",
    salesManager: "Rangga Putra",
    billing: "Master folio — room only",
    depositStatus: "Received",
    depositAmount: "Rp 12,000,000",
    concessions: "Early check-in, storage room for equipment.",
    contact: "Tour Logistics · logistics@jjfest.id",
    trend: [40, 60, 78, 90, 96, 100, 100, 100],
    subBlocks: [{ roomType: "Double Queen", blocked: 10, picked: 10, rate: "Rp 1,600,000" }],
    rooming: [
      { guest: "Andre Situmorang", roomType: "Queen", roomLabel: "203", assigned: true },
      { guest: "Kevin Halim", roomType: "Queen", roomLabel: "205", assigned: true },
    ],
    cutoffMessage: () => "Fully picked up and in-house. Nothing to action.",
  },
  {
    id: "g4",
    name: "TechCorp APAC Summit",
    startOffset: 28,
    nights: 3,
    cutoffOffset: 21,
    blocked: 30,
    picked: 4,
    pickupPct: "13%",
    status: "Tentative",
    contractLabel: "Awaiting signature",
    contractColor: "var(--res-tentative)",
    salesManager: "Sari Melati",
    billing: "Master folio — all charges",
    depositStatus: "Not received",
    depositAmount: "Rp 0 of Rp 60,000,000",
    concessions: "Pending contract — proposed 2 comp rooms and a hospitality suite.",
    contact: "Michael Chen · m.chen@techcorp.com · +65 8123 4567",
    trend: [2, 4, 6, 8, 9, 11, 12, 13],
    subBlocks: [
      { roomType: "King Suite", blocked: 20, picked: 3, rate: "Rp 2,300,000" },
      { roomType: "Presidential Suite", blocked: 10, picked: 1, rate: "Rp 6,200,000" },
    ],
    rooming: [{ guest: "Michael Chen", roomType: "Pres.", roomLabel: "TBD", assigned: false }],
    cutoffMessage: (d, confirmBy) =>
      `Contract unsigned and deposit not received with ${d} days to cut-off. Hold expires automatically if not confirmed by ${confirmBy}.`,
  },
];

function buildGroups(businessDate: string): Group[] {
  return GROUP_SPECS.map((spec) => {
    const { startOffset, nights, cutoffOffset, cutoffMessage, ...rest } = spec;
    return {
      ...rest,
      dates: fmtRange(businessDate, startOffset, nights),
      cutoff: cutoffOffset <= 0 ? "Passed" : fmtDate(businessDate, cutoffOffset),
      cutoffMessage: cutoffMessage(
        cutoffOffset,
        fmtDate(businessDate, cutoffOffset - 7)
      ),
    };
  });
}

const WAITLIST = [
  {
    name: "Bali Marathon Organising Committee",
    dates: "1–3 Nov 2026",
    rooms: 40,
    contact: "events@balimarathon.id · +62 361 555 7788",
  },
];

const TABLE_GRID =
  "grid grid-cols-[2fr_1.6fr_0.7fr_1.1fr_0.9fr_1.4fr_1.5fr] gap-2.5 px-4";

export default function GroupsBlocksPage() {
  const { activeProperty } = useProperty();
  const businessDate = activeProperty?.businessDate ?? "2026-09-08";
  const GROUPS = useMemo(() => buildGroups(businessDate), [businessDate]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      GROUPS.filter((g) => {
        if (status !== "All" && g.status !== status) return false;
        if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [GROUPS, search, status]
  );

  const g = openId ? GROUPS.find((x) => x.id === openId) ?? null : null;
  const trendMax = g ? Math.max(...g.trend) : 1;

  return (
    <div className="mx-auto max-w-content">
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search group or contact…"
          className="w-[200px] rounded-sm border border-line bg-elevated px-2.5 py-2 text-12 text-ice outline-none focus:border-accent-violet"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-sm border border-line bg-elevated px-2.5 py-2 text-12 text-fg-2"
        >
          {["All", "Definite", "Tentative", "In-house"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <PmsDateChip className="ml-auto" />
        <button className="rounded-sm bg-accent-violet px-3.5 py-2 text-13 font-medium text-ice hover:bg-accent-violet-hi">
          + New group block
        </button>
      </div>

      <Card className="mb-5 overflow-x-auto p-0">
        <div className="min-w-[980px]">
          <div className={`${TABLE_GRID} border-b border-line py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3`}>
            <div>Group</div>
            <div>Dates</div>
            <div>Blocked</div>
            <div>Pick-up</div>
            <div>Status</div>
            <div>Contract</div>
            <div>Sales manager</div>
          </div>
          {rows.length === 0 && (
            <div className="px-4 py-4 text-13 text-fg-3">No group blocks match.</div>
          )}
          {rows.map((row) => (
            <button
              key={row.id}
              onClick={() => setOpenId(row.id)}
              className={`${TABLE_GRID} w-full items-center border-b border-line-soft py-3 text-left text-13 transition-colors last:border-0 hover:bg-elevated`}
            >
              <div className="font-semibold">{row.name}</div>
              <div className="whitespace-nowrap text-12 text-fg-3">{row.dates}</div>
              <div className="font-mono">{row.blocked}</div>
              <div className="font-mono text-accent-cyan">
                {row.picked} · {row.pickupPct}
              </div>
              <div>
                <span className="rounded-pill border border-line bg-fg-1/[0.06] px-2.5 py-[3px] text-[11px] text-fg-2">
                  {row.status}
                </span>
              </div>
              <div
                className="whitespace-nowrap text-12"
                style={{ color: row.contractColor }}
              >
                {row.contractLabel}
              </div>
              <div className="text-12 text-fg-3">{row.salesManager}</div>
            </button>
          ))}
        </div>
      </Card>

      <Eyebrow className="mb-2.5">Waitlisted group inquiries</Eyebrow>
      <Card className="overflow-hidden p-0">
        {WAITLIST.map((w) => (
          <div
            key={w.name}
            className="flex flex-wrap items-center gap-3.5 border-b border-line-soft px-4 py-3 text-13 last:border-0"
          >
            <div className="flex-1 font-medium">{w.name}</div>
            <div className="w-[100px] font-mono text-12 text-fg-3">{w.dates}</div>
            <div className="w-[70px] text-12 text-fg-3">{w.rooms} rooms</div>
            <div className="flex-[1.4] text-12 text-fg-3">{w.contact}</div>
            <button className="rounded-sm border border-line bg-fg-1/[0.06] px-3 py-1.5 text-12 hover:border-line-strong">
              Convert to block
            </button>
          </div>
        ))}
      </Card>

      {g && (
        <>
          <div onClick={() => setOpenId(null)} className="fixed inset-0 z-30 bg-deepest/70 backdrop-blur-[6px]" />
          <div className="upx-scroll fixed right-0 top-0 bottom-0 z-40 flex w-[520px] max-w-[95vw] flex-col gap-4 overflow-y-auto border-l border-line bg-deep p-6 shadow-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-18 font-bold text-ice">{g.name}</div>
                <div className="mt-1 text-[12.5px] text-fg-3">
                  {g.dates} · Cut-off {g.cutoff}
                </div>
              </div>
              <button onClick={() => setOpenId(null)} className="text-fg-3 hover:text-ice" aria-label="Close">
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: g.status, color: "var(--line)", fg: "var(--fg-2)" },
                { label: g.contractLabel, color: g.contractColor, fg: g.contractColor },
                { label: `Deposit: ${g.depositStatus}`, color: "var(--line)", fg: "var(--fg-2)" },
              ].map((chip) => (
                <span
                  key={chip.label}
                  className="whitespace-nowrap rounded-pill border bg-fg-1/[0.06] px-2.5 py-1 text-[11px] font-medium"
                  style={{ borderColor: chip.color, color: chip.fg }}
                >
                  {chip.label}
                </span>
              ))}
            </div>

            <Card className="p-3.5">
              <Eyebrow className="mb-2">Pick-up trend</Eyebrow>
              <div className="flex h-14 items-end gap-1.5">
                {g.trend.map((t, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-[2px] bg-accent-violet"
                    style={{ height: `${(t / trendMax) * 100}%` }}
                  />
                ))}
              </div>
            </Card>

            <div>
              <Eyebrow className="mb-2">Sub-blocks</Eyebrow>
              <Card className="overflow-hidden p-0">
                <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1fr] border-b border-line px-3.5 py-2 text-[10.5px] uppercase tracking-[0.06em] text-fg-3">
                  <div>Room type</div>
                  <div>Blocked</div>
                  <div>Picked</div>
                  <div>Rate</div>
                </div>
                {g.subBlocks.map((sb) => (
                  <div
                    key={sb.roomType}
                    className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1fr] items-center border-b border-line-soft px-3.5 py-2.5 text-[12.5px] last:border-0"
                  >
                    <div className="font-medium">{sb.roomType}</div>
                    <div className="font-mono">{sb.blocked}</div>
                    <div className="font-mono text-accent-cyan">{sb.picked}</div>
                    <div className="font-mono">{sb.rate}</div>
                  </div>
                ))}
              </Card>
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <Eyebrow>Rooming list</Eyebrow>
                <button className="text-[11.5px] text-accent-violet-hi">+ Add guest</button>
              </div>
              <Card className="overflow-hidden p-0">
                {g.rooming.map((rm) => (
                  <div
                    key={rm.guest}
                    className="flex items-center gap-2.5 border-b border-line-soft px-3.5 py-2.5 text-[12.5px] last:border-0"
                  >
                    <div className="flex-1 font-medium">{rm.guest}</div>
                    <div className="w-[60px] text-fg-3">{rm.roomType}</div>
                    <div
                      className="w-[70px] font-mono"
                      style={{ color: rm.assigned ? "var(--fg-1)" : "var(--res-tentative)" }}
                    >
                      {rm.roomLabel}
                    </div>
                    <button className="rounded-sm border border-line bg-fg-1/[0.06] px-2.5 py-1 text-[11px]">
                      {rm.assigned ? "Change" : "Assign"}
                    </button>
                  </div>
                ))}
              </Card>
            </div>

            <Card className="flex flex-col gap-2 p-3.5">
              <Eyebrow>Billing &amp; concessions</Eyebrow>
              <div className="flex justify-between text-[12.5px]">
                <span className="text-fg-3">Billing method</span>
                <span>{g.billing}</span>
              </div>
              <div className="flex justify-between text-[12.5px]">
                <span className="text-fg-3">Deposit</span>
                <span className="font-mono">{g.depositAmount}</span>
              </div>
              <div className="mt-1 text-[12.5px] text-fg-2">{g.concessions}</div>
            </Card>

            <Card className="flex flex-col gap-1.5 p-3.5">
              <Eyebrow>Contact &amp; sales</Eyebrow>
              <div className="text-[12.5px]">{g.contact}</div>
              <div className="text-12 text-fg-3">Sales manager: {g.salesManager}</div>
            </Card>

            <div className="flex items-start gap-2 rounded-md border border-ai-edge bg-ai-tint p-3 text-[12.5px] text-ice">
              <Sparkles className="mt-px h-[15px] w-[15px] flex-none text-ai-fg" />
              {g.cutoffMessage}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
