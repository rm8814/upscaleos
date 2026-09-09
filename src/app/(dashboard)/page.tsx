"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useProperty } from "@/components/providers/PropertyProvider";
import { useToast } from "@/components/providers/ToastProvider";
import {
  Plus,
  LogIn,
  DoorOpen,
  SlidersHorizontal,
  Sparkles,
  AlertTriangle,
  Star,
  CheckSquare,
  Clock,
} from "lucide-react";
import {
  Card,
  Eyebrow,
  StatTile,
  Pill,
  GhostButton,
  PrimaryButton,
  Segmented,
  ROOM_STATUS_COLOR,
  RES_STATUS_COLOR,
  RES_STATUS_LABEL,
} from "@/components/upx/primitives";

type Period = "yesterday" | "today" | "7d" | "30d";

const PERIOD_LABEL: Record<Period, string> = {
  yesterday: "Yesterday",
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

const DOW_LETTER = ["S", "M", "T", "W", "T", "F", "S"];

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const { activeProperty } = useProperty();
  const arg = activeProperty ? { propertyId: activeProperty._id } : "skip";
  const stats = useQuery(api.operate.getDashboardStats, arg);
  const board = useQuery(api.operate.getDashboardBoard, arg);
  const roomStatus = useQuery(api.operate.getRoomStatusSummary, arg);
  const arrivals = useQuery(api.reservations.getArrivalsToday, arg);

  const [period, setPeriod] = useState<Period>("today");
  const kpi = useQuery(
    api.revenue.getKpis,
    activeProperty ? { propertyId: activeProperty._id, period } : "skip"
  );
  const deltaTone = (d: string | undefined) =>
    d && d.startsWith("+") && d !== "+0.0%" ? "positive" : "muted";

  const arrivalsWithRoom = (arrivals ?? []).filter(
    (a) => a.roomNumber && a.roomNumber !== "—"
  ).length;

  // PMS business date vs the real wall-clock date in the property's timezone.
  const bizDate = activeProperty?.businessDate ?? null;
  const wallToday = (() => {
    const tz = activeProperty?.timezone ?? "Asia/Makassar";
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  })();
  const dateDrift =
    bizDate && bizDate !== wallToday
      ? Math.round(
          (Date.parse(wallToday + "T00:00:00Z") - Date.parse(bizDate + "T00:00:00Z")) /
            86400000
        )
      : 0;
  const dateDriftAlert =
    dateDrift > 0
      ? `PMS business date is ${bizDate} — ${dateDrift} day${dateDrift > 1 ? "s" : ""} behind the real date (${wallToday}). ${
          dateDrift === 1
            ? "Tonight's night audit will advance it."
            : "Run the night audit to catch up."
        }`
      : dateDrift < 0
        ? `PMS business date is ${bizDate} — ${-dateDrift} day${
            dateDrift < -1 ? "s" : ""
          } ahead of the real date (${wallToday}). Check the night-audit schedule.`
        : null;

  const alerts = [
    dateDriftAlert
      ? { text: dateDriftAlert, href: "/finance/night-audit" }
      : null,
    stats && stats.ooo > 0
      ? { text: `${stats.ooo} room${stats.ooo > 1 ? "s" : ""} out of order — maintenance in progress` }
      : null,
    stats && stats.dirty > 0
      ? { text: `${stats.dirty} vacant-dirty rooms still to clean before 3 PM cut-off` }
      : null,
    stats && stats.arrivalsToday > 0
      ? { text: `${stats.arrivalsToday} arrivals expected today — ${arrivalsWithRoom} with a room assigned` }
      : null,
  ].filter(Boolean) as { text: string; href?: string }[];

  return (
    <div className="mx-auto max-w-content">
      {/* Period + actions */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { value: "yesterday", label: "Yesterday" },
            { value: "today", label: "Today" },
            { value: "7d", label: "7 days" },
            { value: "30d", label: "30 days" },
          ]}
        />
        <div className="ml-auto flex flex-wrap gap-2">
          <PrimaryButton onClick={() => router.push("/operate/calendar")}>
            <Plus className="h-3.5 w-3.5" /> New reservation
          </PrimaryButton>
          <GhostButton onClick={() => router.push("/guests/reservations")}>
            <LogIn className="h-3.5 w-3.5" /> Check in
          </GhostButton>
          <GhostButton onClick={() => router.push("/operate/calendar")}>
            <DoorOpen className="h-3.5 w-3.5" /> Walk-in
          </GhostButton>
          <GhostButton
            onClick={() => toast("Dashboard layout editing isn’t available in this preview")}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Customize
          </GhostButton>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-3.5 flex flex-col gap-2 rounded-lg border border-room-ooo bg-elevated p-3.5">
          <Eyebrow>Alerts &amp; exceptions</Eyebrow>
          {alerts.map((a) => {
            const inner = (
              <>
                <AlertTriangle className="mt-px h-[15px] w-[15px] flex-none text-room-ooo" />
                <span>
                  {a.text}
                  {a.href && (
                    <span className="ml-1 whitespace-nowrap text-accent-violet-hi">
                      Open night audit →
                    </span>
                  )}
                </span>
              </>
            );
            return a.href ? (
              <Link
                key={a.text}
                href={a.href}
                className="flex items-start gap-2.5 text-13 text-ice hover:text-accent-violet-hi"
              >
                {inner}
              </Link>
            ) : (
              <div key={a.text} className="flex items-start gap-2.5 text-13 text-ice">
                {inner}
              </div>
            );
          })}
        </div>
      )}

      {/* KPI tiles */}
      <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={`Room revenue · ${PERIOD_LABEL[period]}`}
          value={kpi ? kpi.revenue : "—"}
          delta={kpi ? `${kpi.revDelta} · vs. prior period` : undefined}
          deltaTone={deltaTone(kpi?.revDelta)}
        />
        <StatTile
          label="Occupancy"
          value={kpi ? `${kpi.occupancyPct}%` : "—"}
          delta={
            kpi
              ? `${kpi.roomsSold}/${kpi.availableRoomNights} room-nights`
              : undefined
          }
          valueTone="cyan"
        />
        <StatTile
          label="ADR"
          value={kpi ? kpi.adr : "—"}
          delta={kpi ? `${kpi.adrDelta} · vs. prior period` : undefined}
          deltaTone={deltaTone(kpi?.adrDelta)}
        />
        <StatTile
          label="RevPAR"
          value={kpi ? kpi.revpar : "—"}
          delta={kpi ? `${kpi.revparDelta} · vs. prior period` : undefined}
          deltaTone={deltaTone(kpi?.revparDelta)}
        />
      </div>

      {/* AI suggestion + channel mix */}
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-[2fr_1fr]">
        <div className="flex items-center gap-3.5 rounded-lg border border-ai-edge bg-ai-tint p-[18px]">
          <Sparkles className="h-[22px] w-[22px] flex-none text-ai-fg" />
          <div className="flex-1">
            <div className="text-14 font-semibold text-ai-fg">AI suggestion</div>
            <div className="mt-0.5 text-14 text-ice">
              Rate up 12% for Sat. — demand from 4 OTAs.
            </div>
          </div>
          <button
            onClick={() => router.push("/revenue/rates")}
            className="flex-none rounded-sm bg-accent-violet px-3.5 py-2 text-13 font-medium text-ice transition-colors hover:bg-accent-violet-hi"
          >
            Apply
          </button>
        </div>
        <Card className="flex flex-col gap-2 p-4">
          <Eyebrow>Channel mix · next 30 nights</Eyebrow>
          {!board && <div className="py-1.5 text-12 text-fg-3">Loading…</div>}
          {board && board.channelMix.length === 0 && (
            <div className="py-1.5 text-12 text-fg-3">No rooms on the books.</div>
          )}
          {(board?.channelMix ?? []).map((c) => (
            <div key={c.name} className="flex items-center gap-2">
              <span className="w-[70px] text-12 text-fg-2">{c.name}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-deep">
                <span
                  className="block h-full bg-accent-violet"
                  style={{ width: `${c.pct}%` }}
                />
              </span>
              <span className="w-8 text-right font-mono text-[11px] text-fg-3">
                {c.pct}%
              </span>
            </div>
          ))}
        </Card>
      </div>

      {/* Secondary stats */}
      <div className="mb-3.5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {[
          { label: "Departures today", value: stats ? String(stats.departuresToday) : "—" },
          { label: "In-house", value: stats ? String(stats.inHouse) : "—" },
          { label: "Avg. length of stay", value: board ? `${board.avgLos} nights` : "—" },
          { label: "Open tickets", value: stats ? String(stats.openTickets) : "—" },
        ].map((s) => (
          <Card key={s.label} className="p-3.5">
            <Eyebrow>{s.label}</Eyebrow>
            <div className="mt-1 font-mono text-18 font-semibold text-ice">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Revenue by source / Room status / Guest sentiment */}
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-[1.4fr_1fr_1fr]">
        <Card className="p-4">
          <Eyebrow className="mb-2.5">Revenue by source · last 30 days</Eyebrow>
          {!board && <div className="py-2 text-12 text-fg-3">Loading…</div>}
          {(board?.revenueSources ?? []).map((rv) => (
            <div key={rv.label} className="flex items-center gap-2.5 py-2">
              <span className="w-[70px] text-[12.5px] text-fg-2">{rv.label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-deep">
                <span className="block h-full bg-accent-violet" style={{ width: `${rv.pct}%` }} />
              </span>
              <span className="w-[110px] text-right font-mono text-12 text-fg-3">
                {rv.amount}
              </span>
            </div>
          ))}
        </Card>

        <Card className="p-4">
          <Eyebrow className="mb-2.5">Room status</Eyebrow>
          {(roomStatus ?? []).map((rs) => (
            <div key={rs.status} className="flex items-center gap-2 py-1.5">
              <span
                className="h-2 w-2 rounded-pill"
                style={{ background: ROOM_STATUS_COLOR[rs.status] }}
              />
              <span className="flex-1 text-[12.5px] text-fg-2">{rs.status}</span>
              <span className="font-mono text-13 font-semibold text-ice">{rs.count}</span>
            </div>
          ))}
          {!roomStatus && <div className="py-1.5 text-12 text-fg-3">Loading…</div>}
        </Card>

        <Card className="p-4">
          <Eyebrow className="mb-2.5">Guest sentiment</Eyebrow>
          <div className="flex items-baseline gap-2">
            <div className="font-mono text-28 font-bold text-ice">4.8</div>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 text-warning" fill="currentColor" />
              ))}
            </div>
          </div>
          <div className="mt-1 text-12 text-fg-3">1,204 reviews · +0.1 vs. last month</div>
        </Card>
      </div>

      {/* Arrivals + outlook | tasks + activity */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-3.5">
          <Card className="p-4">
            <Eyebrow className="mb-2.5">Arrivals today</Eyebrow>
            {(arrivals ?? []).length === 0 && (
              <div className="py-2 text-12 text-fg-3">
                {arrivals ? "No arrivals for today. Quiet day." : "Loading…"}
              </div>
            )}
            {(arrivals ?? []).map((a) => (
              <div
                key={a._id}
                className="flex items-center gap-3 border-b border-line-soft py-2.5 last:border-0"
              >
                <div className="flex-1 text-13">{a.guestName}</div>
                <div className="w-[92px] text-[11px] text-fg-3">{a.roomType}</div>
                <div className="w-10 font-mono text-12 text-fg-3">{a.roomNumber}</div>
                <div className="w-11 font-mono text-12 text-fg-3">{a.etaLabel ?? "—"}</div>
                <span
                  className="rounded-pill border bg-fg-1/[0.06] px-2 py-0.5 text-[11px]"
                  style={{
                    borderColor: RES_STATUS_COLOR[a.status],
                    color: RES_STATUS_COLOR[a.status],
                  }}
                >
                  {RES_STATUS_LABEL[a.status] ?? a.status}
                </span>
              </div>
            ))}
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <Eyebrow>Occupancy outlook · next 14 days</Eyebrow>
              <div className="text-[11.5px] text-fg-3">
                Avg{" "}
                <span className="font-mono font-semibold text-ice">
                  {board && board.outlook.length
                    ? Math.round(
                        board.outlook.reduce((a, b) => a + b.occPct, 0) /
                          board.outlook.length
                      )
                    : "—"}
                  %
                </span>
              </div>
            </div>
            <div className="flex h-[130px] items-end gap-2">
              {(board?.outlook ?? []).map((o) => (
                <div
                  key={o.date}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <div className="font-mono text-[10.5px] font-semibold text-fg-3">
                    {o.occPct}
                  </div>
                  <div className="flex h-24 w-full items-end overflow-hidden rounded-t-[4px] bg-deep">
                    <div
                      className="w-full rounded-t-[4px]"
                      style={{
                        height: `${o.occPct}%`,
                        background:
                          o.occPct >= 85
                            ? "var(--accent-violet)"
                            : o.occPct >= 70
                              ? "var(--accent-violet-hi)"
                              : "var(--line-strong)",
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-fg-4">{DOW_LETTER[o.dow]}</div>
                </div>
              ))}
              {!board && (
                <div className="flex h-full w-full items-center justify-center text-12 text-fg-3">
                  Loading outlook…
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-3.5">
          <Card className="p-4">
            <Eyebrow className="mb-2.5">Tasks</Eyebrow>
            {!board && <div className="py-2 text-12 text-fg-3">Loading…</div>}
            {(board?.tasks ?? []).map((t) => (
              <div
                key={t}
                className="flex items-start gap-2 border-b border-line-soft py-2 last:border-0"
              >
                <CheckSquare className="mt-0.5 h-3.5 w-3.5 flex-none text-fg-3" />
                <div className="flex-1 text-12 text-fg-2">{t}</div>
              </div>
            ))}
          </Card>
          <Card className="p-4">
            <Eyebrow className="mb-2.5">Activity</Eyebrow>
            {!board && <div className="py-1.5 text-12 text-fg-3">Loading…</div>}
            {board && board.activity.length === 0 && (
              <div className="py-1.5 text-12 text-fg-3">
                No recent activity logged.
              </div>
            )}
            {(board?.activity ?? []).map((ev) => (
              <div
                key={ev.at}
                className="flex gap-2.5 py-1.5 text-12 text-fg-2"
              >
                <span className="w-[38px] flex-none font-mono text-fg-3">
                  {ev.atLabel}
                </span>
                {ev.text}
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
