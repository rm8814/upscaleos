"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useProperty } from "@/components/providers/PropertyProvider";
import { useCurrentMember } from "@/components/providers/useCurrentMember";
import { useAccount } from "@/components/providers/useAccount";
import { roleLabel } from "@/lib/roles";
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
const PROPERTY_STATUS = [
  { name: "Grand Samudra Bali", status: "In progress", color: "var(--res-tentative)" },
  { name: "Samudra Ubud (sister)", status: "Complete", color: "var(--accent-cyan)" },
  { name: "Samudra Canggu (sister)", status: "Scheduled 03:00", color: "var(--fg-3)" },
];

export default function NightAuditPage() {
  const { activeProperty } = useProperty();
  const member = useCurrentMember();
  const { accountRole } = useAccount();
  const rollBusinessDate = useMutation(api.properties.rollBusinessDate);
  const skipAudit = useMutation(api.properties.skipScheduledAudit);
  const readiness = useQuery(
    api.properties.nightAuditReadiness,
    activeProperty ? { id: activeProperty._id } : "skip"
  );

  // Account owner/admin, or a property GM / night auditor, may run the audit.
  const AUDIT_PROPERTY_ROLES = ["gm", "night_auditor"];
  const role = member?.role ?? null;
  const canRun =
    accountRole === "owner" ||
    accountRole === "admin" ||
    (role ? AUDIT_PROPERTY_ROLES.includes(role) : false);

  const [expanded, setExpanded] = useState<string | null>("Reconcile POS postings");
  const [resolved, setResolved] = useState<Set<number>>(new Set([2]));
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    from: string;
    to: string;
    days: number;
    roomsAssigned: number;
    noShows?: number;
    overstaysClosed?: number;
    blocksReleased?: number;
    balanced?: boolean;
    outOfBalance?: { date: string; variance: number }[];
  } | null>(null);
  const daysBehind = readiness?.daysBehind ?? 0;
  const blockers = readiness?.blockers ?? [];
  const upToDate = !!readiness && daysBehind === 0;
  const ranAll = upToDate && !!result;

  const businessDate = activeProperty?.businessDate ?? "2026-09-08";
  const stats = useQuery(
    api.history.dailyStats,
    activeProperty ? { propertyId: activeProperty._id, limit: 30 } : "skip"
  );
  const lastClose = stats?.[0];
  const journal = useQuery(
    api.history.revenueJournal,
    activeProperty && lastClose
      ? { propertyId: activeProperty._id, date: lastClose.date }
      : "skip"
  );
  const lastAuditLabel = lastClose
    ? `${dayLabel(lastClose.date)}, ${new Date(lastClose.closedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "—";
  const roomRevenuePosted = lastClose?.roomRevenueLabel ?? "—";
  const autoAudit = !!activeProperty?.autoNightAudit;
  const auditTime = activeProperty?.nightAuditTime ?? "03:00";

  const wallToday = readiness?.wallDate ?? businessDate;
  // 2+ days behind means one or more closes were missed — bulk catch-up shows.
  const behind = daysBehind >= 2;
  const canBulk = !!readiness?.canBulk;

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
    { icon: DoorClosed, label: "Post room & tax charges", detail: "Nightly room revenue and each configured tax posted to open folios.", alwaysDone: true, affected: undefined as { room: string; text: string }[] | undefined },
    { icon: Receipt, label: "Reconcile POS postings", detail: "F&B and outlet charges matched to folios.", alwaysDone: true, affected: [{ room: "204", text: "Ombak Restaurant · Rp 380,000 unmatched — posted to house account" }] },
    { icon: CreditCard, label: "Settle card batches", detail: "Card terminal batch closed and settled to bank.", alwaysDone: true, affected: undefined },
    { icon: RefreshCw, label: "Roll business date", detail: behind ? `Catch up ${daysBehind} days — advance from ${fmtDate(businessDate)} to ${fmtDate(wallToday)}, posting each day's departures.` : `Advance system date from ${fmtDate(businessDate)} to ${fmtDate(nextDay(businessDate))}.`, alwaysDone: false, affected: undefined },
    { icon: FileSpreadsheet, label: "Generate revenue journal", detail: "Trial balance and revenue journal exported to accounting.", alwaysDone: false, affected: undefined },
    { icon: Check, label: "Close audit & notify", detail: "Lock the day, email the manager report.", alwaysDone: false, affected: undefined },
  ];
  const stepDone = (s: (typeof STEPS)[number]) => s.alwaysDone || ranAll;
  const doneCount = STEPS.filter(stepDone).length;

  const run = async (mode: "one" | "bulk") => {
    if (!activeProperty || running || !canRun) return;
    setRunning(true);
    setRunError(null);
    try {
      const r = await rollBusinessDate({ id: activeProperty._id, mode });
      setResult(r);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Night audit failed");
    }
    setRunning(false);
  };

  const toggleSkip = async () => {
    if (!activeProperty) return;
    await skipAudit({
      id: activeProperty._id,
      skip: !readiness?.autoSkippedToday,
    });
  };

  return (
    <div className="mx-auto max-w-content">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="text-13 text-fg-3">Business date: {fmtDate(businessDate)}</div>
        {autoAudit ? (
          readiness?.autoSkippedToday ? (
            <div className="text-12 text-res-tentative">
              Auto night audit <span className="font-semibold">skipped tonight</span> — run manually
            </div>
          ) : (
            <div className="text-12 text-fg-3">
              Auto-run at <span className="font-mono text-fg-2">{auditTime}</span> — in{" "}
              <span className="font-mono font-semibold text-ice">{countdown}</span>
            </div>
          )
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
              }${result.noShows ? ` · ${result.noShows} no-show${result.noShows === 1 ? "" : "s"}` : ""}${
                result.overstaysClosed
                  ? ` · ${result.overstaysClosed} overstay${result.overstaysClosed === 1 ? "" : "s"} closed`
                  : ""
              }${
                result.balanced === false
                  ? " · ⚠ trial balance off"
                  : result.balanced
                    ? " · trial balance OK"
                    : ""
              }`
            : upToDate
              ? "Business date is current"
              : `${daysBehind} day${daysBehind === 1 ? "" : "s"} to close`}
        </div>

        {autoAudit && !upToDate && (
          <button
            onClick={toggleSkip}
            className="rounded-sm border border-line bg-fg-1/[0.06] px-3 py-2 text-[12.5px] text-fg-1 hover:border-line-strong"
          >
            {readiness?.autoSkippedToday ? "Un-skip tonight" : "Skip tonight's audit"}
          </button>
        )}
        {behind && (
          <button
            onClick={() => run("bulk")}
            disabled={!canRun || running || !canBulk}
            title={
              canBulk
                ? ""
                : `Clear before bulk run: ${blockers.map((b) => b.text).join("; ")}`
            }
            className="rounded-sm border border-accent-violet bg-violet-wash px-3 py-2 text-[12.5px] font-medium text-ice hover:bg-elevated disabled:opacity-40"
          >
            {running ? "Running…" : `Bulk run ${daysBehind} days`}
          </button>
        )}
        <button
          onClick={() => run("one")}
          disabled={!activeProperty || running || upToDate || !canRun}
          className="rounded-sm bg-accent-violet px-3.5 py-2 text-[12.5px] font-medium text-ice hover:bg-accent-violet-hi disabled:opacity-40"
        >
          {running
            ? "Running…"
            : upToDate
              ? "Up to date"
              : `Roll one day → ${dayLabel(readiness?.nextDate ?? nextDay(businessDate))}`}
        </button>
      </div>

      {runError && (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-md border border-room-ooo bg-ai-tint p-3 text-[12.5px] text-ice">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-room-ooo" />
          {runError}
        </div>
      )}

      {behind && !upToDate && (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-md border border-room-ooo bg-ai-tint p-3 text-[12.5px] text-ice">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-room-ooo" />
          <div>
            Night audit is <strong>{daysBehind} days behind</strong> — last close
            was {fmtDate(businessDate)}. The default <strong>Roll one day</strong>{" "}
            advances one date per click; use <strong>Bulk run</strong> to close
            all {daysBehind} days at once (only when nothing is pending). Until
            the date reaches {fmtDate(wallToday)}, the calendar and all
            arrival/departure counts still show {fmtDate(businessDate)}.
          </div>
        </div>
      )}

      {member !== undefined &&
        (canRun ? (
          <div className="mb-3.5 rounded-md border border-line bg-elevated p-3 text-[12.5px] text-fg-2">
            You have permission to run the night audit
            {role ? (
              <>
                {" "}as <span className="text-ice">{roleLabel(role)}</span>
              </>
            ) : accountRole ? (
              <>
                {" "}as <span className="text-ice">account {accountRole}</span>
              </>
            ) : null}
            .
          </div>
        ) : (
          <div className="mb-3.5 rounded-md border border-room-ooo bg-ai-tint p-3 text-[12.5px] text-ice">
            Only a night auditor or GM (or an account owner/admin) can run this
            audit. Contact a manager to execute.
          </div>
        ))}

      <div
        className={`mb-3.5 flex flex-col gap-2 rounded-lg border bg-elevated p-3.5 ${
          blockers.length ? "border-res-tentative" : "border-line"
        }`}
      >
        <Eyebrow>
          Pre-audit checks
          {blockers.length === 0 && (
            <span className="ml-2 text-[11px] font-normal text-accent-cyan">
              all clear — bulk run available
            </span>
          )}
        </Eyebrow>
        {blockers.length === 0 ? (
          <div className="flex items-center gap-2.5 text-13 text-fg-3">
            <Check className="h-3.5 w-3.5 flex-none text-accent-cyan" />
            Nothing pending — rooms assigned, housekeeping caught up, prior
            closes balanced.
          </div>
        ) : (
          blockers.map((b) => (
            <div key={b.code} className="flex items-center gap-2.5 text-13">
              <AlertTriangle className="h-3.5 w-3.5 flex-none text-res-tentative" />{" "}
              {b.text}
            </div>
          ))
        )}
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
              {isOpen && s.label === "Generate revenue journal" && (
                <div className="px-4 pb-4 pl-[45px]">
                  {!journal ? (
                    <div className="text-12 text-fg-3">
                      Runs when the business date rolls — the journal covers the
                      night that just closed.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-md border border-line">
                      <div className="grid grid-cols-[60px_1fr_1fr_auto] gap-2 border-b border-line bg-deep px-3 py-2 text-[10.5px] uppercase tracking-[0.06em] text-fg-3">
                        <div>GL</div>
                        <div>Account</div>
                        <div>Code</div>
                        <div className="text-right">Amount</div>
                      </div>
                      {journal.rows.map((r) => (
                        <div
                          key={r.code}
                          className="grid grid-cols-[60px_1fr_1fr_auto] gap-2 border-b border-line-soft px-3 py-1.5 text-[12px] last:border-0"
                        >
                          <div className="font-mono text-fg-3">{r.gl}</div>
                          <div>{r.label}</div>
                          <div className="font-mono text-fg-3">
                            {r.code} · {r.count}
                          </div>
                          <div className="text-right font-mono">{r.amountLabel}</div>
                        </div>
                      ))}
                      <div className="flex flex-col gap-1 bg-deep px-3 py-2 text-[12px]">
                        <Row3 label="Revenue" value={journal.revenueLabel} />
                        <Row3 label="Taxes collected" value={journal.taxesLabel} />
                        <Row3 label="Settlement" value={journal.settlementLabel} />
                        <div className="mt-1 border-t border-line pt-1">
                          <Row3
                            label="To guest / city ledger"
                            value={journal.arMovementLabel}
                            strong
                          />
                        </div>
                      </div>
                    </div>
                  )}
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
          { label: "Room revenue (last close)", value: roomRevenuePosted, tone: "" },
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
            {stats === undefined && (
              <div className="px-4 py-4 text-13 text-fg-3">Loading…</div>
            )}
            {stats && stats.length === 0 && (
              <div className="px-4 py-4 text-13 text-fg-3">
                No closed business dates yet — run the audit to write the first.
              </div>
            )}
            {(stats ?? []).map((h) => (
              <div
                key={h.date}
                className="flex items-center gap-3 border-b border-line-soft px-4 py-2.5 text-[12.5px] last:border-0"
              >
                <div className="w-[74px] font-mono text-fg-3">{dayLabel(h.date)}</div>
                <div className="flex-1">
                  {h.roomsSold} sold · {h.occupancyPct}% · ADR {h.adrLabel}
                </div>
                <span
                  className="text-[11px]"
                  style={{
                    color: h.balanced
                      ? "var(--accent-cyan)"
                      : "var(--room-ooo)",
                  }}
                >
                  {h.balanced ? "Balanced" : `Off ${h.varianceLabel}`}
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

function Row3({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={strong ? "font-semibold text-ice" : "text-fg-3"}>
        {label}
      </span>
      <span
        className={`font-mono ${strong ? "text-14 font-semibold text-ice" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
