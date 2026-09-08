"use client";

import React, { useMemo, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { useProperty } from "@/components/providers/PropertyProvider";
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
  { name: "Low", dates: "Feb 1 – Mar 31", color: "var(--accent-cyan)", standard: "Rp 1,150,000", deluxe: "Rp 1,480,000", suite: "Rp 2,100,000", flex: "Rp 1,650,000" },
  { name: "Shoulder", dates: "Apr 1 – Jun 30", color: "var(--res-tentative)", standard: "Rp 1,350,000", deluxe: "Rp 1,750,000", suite: "Rp 2,500,000", flex: "Rp 1,950,000" },
  { name: "High", dates: "Jul 1 – Sep 30", color: "var(--accent-violet)", standard: "Rp 1,650,000", deluxe: "Rp 2,150,000", suite: "Rp 3,100,000", flex: "Rp 2,400,000" },
  { name: "Peak", dates: "Dec 20 – Jan 5", color: "var(--room-ooo)", standard: "Rp 2,400,000", deluxe: "Rp 3,200,000", suite: "Rp 4,900,000", flex: "Rp 3,600,000" },
];

const RULES = [
  { condition: "occupancy > 85% and lead time < 7 days", action: "raise rate by 12%", scope: "All room types · weekends", status: "Active", ok: true },
  { condition: "pickup pace 20% below last year", action: "lower rate by 6%", scope: "Deluxe Twin · midweek", status: "Active", ok: true },
  { condition: "local event within 3 km", action: "raise rate by 18%, set 2-night min stay", scope: "All room types", status: "Paused", ok: false },
  { condition: "competitor drops rate > 10%", action: "match within guardrails", scope: "King Suite", status: "Active", ok: true },
];
const GUARDRAILS = [
  { name: "Deluxe Twin", floor: "Rp 1,100,000", ceiling: "Rp 2,400,000" },
  { name: "Double Queen", floor: "Rp 1,400,000", ceiling: "Rp 3,100,000" },
  { name: "King Suite", floor: "Rp 2,000,000", ceiling: "Rp 4,600,000" },
  { name: "Presidential Suite", floor: "Rp 5,500,000", ceiling: "Rp 11,000,000" },
];
const QUEUE = [
  { date: "Sat 13 Sep", roomType: "King Suite", current: "Rp 2,600,000", suggested: "Rp 3,120,000", reason: "Occupancy 91%, 4 OTAs raised rates" },
  { date: "Sun 14 Sep", roomType: "Deluxe Twin", current: "Rp 1,450,000", suggested: "Rp 1,360,000", reason: "Pickup pace 22% below LY" },
  { date: "Fri 19 Sep", roomType: "Double Queen", current: "Rp 1,850,000", suggested: "Rp 2,180,000", reason: "Beach festival within 2 km" },
];

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString("en-US")}`;

export default function RatesPage() {
  const { activeProperty } = useProperty();
  const [view, setView] = useState<"grid" | "seasons" | "rules">("grid");
  const [dynamicDays, setDynamicDays] = useState<Set<number>>(new Set([5, 6, 12, 13]));

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

  const GRID = { gridTemplateColumns: `160px repeat(${DAYS}, minmax(72px,1fr))` };

  return (
    <div className="mx-auto max-w-content">
      <div className="mb-3.5">
        <Segmented<"grid" | "seasons" | "rules">
          value={view}
          onChange={setView}
          options={[
            { value: "grid", label: "Grid" },
            { value: "seasons", label: "Seasons" },
            { value: "rules", label: "Pricing rules" },
          ]}
        />
      </div>

      {view === "grid" && (
        <Card className="overflow-x-auto p-0">
          <div className="min-w-[1160px]">
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
                  <div>{d.getUTCDate()}</div>
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

            {ROOM_TYPES.map((rt) => (
              <div
                key={rt.name}
                className="grid border-b border-line-soft"
                style={GRID}
              >
                <div className="sticky left-0 z-10 flex flex-col gap-1 bg-elevated p-3">
                  <div className="text-13 font-semibold">{rt.name}</div>
                  <div className="text-[10.5px] text-fg-3">Base {fmt(rt.base)}</div>
                </div>
                {days.map((d, i) => {
                  const dyn = dynamicDays.has(i);
                  const rate = rt.base * DOW_MULT[d.getUTCDay()] * (dyn ? 1.06 : 1);
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
                        {fmt(rate)}
                      </div>
                      <div className="flex gap-0.5">
                        <span className="rounded-[4px] bg-accent-cyan/10 px-1 font-mono text-[10px] font-bold text-accent-cyan">
                          {2 + (i % 4)}
                        </span>
                        <span className="rounded-[4px] bg-fg-1/[0.08] px-1 font-mono text-[10px] font-bold text-fg-2">
                          {4 - (i % 3)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

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
                <button className="rounded-sm border border-line bg-fg-1/[0.06] px-3 py-1.5 text-12 hover:border-line-strong">
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
                  key={a.date + a.roomType}
                  className="flex flex-wrap items-center gap-3.5 border-b border-line-soft px-4 py-3.5 last:border-0"
                >
                  <div className="w-[90px] font-mono text-12 text-fg-3">{a.date}</div>
                  <div className="w-[110px] text-13 font-medium">{a.roomType}</div>
                  <div className="font-mono text-[12.5px] text-fg-3 line-through">{a.current}</div>
                  <ArrowRight className="h-[13px] w-[13px] text-fg-3" />
                  <div className="font-mono text-13 font-semibold text-accent-cyan">
                    {a.suggested}
                  </div>
                  <div className="min-w-[160px] flex-1 text-[11.5px] text-fg-3">{a.reason}</div>
                  <button className="rounded-sm border border-line px-3 py-1.5 text-12 text-fg-2">
                    Reject
                  </button>
                  <button className="rounded-sm bg-accent-violet px-3 py-1.5 text-12 font-medium text-ice">
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
