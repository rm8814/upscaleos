"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Sparkles, ArrowRight } from "lucide-react";
import { useProperty } from "@/components/providers/PropertyProvider";
import { useToast } from "@/components/providers/ToastProvider";
import PmsDateChip from "@/components/common/PmsDateChip";
import { Card, Eyebrow, Segmented } from "@/components/upx/primitives";

const DAYS = 14;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_MULT = [0.9, 0.92, 0.95, 1.0, 1.08, 1.25, 1.3]; // Sun..Sat

const ROOM_TYPES = [
  { name: "Deluxe Twin", base: 1_450_000 },
  { name: "Double Queen", base: 1_850_000 },
  { name: "King Suite", base: 2_600_000 },
  { name: "Presidential Suite", base: 6_900_000 },
];

const SEASONS = [
  { name: "Low", dates: "Feb 1 – Mar 31", color: "var(--accent-cyan)", standard: "1,150,000", deluxe: "1,480,000", suite: "2,100,000", flex: "1,650,000" },
  { name: "Shoulder", dates: "Apr 1 – Jun 30", color: "var(--res-tentative)", standard: "1,350,000", deluxe: "1,750,000", suite: "2,500,000", flex: "1,950,000" },
  { name: "High", dates: "Jul 1 – Sep 30", color: "var(--accent-violet)", standard: "1,650,000", deluxe: "2,150,000", suite: "3,100,000", flex: "2,400,000" },
  { name: "Peak", dates: "Dec 20 – Jan 5", color: "var(--room-ooo)", standard: "2,400,000", deluxe: "3,200,000", suite: "4,900,000", flex: "3,600,000" },
];

const RULES = [
  { condition: "occupancy > 85% and lead time < 7 days", action: "raise rate by 12%", scope: "All room types · weekends", status: "Active", ok: true },
  { condition: "pickup pace 20% below last year", action: "lower rate by 6%", scope: "Deluxe Twin · midweek", status: "Active", ok: true },
  { condition: "local event within 3 km", action: "raise rate by 18%, set 2-night min stay", scope: "All room types", status: "Paused", ok: false },
  { condition: "competitor drops rate > 10%", action: "match within guardrails", scope: "King Suite", status: "Active", ok: true },
];
const GUARDRAILS = [
  { name: "Deluxe Twin", floor: "1,100,000", ceiling: "2,400,000" },
  { name: "Double Queen", floor: "1,400,000", ceiling: "3,100,000" },
  { name: "King Suite", floor: "2,000,000", ceiling: "4,600,000" },
  { name: "Presidential Suite", floor: "5,500,000", ceiling: "11,000,000" },
];
const QUEUE = [
  { dayOffset: 5, roomType: "King Suite", current: "2,600,000", suggested: "3,120,000", reason: "Occupancy 91%, 4 OTAs raised rates" },
  { dayOffset: 6, roomType: "Deluxe Twin", current: "1,450,000", suggested: "1,360,000", reason: "Pickup pace 22% below LY" },
  { dayOffset: 11, roomType: "Double Queen", current: "1,850,000", suggested: "2,180,000", reason: "Beach festival within 2 km" },
];

