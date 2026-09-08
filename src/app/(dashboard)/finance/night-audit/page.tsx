"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useProperty } from "@/components/providers/PropertyProvider";
import { useCurrentMember } from "@/components/providers/useCurrentMember";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  DoorClosed,
  Receipt,
  CreditCard,
  FileSpreadsheet,
} from "lucide-react";
import { Card, Eyebrow } from "@/components/upx/primitives";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (isoDate: string) => {
  const d = new Date(isoDate + "T00:00:00Z");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const nextDay = (isoDate: string) => {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

const WARNINGS = [
  "2 folios have a negative balance — review before rolling the date.",
  "1 reservation marked in-house has no room assigned.",
];
const EXCEPTIONS = [
  { text: "Room 312 — rate override below floor (Rp 980,000 vs. floor Rp 1,400,000)", resolved: false },
  { text: "Guest folio RSV-8DZAAJ — deposit not applied", resolved: false },
  { text: "OTA settlement Agoda — Rp 42,000 rounding difference", resolved: true },
];
const addDaysIso = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dayLabel = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};
/** Prior closes, newest first, anchored to the current business date. */
const buildHistory = (businessDate: string) => [
  { date: `${dayLabel(addDaysIso(businessDate, -1))} 03:12`, summary: "Audit complete — 0 exceptions", status: "OK", color: "var(--accent-cyan)" },
  { date: `${dayLabel(addDaysIso(businessDate, -2))} 03:08`, summary: "Audit complete — 1 exception resolved", status: "OK", color: "var(--accent-cyan)" },
  { date: `${dayLabel(addDaysIso(businessDate, -3))} 03:44`, summary: "Manual re-run after POS outage", status: "Recovered", color: "var(--res-tentative)" },
  { date: `${dayLabel(addDaysIso(businessDate, -4))} 03:05`, summary: "Audit complete — 0 exceptions", status: "OK", color: "var(--accent-cyan)" },
];
const PROPERTY_STATUS = [
  { name: "Grand Samudra Bali", status: "In progress", color: "var(--res-tentative)" },
  { name: "Samudra Ubud (sister)", status: "Complete", color: "var(--accent-cyan)" },
  { name: "Samudra Canggu (sister)", status: "Scheduled 03:00", color: "var(--fg-3)" },
];

export default function NightAuditPage() {
  const { activeProperty } = useProperty();
  const member = useCurrentMember();
  const rollBusinessDate = useMutation(api.properties.rollBusinessDate);

  const AUDIT_ROLES = ["Night auditor", "General Manager"];
  const role = member?.role ?? null;
  const canRun = role ? AUDIT_ROLES.includes(role) : false;

  const [expanded, setExpanded] = useState<string | null>("Reconcile POS postings");
  const [resolved, setResolved] = useState<Set<number>>(new Set([2]));
  const [ranAll, setRanAll] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    from: string;
    to: string;
    days: number;
    roomsAssigned: number;
  } | null>(null);

  const businessDate = activeProperty?.businessDate ?? "2026-09-08";
  const HISTORY = buildHistory(businessDate);
  const lastAuditLabel = `${dayLabel(addDaysIso(businessDate, -1))}, 03:12`;
  const autoAudit = !!activeProperty?.autoNightAudit;
  const auditTime = activeProperty?.nightAuditTime ?? "03:00";

  // Wall-clock date in the property's timezone — what the business date should
  // reach once the audit is up to date.
  const wallToday = useMemo(() => {
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
  }, [activeProperty?.timezone]);

  const daysBehind = Math.max(
    0,
    Math.round(
      (Date.parse(wallToday + "T00:00:00Z") -
        Date.parse(businessDate + "T00:00:00Z")) /
        86400000
    )
  );
  // 1 day behind is the normal "audit hasn't run yet tonight" state; 2+ means a
  // close was missed and the date needs to catch up.
  const behind = daysBehind >= 2;

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!autoAudit) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [autoAudit]);
  const countdown = useMemo(() => {
    const [h, m] = auditTime.split(":").map(Number);
    const target = new Date(nowMs);
    target.setHours(h || 0, m || 0, 0, 0);
    if (target.getTime() <= nowMs) target.setDate(target.getDate() + 1);
    const diff = target.getTime() - nowMs;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(Math.floor(diff / 3600000))}:${pad(
      Math.floor((diff % 3600000) / 60000)
    )}:${pad(Math.floor((diff % 60000) / 1000))}`;
  }, [nowMs, auditTime]);

  const STEPS = [
    { icon: DoorClosed, label: "Post room & tax charges", detail: "Nightly room revenue and 21% service + tax posted to open folios.", alwaysDone: true, affected: undefined as { room: string; text: string }[] | undefined },
    { icon: Receipt, label: "Reconcile POS postings", detail: "F&B and outlet charges matched to folios.", alwaysDone: true, affected: [{ room: "204", text: "Ombak Restaurant · Rp 380,000 unmatched — posted to house account" }] },
    { icon: CreditCard, label: "Settle card batches", detail: "Card terminal batch closed and settled to bank.", alwaysDone: true, affected: undefined },
    { icon: RefreshCw, label: "Roll business date", detail: behind ? `Catch up ${daysBehind} days — advance from ${fmtDate(businessDate)} to ${fmtDate(wallToday)}, posting each day's departures.` : `Advance system date from ${fmtDate(businessDate)} to ${fmtDate(nextDay(businessDate))}.`, alwaysDone: false, affected: undefined },
    { icon: FileSpreadsheet, label: "Generate revenue journal", detail: "Trial balance and revenue journal exported to accounting.", alwaysDone: false, affected: undefined },
    { icon: Check, label: "Close audit & notify", detail: "Lock the day, email the manager report.", alwaysDone: false, affected: undefined },
  ];
  const stepDone = (s: (typeof STEPS)[number]) => s.alwaysDone || ranAll;
  const doneCount = STEPS.filter(stepDone).length;

  const runRemaining = async () => {
    if (!activeProperty || running || ranAll || !canRun) return;
    setRunning(true);
    const r = await rollBusinessDate(
      behind
        ? { id: activeProperty._id, toDate: wallToday }
        : { id: activeProperty._id }
    );
    setResult(r);
    setRanAll(true);
    setRunning(false);
  };

  return (
    <div className="mx-auto max-w-content">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="text-13 text-fg-3">Business date: {fmtDate(businessDate)}</div>
        {autoAudit ? (
          <div className="text-12 text-fg-3">
            Auto-run at <span className="font-mono text-fg-2">{auditTime}</span> — in{" "}
            <span className="font-mono font-semibold text-ice">{countdown}</span>
          </div>
        ) : (
          <div className="text-12 text-fg-3">
            Automatic night audit is <span className="text-fg-2">off</span> — run it manually
          </div>
        )}
        <div className="ml-auto text-12 text-fg-3">
          {result
            ? `Rolled ${fmtDate(result.from)} → ${fmtDate(result.to)} (${result.days} day${
                result.days === 1 ? "" : "s"
              })${
                result.roomsAssigned
                  ? ` · ${result.roomsAssigned} room${
                      result.roomsAssigned === 1 ? "" : "s"
                    } auto-assigned`
                  : ""
              }`
            : `${doneCount} of ${STEPS.length} steps complete`}
        </div>
        <button
          onClick={runRemaining}
          disabled={!activeProperty || running || ranAll || !canRun}
          className="rounded-sm bg-accent-violet px-3.5 py-2 text-[12.5px] font-medium text-ice hover:bg-accent-violet-hi disabled:opacity-40"
        >
          {running
            ? "Running…"
            : ranAll
              ? "Audit complete"
              : behind
                ? `Catch up ${daysBehind} days`
                : "Run remaining steps"}
        </button>
      </div>

      {behind && !ranAll && (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-md border border-room-ooo bg-ai-tint p-3 text-[12.5px] text-ice">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-room-ooo" />
          <div>
            Night audit is <strong>{daysBehind} days behind</strong> — last close was{" "}
            {fmtDate(businessDate)}. Running it now posts {daysBehind} days of departures and
            advances the business date to {fmtDate(wallToday)}. Until then, the calendar and all
            arrival/departure counts still show {fmtDate(businessDate)}.
          </div>
        </div>
      )}

      {member !== undefined && (
        canRun ? (
          <div className="mb-3.5 rounded-md border border-line bg-elevated p-3 text-[12.5px] text-fg-2">
            Signed in as <span className="text-ice">{role}</span> — you have permission to run
            the night audit.
          </div>
        ) : (
          <div className="mb-3.5 rounded-md border border-room-ooo bg-ai-tint p-3 text-[12.5px] text-ice">
            Only a Night auditor or General Manager can run this audit. You are signed in as{" "}
            {role ?? "a user with no role on this property"} — contact a manager to execute.
          </div>
        )
      )}

      <div className="mb-3.5 flex flex-col gap-2 rounded-lg border border-res-tentative bg-elevated p-3.5">
        <Eyebrow>Pre-audit warnings</Eyebrow>
        {WARNINGS.map((w) => (
          <div key={w} className="flex items-center gap-2.5 text-13">
            <AlertTriangle className="h-3.5 w-3.5 flex-none text-res-tentative" /> {w}
          </div>
        ))}
      </div>

      <Card className="mb-3.5 overflow-hidden p-0">
        {STEPS.map((s) => {
          const isOpen = expanded === s.label;
          const done = stepDone(s);
          return (
            <div key={s.label} className="border-b border-line-soft last:border-0">
              <button
                onClick={() => setExpanded(isOpen ? null : s.label)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <s.icon
                  className="h-[17px] w-[17px] flex-none"
                  style={{ color: done ? "var(--accent-cyan)" : "var(--fg-3)" }}
                />
                <div className="flex-1">
                  <div className="text-13 font-medium">{s.label}</div>
                  <div className="mt-0.5 text-12 text-fg-3">{s.detail}</div>
                </div>
                <span
                  className="text-[11px]"
                  style={{ color: done ? "var(--accent-cyan)" : "var(--fg-3)" }}
                >
                  {done ? "Done" : "Pending"}
                </span>
                {done && (
                  <span className="rounded-sm border border-line bg-fg-1/[0.06] px-2.5 py-1 text-[11px] text-fg-1">
                    Re-run
                  </span>
                )}
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 text-fg-3" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-fg-3" />
                )}
              </button>
              {isOpen && s.affected && (
                <div className="flex flex-col gap-1.5 px-4 pb-3.5 pl-[45px]">
                  {s.affected.map((a) => (
                    <div key={a.room} className="flex gap-2 text-12 text-fg-2">
                      <span className="font-mono text-fg-3">{a.room}</span>
                      {a.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <Eyebrow className="mb-2.5">Exceptions</Eyebrow>
      <Card className="mb-5 overflow-hidden p-0">
        {EXCEPTIONS.map((ex, i) => {
          const isResolved = ex.resolved || resolved.has(i);
          return (
            <div
              key={ex.text}
              className="flex items-center gap-3 border-b border-line-soft px-4 py-3 text-13 last:border-0"
            >
              <AlertTriangle className="h-3.5 w-3.5 flex-none text-room-ooo" />
              <div className="flex-1">{ex.text}</div>
              {isResolved ? (
                <span className="text-[11.5px] text-accent-cyan">Resolved</span>
              ) : (
                <button
                  onClick={() => setResolved((s) => new Set(s).add(i))}
                  className="rounded-sm border border-line bg-fg-1/[0.06] px-3 py-1.5 text-12"
                >
                  Resolve
                </button>
              )}
            </div>
          );
        })}
      </Card>

      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {[
          { label: "Room revenue posted", value: "Rp 42,600,000", tone: "" },
          { label: "Exceptions flagged", value: String(EXCEPTIONS.filter((e, i) => !e.resolved && !resolved.has(i)).length), tone: "rose" },
          { label: "Last successful audit", value: lastAuditLabel, tone: "" },
        ].map((m) => (
          <Card key={m.label} className="p-3.5">
            <Eyebrow>{m.label}</Eyebrow>
            <div
              className={`mt-1 font-mono text-18 font-semibold ${
                m.tone === "rose" ? "text-room-ooo" : "text-ice"
              }`}
            >
              {m.value}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <Eyebrow className="mb-2.5">Run history</Eyebrow>
          <Card className="overflow-hidden p-0">
            {HISTORY.map((h) => (
              <div
                key={h.date}
                className="flex items-center gap-3 border-b border-line-soft px-4 py-2.5 text-[12.5px] last:border-0"
              >
                <div className="w-[110px] font-mono text-fg-3">{h.date}</div>
                <div className="flex-1">{h.summary}</div>
                <span className="text-[11px]" style={{ color: h.color }}>
                  {h.status}
                </span>
              </div>
            ))}
          </Card>
        </div>
        <div>
          <Eyebrow className="mb-2.5">Multi-property status</Eyebrow>
          <Card className="overflow-hidden p-0">
            {PROPERTY_STATUS.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-2.5 border-b border-line-soft px-4 py-2.5 text-[12.5px] last:border-0"
              >
                <span className="h-[7px] w-[7px] rounded-pill" style={{ background: p.color }} />
                <div className="flex-1">{p.name}</div>
                <span style={{ color: p.color }}>{p.status}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