const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const money = (n: number) => Math.round(n).toLocaleString("en-US");
const dm = (d: Date) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const queueDate = (iso: string, offset: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return `${DOW_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

function LegendCount({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-[4px] px-[5px] py-px font-mono text-[10px] font-bold ${cls}`}
    >
      {children}
    </span>
  );
}
function RestrictBadge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-[3px] border px-[3px] text-[8.5px] font-bold leading-[1.4] ${cls}`}
    >
      {children}
    </span>
  );
}

export default function RatesPage() {
  const { activeProperty } = useProperty();
  const toast = useToast();
  const [view, setView] = useState<"grid" | "seasons" | "rules">("grid");
  const [dynamicDays, setDynamicDays] = useState<Set<number>>(new Set([5, 6, 12, 13]));

  const reservations = useQuery(
    api.reservations.getByProperty,
    activeProperty ? { propertyId: activeProperty._id } : "skip"
  );

  const todayIso = activeProperty?.businessDate ?? "2026-09-08";
  const days = useMemo(
    () =>
      Array.from({ length: DAYS }, (_, i) => {
        const d = new Date(todayIso + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + i);
        return d;
      }),
    [todayIso]
  );

  const toggleDynamic = (i: number) =>
    setDynamicDays((s) => {
      const n = new Set(s);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });

  const GRID = { gridTemplateColumns: `160px repeat(${DAYS}, minmax(84px,1fr))` };

  return (
    <div className="mx-auto max-w-content">
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <Segmented<"grid" | "seasons" | "rules">
          value={view}
          onChange={setView}
          options={[
            { value: "grid", label: "Grid" },
            { value: "seasons", label: "Seasons" },
            { value: "rules", label: "Pricing rules" },
          ]}
        />
        {view === "grid" && <PmsDateChip />}
      </div>

      {view === "grid" && (
        <>
          <div className="mb-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[11px] text-fg-3">
            <LegendCount cls="bg-accent-cyan/10 text-accent-cyan">0</LegendCount>
            <span>Available</span>
            <LegendCount cls="bg-fg-1/[0.08] text-fg-2">0</LegendCount>
            <span>Assigned</span>
            <LegendCount cls="bg-room-ooo/[0.14] text-room-ooo">0</LegendCount>
            <span>Unassigned / blocked</span>
            <span className="flex items-center gap-1.5">
              <RestrictBadge cls="border-room-ooo text-room-ooo">SO</RestrictBadge>
              Stop-sell
            </span>
            <span className="flex items-center gap-1.5">
              <RestrictBadge cls="border-accent-violet-hi text-accent-violet-hi">CTA</RestrictBadge>
              Closed to arrival
            </span>
            <span className="flex items-center gap-1.5">
              <RestrictBadge cls="border-res-tentative text-res-tentative">CTD</RestrictBadge>
              Closed to departure
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-[9px] w-4 rounded-pill bg-accent-violet" />
              dynamic on /
              <span className="inline-block h-[9px] w-4 rounded-pill bg-line" />
              manual override
            </span>
          </div>

        <Card className="overflow-x-auto p-0">
          <div className="min-w-[1320px]">
            <div className="grid border-b border-line" style={GRID}>
              <div className="sticky left-0 z-10 bg-elevated px-3 py-2.5 text-[11px] text-fg-3">
                Room type
              </div>
              {days.map((d, i) => (
                <div
                  key={i}
                  className="border-l border-line py-1.5 text-center font-mono text-[10.5px] text-fg-3"
                >
                  <div className="text-[9px] font-semibold uppercase text-fg-2">
                    {DOW[d.getUTCDay()]}
                  </div>
                  <div>{dm(d)}</div>
                </div>
              ))}
            </div>

            <div className="grid border-b border-line bg-deep" style={GRID}>
              <div className="sticky left-0 z-10 bg-deep px-3 py-2 text-[10px] text-fg-3">
                Dynamic pricing
              </div>
              {days.map((_, i) => (
                <div key={i} className="flex items-center justify-center border-l border-line-soft py-2">
                  <button
                    onClick={() => toggleDynamic(i)}
                    className="relative h-[18px] w-[34px] rounded-pill transition-colors"
                    style={{
                      background: dynamicDays.has(i) ? "var(--accent-violet)" : "var(--line)",
                    }}
                  >
                    <span
                      className="absolute top-0.5 h-3.5 w-3.5 rounded-pill bg-white transition-all"
                      style={{ left: dynamicDays.has(i) ? 17 : 2 }}
                    />
                  </button>
                </div>
              ))}
            </div>

            {ROOM_TYPES.map((rt, rtIdx) => {
              const totalRooms = rt.name === "Presidential Suite" ? 6 : 8;
              return (
                <div
                  key={rt.name}
                  className="grid border-b border-line-soft"
                  style={GRID}
                >
                  <div className="sticky left-0 z-10 flex flex-col gap-1 bg-elevated p-3">
                    <div className="text-13 font-semibold">{rt.name}</div>
                    <div className="text-[10.5px] text-fg-3">Base {money(rt.base)}</div>
                  </div>
                  {days.map((d, i) => {
                    const dyn = dynamicDays.has(i);
                    const dow = d.getUTCDay();
                    const rate = rt.base * DOW_MULT[dow] * (dyn ? 1.06 : 1);
                    const demand =
                      DOW_MULT[dow] >= 1.25 ? "high" : DOW_MULT[dow] <= 0.95 ? "low" : "mid";
                    const dayIso = iso(d);
                    const stopSell = rtIdx === 3 && (i + 4) % 11 === 0;
                    const cta = demand === "high" && (i + rtIdx) % 5 === 0;
                    const ctd = demand === "low" && (i + rtIdx) % 7 === 3;
                    const minStay = demand === "high" ? 2 : 1;
                    const minStayShow = minStay > 1 && !cta;
                    const occ = (reservations ?? []).filter(
                      (r) =>
                        r.status !== "cancelled" &&
                        r.status !== "departed" &&
                        r.roomType === rt.name &&
                        r.checkIn <= dayIso &&
                        r.checkOut > dayIso
                    );
                    const unassigned = occ.filter((r) => !r.roomId).length;
                    const assigned = stopSell ? 0 : occ.filter((r) => r.roomId).length;
                    const avail = stopSell
                      ? 0
                      : Math.max(0, totalRooms - assigned - unassigned);
                    const hasRestriction = stopSell || minStayShow || cta || ctd;
                    return (
                      <div
                        key={i}
                        className="flex flex-col items-center gap-1 border-l border-line-soft px-1 py-2"
                        style={{ background: dyn ? "var(--violet-wash)" : undefined }}
                      >
                        <div
                          className="font-mono text-[11px] font-semibold"
                          style={{ color: dyn ? "var(--accent-violet-hi)" : "var(--fg-1)" }}
                        >
                          {money(rate)}
                        </div>
                        <div className="flex flex-wrap justify-center gap-[3px]">
                          <span className="rounded-[4px] bg-accent-cyan/10 px-[5px] font-mono text-[10px] font-bold text-accent-cyan">
                            {avail}
                          </span>
                          <span className="rounded-[4px] bg-fg-1/[0.08] px-[5px] font-mono text-[10px] font-bold text-fg-2">
                            {assigned}
                          </span>
                          {unassigned > 0 && (
                            <Link
                              href={`/guests/reservations?unassigned=1&roomType=${encodeURIComponent(
                                rt.name
                              )}&date=${dayIso}`}
                              title={`${unassigned} unassigned booking${
                                unassigned > 1 ? "s" : ""
                              } — open list`}
                              className="rounded-[4px] bg-room-ooo/[0.14] px-[5px] font-mono text-[10px] font-bold text-room-ooo hover:bg-room-ooo/30"
                            >
                              {unassigned}
                            </Link>
                          )}
                        </div>
                        {hasRestriction && (
                          <div className="flex flex-wrap justify-center gap-0.5">
                            {stopSell && (
                              <RestrictBadge cls="border-room-ooo text-room-ooo">SO</RestrictBadge>
                            )}
                            {minStayShow && (
                              <span className="text-[8.5px] text-fg-3">{minStay}N</span>
                            )}
                            {cta && (
                              <RestrictBadge cls="border-accent-violet-hi text-accent-violet-hi">
                                CTA
                              </RestrictBadge>
                            )}
                            {ctd && (
                              <RestrictBadge cls="border-res-tentative text-res-tentative">
                                CTD
                              </RestrictBadge>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div className="grid border-t border-line bg-deep" style={GRID}>
              <div className="sticky left-0 z-10 bg-deep px-3 py-2.5 text-12 font-semibold text-ice">
                Total occupancy
              </div>
              {days.map((d, i) => (
                <div
                  key={i}
                  className="border-l border-line-soft py-2.5 text-center font-mono text-12 font-semibold text-accent-cyan"
                >
                  {Math.round(58 + DOW_MULT[d.getUTCDay()] * 22 + (i % 5))}%
                </div>
              ))}
            </div>
          </div>
        </Card>
        </>
      )}

      {view === "seasons" && (
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-[1.4fr_1.4fr_repeat(4,1fr)] border-b border-line px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3">
            <div>Season</div>
            <div>Dates</div>
            <div>Standard</div>
            <div>Deluxe</div>
            <div>Suite</div>
            <div>Flex</div>
          </div>
          {SEASONS.map((s) => (
            <div
              key={s.name}
              className="grid grid-cols-[1.4fr_1.4fr_repeat(4,1fr)] items-center border-b border-line-soft px-4 py-3.5 text-13 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />
                {s.name}
              </div>
              <div className="text-12 text-fg-3">{s.dates}</div>
              <div className="font-mono">{s.standard}</div>
              <div className="font-mono">{s.deluxe}</div>
              <div className="font-mono">{s.suite}</div>
              <div className="font-mono">{s.flex}</div>
            </div>
          ))}
        </Card>
      )}

      {view === "rules" && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2 rounded-sm border border-ai-edge bg-ai-tint px-3 py-2.5 text-12 text-fg-3">
            <Sparkles className="h-3.5 w-3.5 text-ai-fg" />
            AI suggests rate changes from the rules below — nothing goes live until you approve it.
          </div>

          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="mb-2.5 flex items-baseline justify-between">
                <Eyebrow>Rules</Eyebrow>
                <button
                  onClick={() => toast("Pricing-rule builder isn’t wired in this preview")}
                  className="rounded-sm border border-line bg-fg-1/[0.06] px-3 py-1.5 text-12 hover:border-line-strong"
                >
                  + New rule
                </button>
              </div>
              <Card className="overflow-hidden p-0">
                {RULES.map((r) => (
                  <div key={r.condition} className="border-b border-line-soft p-4 last:border-0">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="text-13 font-medium">If {r.condition}</div>
                      <span
                        className="whitespace-nowrap rounded-pill border px-2 py-0.5 text-[10.5px] font-semibold"
                        style={{
                          borderColor: r.ok ? "var(--accent-cyan)" : "var(--res-tentative)",
                          color: r.ok ? "var(--accent-cyan)" : "var(--res-tentative)",
                        }}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className="mt-1 text-[12.5px] text-accent-cyan">→ {r.action}</div>
                    <div className="mt-0.5 text-[11px] text-fg-3">Applies to: {r.scope}</div>
                  </div>
                ))}
              </Card>
            </div>

            <div>
              <Eyebrow className="mb-2.5">Guardrails</Eyebrow>
              <Card className="overflow-hidden p-0">
                <div className="grid grid-cols-3 border-b border-line px-3.5 py-2 text-[10.5px] uppercase tracking-[0.06em] text-fg-3">
                  <div>Type</div>
                  <div>Floor</div>
                  <div>Ceiling</div>
                </div>
                {GUARDRAILS.map((g) => (
                  <div
                    key={g.name}
                    className="grid grid-cols-3 items-center border-b border-line-soft px-3.5 py-2.5 text-[12.5px] last:border-0"
                  >
                    <div className="font-medium">{g.name}</div>
                    <div className="font-mono">{g.floor}</div>
                    <div className="font-mono">{g.ceiling}</div>
                  </div>
                ))}
              </Card>
            </div>
          </div>

          <div>
            <Eyebrow className="mb-2.5">Approval queue</Eyebrow>
            <Card className="overflow-hidden p-0">
              {QUEUE.map((a) => (
                <div
                  key={a.dayOffset + a.roomType}
                  className="flex flex-wrap items-center gap-3.5 border-b border-line-soft px-4 py-3.5 last:border-0"
                >
                  <div className="w-[90px] font-mono text-12 text-fg-3">
                    {queueDate(todayIso, a.dayOffset)}
                  </div>
                  <div className="w-[110px] text-13 font-medium">{a.roomType}</div>
                  <div className="font-mono text-[12.5px] text-fg-3 line-through">{a.current}</div>
                  <ArrowRight className="h-[13px] w-[13px] text-fg-3" />
                  <div className="font-mono text-13 font-semibold text-accent-cyan">
                    {a.suggested}
                  </div>
                  <div className="min-w-[160px] flex-1 text-[11.5px] text-fg-3">{a.reason}</div>
                  <button
                    onClick={() => toast(`Rejected the ${a.roomType} rate change`)}
                    className="rounded-sm border border-line px-3 py-1.5 text-12 text-fg-2 hover:text-ice"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() =>
                      toast(`Approved ${a.roomType} → ${a.suggested}`, "success")
                    }
                    className="rounded-sm bg-accent-violet px-3 py-1.5 text-12 font-medium text-ice hover:bg-accent-violet-hi"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
