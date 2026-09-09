"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { X, Sparkles } from "lucide-react";
import { Card, Eyebrow } from "@/components/upx/primitives";
import PmsDateChip from "@/components/common/PmsDateChip";
import { useProperty } from "@/components/providers/PropertyProvider";
import { useToast } from "@/components/providers/ToastProvider";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const parse = (iso: string) => new Date(iso + "T00:00:00Z");
const addIso = (iso: string, n: number) => {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const fmtDate = (iso: string) => {
  const d = parse(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const fmtRange = (startIso: string, nights: number) => {
  const a = parse(startIso);
  const b = parse(addIso(startIso, nights));
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[a.getUTCMonth()]} ${a.getUTCFullYear()}`
    : `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
};
const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((parse(toIso).getTime() - parse(fromIso).getTime()) / 86400000);
const inDays = (n: number) =>
  n <= 0 ? "passed" : n === 1 ? "in 1 day" : `in ${n} days`;

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
  const toast = useToast();
  const businessDate = activeProperty?.businessDate ?? "2026-09-08";
  const propArg = activeProperty ? { propertyId: activeProperty._id } : "skip";

  const groups = useQuery(api.groups.list, propArg);
  const createGroup = useMutation(api.groups.create);
  const addGuest = useMutation(api.groups.addRoomingGuest);
  const assignRoom = useMutation(api.reservations.assignOne);
  const recordDeposit = useMutation(api.groups.recordDeposit);
  const setBillingMode = useMutation(api.groups.setBillingMode);
  const releaseRooms = useMutation(api.groups.releaseRooms);
  const extendCutoff = useMutation(api.groups.extendCutoff);
  const [depositDraft, setDepositDraft] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [kindFilter, setKindFilter] = useState("All");
  const [openId, setOpenId] = useState<Id<"group_blocks"> | null>(null);
  const [addName, setAddName] = useState("");

  const detail = useQuery(
    api.groups.get,
    openId ? { groupId: openId } : "skip"
  );

  const rows = useMemo(
    () =>
      (groups ?? []).filter((g) => {
        if (status !== "All" && g.status !== status) return false;
        if (kindFilter === "Blocks" && g.kind === "transient") return false;
        if (kindFilter === "Parties" && g.kind !== "transient") return false;
        if (search && !g.name.toLowerCase().includes(search.toLowerCase()))
          return false;
        return true;
      }),
    [groups, search, status, kindFilter]
  );

  const g = detail ?? null;
  const isParty = g?.kind === "transient";
  const trendMax = g ? Math.max(...g.trend, 1) : 1;
  const cutoffDays = g ? daysBetween(businessDate, g.cutoffDate) : 0;
  const cutoffLabel = g
    ? cutoffDays <= 0
      ? "Passed"
      : fmtDate(g.cutoffDate)
    : "";
  const unpicked = g ? Math.max(0, g.blocked - g.picked) : 0;
  const cutoffMessage = g
    ? cutoffDays <= 0
      ? g.picked >= g.blocked
        ? "Fully picked up and past cut-off. Nothing to action."
        : `Cut-off has passed with ${unpicked} of ${g.blocked} rooms unpicked — release the remainder to general inventory.`
      : g.contractLabel === "Awaiting signature"
        ? `Contract unsigned with ${cutoffDays} days to cut-off. Hold expires automatically if not confirmed by ${fmtDate(addIso(g.cutoffDate, -7))}.`
        : `Cut-off is ${inDays(cutoffDays)}. ${unpicked} of ${g.blocked} blocked rooms are still unpicked — release them or extend the cut-off.`
    : "";

  const [showNew, setShowNew] = useState(false);

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
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          className="rounded-sm border border-line bg-elevated px-2.5 py-2 text-12 text-fg-2"
        >
          {["All", "Blocks", "Parties"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
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
        <button
          onClick={() => setShowNew(true)}
          className="rounded-sm bg-accent-violet px-3.5 py-2 text-13 font-medium text-ice hover:bg-accent-violet-hi"
        >
          + New group block
        </button>
      </div>

      {showNew && activeProperty && (
        <NewBlockModal
          propertyId={activeProperty._id}
          businessDate={businessDate}
          onClose={() => setShowNew(false)}
          onCreate={async (payload) => {
            await createGroup({ propertyId: activeProperty._id, ...payload });
            setShowNew(false);
            toast("Tentative group block created", "success");
          }}
        />
      )}

      <Card className="mb-5 overflow-x-auto p-0">
        <div className="min-w-[980px]">
          <div className={`${TABLE_GRID} border-b border-line py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3`}>
            <div>Group</div>
            <div>Dates</div>
            <div>Held / blocked</div>
            <div>Pick-up</div>
            <div>Status</div>
            <div>Contract</div>
            <div>Sales manager</div>
          </div>
          {groups === undefined && (
            <div className="px-4 py-4 text-13 text-fg-3">Loading…</div>
          )}
          {groups && rows.length === 0 && (
            <div className="px-4 py-4 text-13 text-fg-3">No group blocks match.</div>
          )}
          {rows.map((row) => {
            const party = row.kind === "transient";
            return (
              <button
                key={row.id}
                onClick={() => setOpenId(row.id)}
                className={`${TABLE_GRID} w-full items-center border-b border-line-soft py-3 text-left text-13 transition-colors last:border-0 hover:bg-elevated`}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate font-semibold">{row.name}</span>
                  <span
                    className="flex-none rounded-[3px] border px-1 text-[9px] font-bold uppercase"
                    style={{
                      color: party ? "var(--accent-cyan)" : "var(--group-hold)",
                      borderColor: party
                        ? "var(--accent-cyan)"
                        : "var(--group-hold)",
                    }}
                  >
                    {party ? "Party" : "Block"}
                  </span>
                </div>
                <div className="whitespace-nowrap text-12 text-fg-3">
                  {fmtRange(row.startDate, row.nights)}
                </div>
                <div className="font-mono">
                  {party ? (
                    <span className="text-fg-3">{row.blocked} rm</span>
                  ) : row.released ? (
                    <span className="text-fg-3">released</span>
                  ) : (
                    <>
                      <span className="text-group-hold">{row.held}</span>
                      <span className="text-fg-3"> / {row.blocked}</span>
                    </>
                  )}
                </div>
                <div className="font-mono text-accent-cyan">
                  {party ? `${row.picked} rooms` : `${row.picked} · ${row.pickupPct}`}
                </div>
                <div>
                  <span className="rounded-pill border border-line bg-fg-1/[0.06] px-2.5 py-[3px] text-[11px] text-fg-2">
                    {row.released ? "Released" : row.status}
                  </span>
                </div>
                <div
                  className="whitespace-nowrap text-12"
                  style={{ color: row.contractColor }}
                >
                  {party ? row.billingMode : row.contractLabel}
                </div>
                <div className="text-12 text-fg-3">
                  {party ? row.externalRef ?? "—" : row.salesManager}
                </div>
              </button>
            );
          })}
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
            <button
              onClick={async () => {
                if (!activeProperty) return;
                await createGroup({
                  propertyId: activeProperty._id,
                  name: w.name,
                  startDate: addIso(businessDate, 54),
                  nights: 2,
                  roomType: "Double Queen",
                  blocked: w.rooms,
                  rate: "Rp 1,750,000",
                  contact: w.contact,
                });
                toast(`Converted “${w.name}” inquiry to a tentative block`, "success");
              }}
              className="rounded-sm border border-line bg-fg-1/[0.06] px-3 py-1.5 text-12 hover:border-line-strong"
            >
              Convert to block
            </button>
          </div>
        ))}
      </Card>

      {openId && (
        <>
          <div onClick={() => setOpenId(null)} className="fixed inset-0 z-30 bg-deepest/70 backdrop-blur-[6px]" />
          <div className="upx-scroll fixed right-0 top-0 bottom-0 z-40 flex w-[520px] max-w-[95vw] flex-col gap-4 overflow-y-auto border-l border-line bg-deep p-6 shadow-3">
            {!g ? (
              <div className="text-13 text-fg-3">Loading…</div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-18 font-bold text-ice">
                        {g.name}
                      </span>
                      <span
                        className="rounded-[3px] border px-1 text-[9px] font-bold uppercase"
                        style={{
                          color: isParty
                            ? "var(--accent-cyan)"
                            : "var(--group-hold)",
                          borderColor: isParty
                            ? "var(--accent-cyan)"
                            : "var(--group-hold)",
                        }}
                      >
                        {isParty ? "Party" : "Block"}
                      </span>
                    </div>
                    <div className="mt-1 text-[12.5px] text-fg-3">
                      {fmtRange(g.startDate, g.nights)}
                      {isParty
                        ? ` · ${g.blocked} rooms${
                            g.externalRef ? ` · ${g.externalRef}` : ""
                          }`
                        : ` · Cut-off ${cutoffLabel}`}
                    </div>
                  </div>
                  <button onClick={() => setOpenId(null)} className="text-fg-3 hover:text-ice" aria-label="Close">
                    <X className="h-[18px] w-[18px]" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { label: g.status, color: "var(--line)", fg: "var(--fg-2)" },
                    !isParty && {
                      label: g.contractLabel,
                      color: g.contractColor,
                      fg: g.contractColor,
                    },
                    { label: `Deposit: ${g.depositStatus}`, color: "var(--line)", fg: "var(--fg-2)" },
                  ]
                    .filter(Boolean)
                    .map((chip) => chip as { label: string; color: string; fg: string })
                    .map((chip) => (
                    <span
                      key={chip.label}
                      className="whitespace-nowrap rounded-pill border bg-fg-1/[0.06] px-2.5 py-1 text-[11px] font-medium"
                      style={{ borderColor: chip.color, color: chip.fg }}
                    >
                      {chip.label}
                    </span>
                  ))}
                </div>

                {!isParty && (
                <Card className="p-3.5">
                  <div className="mb-2 flex items-baseline justify-between">
                    <Eyebrow>Pick-up &amp; wash forecast</Eyebrow>
                    <button
                      onClick={async () => {
                        const iso7 = addIso(g.cutoffDate, 7);
                        try {
                          await extendCutoff({
                            groupId: g.id,
                            toDate: iso7,
                            reason: "Extended from group detail",
                          });
                          toast(`Cut-off moved to ${fmtDate(iso7)}`, "success");
                        } catch (e) {
                          toast(
                            e instanceof Error ? e.message : "Could not extend",
                            "error"
                          );
                        }
                      }}
                      className="rounded-sm border border-line px-2 py-1 text-[11px] text-fg-2 hover:border-line-strong"
                    >
                      Extend cut-off +7d
                    </button>
                  </div>
                  <div className="flex h-14 items-end gap-1.5">
                    {g.trend.map((t, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-[2px] bg-accent-violet"
                        style={{ height: `${(t / trendMax) * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-fg-3">
                    <span>
                      Picked{" "}
                      <span className="font-mono text-fg-1">
                        {g.picked} / {g.blocked}
                      </span>{" "}
                      · {g.pickupPct}
                    </span>
                    <span>
                      Pace{" "}
                      <span className="font-mono text-fg-1">
                        {g.pacePerDay}/day
                      </span>
                    </span>
                    <span>
                      Projected at cut-off{" "}
                      <span className="font-mono text-accent-cyan">
                        {g.projectedPickup}
                      </span>{" "}
                      · wash{" "}
                      <span className="font-mono text-res-tentative">
                        {g.projectedWash}
                      </span>
                    </span>
                    <span>
                      Cut-off{" "}
                      <span className="font-mono text-fg-1">
                        {g.cutoffDays <= 0 ? "passed" : `in ${g.cutoffDays}d`}
                      </span>
                    </span>
                  </div>
                  {g.attritionShortfall > 0 && (
                    <div className="mt-1.5 rounded-sm border border-res-tentative bg-elevated px-2 py-1 text-[11px] text-res-tentative">
                      Projected {g.projectedPickup} below the{" "}
                      {g.guaranteed}-room guarantee — {g.attritionShortfall}-room
                      attrition exposure.
                    </div>
                  )}
                </Card>
                )}

                <Card className="p-3.5">
                  <Eyebrow className="mb-2">
                    {isParty ? "Booking value" : "Block P&L"}
                  </Eyebrow>
                  <div className="flex flex-col gap-1 text-[12.5px]">
                    <Line
                      k={`Room revenue · ${g.pnl.roomNights} rn @ ${g.pnl.adrLabel}`}
                      v={g.pnl.roomRevenueLabel}
                    />
                    <Line k="F&B / meeting minimum" v={g.pnl.fbMinimumLabel} />
                    <Line
                      k="Comp rooms (1 per 25)"
                      v={`(${g.pnl.compCostLabel})`}
                      muted
                    />
                    <Line
                      k={`Displaced transient · ${g.pnl.displacedRoomNights} rn`}
                      v={`(${g.pnl.displacementCostLabel})`}
                      muted
                    />
                    <div className="mt-1 flex justify-between border-t border-line-soft pt-1 font-semibold">
                      <span>Net contribution</span>
                      <span
                        className="font-mono"
                        style={{
                          color:
                            g.pnl.netContribution >= 0
                              ? "var(--accent-cyan)"
                              : "var(--room-ooo)",
                        }}
                      >
                        {g.pnl.netContributionLabel}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[10.5px] text-fg-4">
                      Displacement counts held rooms on nights transient demand
                      alone would fill ≥ 75% of the type, valued at BAR − group
                      rate.
                    </div>
                  </div>
                </Card>

                <div>
                  <Eyebrow className="mb-2">
                    {isParty ? "Rooms" : "Sub-blocks"}
                  </Eyebrow>
                  <Card className="overflow-hidden p-0">
                    <div
                      className={`grid ${
                        isParty
                          ? "grid-cols-[1.4fr_0.6fr_0.9fr]"
                          : "grid-cols-[1.1fr_0.6fr_0.6fr_0.6fr_0.9fr_0.8fr]"
                      } border-b border-line px-3.5 py-2 text-[10.5px] uppercase tracking-[0.06em] text-fg-3`}
                    >
                      <div>Room type</div>
                      <div>{isParty ? "Qty" : "Blocked"}</div>
                      {!isParty && <div>Picked</div>}
                      {!isParty && <div>Held</div>}
                      <div>Rate</div>
                      {!isParty && <div />}
                    </div>
                    {g.subBlocks.map((sb) => (
                      <div
                        key={sb.roomType}
                        className={`grid ${
                          isParty
                            ? "grid-cols-[1.4fr_0.6fr_0.9fr]"
                            : "grid-cols-[1.1fr_0.6fr_0.6fr_0.6fr_0.9fr_0.8fr]"
                        } items-center border-b border-line-soft px-3.5 py-2.5 text-[12.5px] last:border-0`}
                      >
                        <div className="font-medium">{sb.roomType}</div>
                        <div className="font-mono">{sb.blocked}</div>
                        {!isParty && (
                          <div className="font-mono text-accent-cyan">{sb.picked}</div>
                        )}
                        {!isParty && (
                          <div className="font-mono text-group-hold">
                            {g.released ? "—" : sb.held}
                          </div>
                        )}
                        <div className="font-mono text-[11px]">{sb.rate}</div>
                        {!isParty && (
                        <div className="text-right">
                          {!g.released && sb.held > 0 && (
                            <button
                              onClick={async () => {
                                try {
                                  const r = await releaseRooms({
                                    subBlockId: sb.subBlockId,
                                    count: sb.held,
                                  });
                                  toast(
                                    `Released ${r.released} ${sb.roomType}`,
                                    "success"
                                  );
                                } catch (e) {
                                  toast(
                                    e instanceof Error
                                      ? e.message
                                      : "Could not release",
                                    "error"
                                  );
                                }
                              }}
                              className="rounded-sm border border-line px-2 py-0.5 text-[10.5px] text-fg-2 hover:border-line-strong"
                            >
                              Release {sb.held}
                            </button>
                          )}
                        </div>
                        )}
                      </div>
                    ))}
                  </Card>
                </div>

                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <Eyebrow>Rooming list</Eyebrow>
                    <span className="text-[11px] text-fg-3">{g.rooming.length} names</span>
                  </div>
                  <Card className="overflow-hidden p-0">
                    {g.rooming.length === 0 && (
                      <div className="px-3.5 py-3 text-[12px] text-fg-3">
                        No names on the rooming list yet.
                      </div>
                    )}
                    {g.rooming.map((rm) => (
                      <div
                        key={rm.reservationId}
                        className="flex items-center gap-2.5 border-b border-line-soft px-3.5 py-2.5 text-[12.5px] last:border-0"
                      >
                        <div className="flex-1 font-medium">{rm.guest}</div>
                        <div className="w-[110px] text-fg-3">{rm.roomType}</div>
                        <div
                          className="w-[60px] font-mono"
                          style={{ color: rm.assigned ? "var(--fg-1)" : "var(--res-tentative)" }}
                        >
                          {rm.roomLabel}
                        </div>
                        <button
                          disabled={rm.assigned}
                          onClick={async () => {
                            await assignRoom({ id: rm.reservationId });
                            toast(`Room assigned for ${rm.guest}`, "success");
                          }}
                          className="rounded-sm border border-line bg-fg-1/[0.06] px-2.5 py-1 text-[11px] hover:border-line-strong disabled:opacity-40"
                        >
                          {rm.assigned ? "Assigned" : "Assign"}
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2 px-3.5 py-2.5">
                      <input
                        value={addName}
                        onChange={(e) => setAddName(e.target.value)}
                        placeholder="Add guest name…"
                        className="flex-1 rounded-sm border border-line bg-deep px-2.5 py-1.5 text-[12px] text-ice outline-none focus:border-accent-violet"
                      />
                      <button
                        onClick={async () => {
                          if (!addName.trim()) return;
                          await addGuest({
                            groupId: g.id,
                            guestName: addName.trim(),
                            roomType: g.subBlocks[0]?.roomType ?? "Double Queen",
                          });
                          setAddName("");
                          toast("Added to the rooming list", "success");
                        }}
                        className="rounded-sm bg-accent-violet px-3 py-1.5 text-[11.5px] font-medium text-ice hover:bg-accent-violet-hi"
                      >
                        Add
                      </button>
                    </div>
                  </Card>
                </div>

                <Card className="flex flex-col gap-2 p-3.5">
                  <Eyebrow>Billing &amp; concessions</Eyebrow>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="text-fg-3">Billing method</span>
                    <select
                      value={g.billingMode}
                      onChange={async (e) => {
                        try {
                          await setBillingMode({
                            groupId: g.id,
                            mode: e.target.value,
                          });
                          toast(`Billing set to ${e.target.value}`, "success");
                        } catch (err) {
                          toast(
                            err instanceof Error ? err.message : "Failed",
                            "error"
                          );
                        }
                      }}
                      className="rounded-sm border border-line bg-ink px-2 py-1 text-12 text-ice outline-none focus:border-accent-violet"
                    >
                      <option value="individual">Individual folios</option>
                      <option value="master">One folio — all rooms</option>
                      <option value="split">Split — room to guests</option>
                    </select>
                  </div>
                  <div className="text-[11px] text-fg-4">{g.billing}</div>
                  {g.master.hasAccount && (
                    <div className="rounded-md border border-line bg-deep p-2.5 text-[12px]">
                      <div className="mb-1 text-[10.5px] uppercase tracking-wide text-fg-3">
                        Master account
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fg-3">Charges</span>
                        <span className="font-mono">{g.master.chargesLabel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fg-3">Deposit / paid</span>
                        <span className="font-mono text-accent-cyan">
                          {g.master.paidLabel}
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between border-t border-line-soft pt-1 font-semibold">
                        <span>Outstanding</span>
                        <span className="font-mono">
                          {g.master.outstandingLabel}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="text-fg-3">
                      Deposit{" "}
                      <span className="font-mono text-fg-2">
                        {g.depositAmount}
                      </span>{" "}
                      · {g.depositStatus}
                    </span>
                    <span className="flex gap-1.5">
                      <input
                        value={depositDraft}
                        onChange={(e) => setDepositDraft(e.target.value)}
                        placeholder="Rp amount"
                        className="w-[110px] rounded-sm border border-line bg-deep px-2 py-1 font-mono text-[11.5px] text-ice outline-none focus:border-accent-violet"
                      />
                      <button
                        onClick={async () => {
                          const amt = Number(depositDraft.replace(/[^\d]/g, ""));
                          if (!amt) return;
                          try {
                            await recordDeposit({
                              groupId: g.id,
                              amount: amt,
                              method: "Bank transfer",
                            });
                            setDepositDraft("");
                            toast("Deposit recorded", "success");
                          } catch (e) {
                            toast(
                              e instanceof Error ? e.message : "Could not record",
                              "error"
                            );
                          }
                        }}
                        className="rounded-sm bg-accent-violet px-2.5 py-1 text-[11.5px] font-medium text-ice hover:bg-accent-violet-hi"
                      >
                        Record
                      </button>
                    </span>
                  </div>
                  {!isParty && g.guaranteedPct !== null && (
                    <div className="text-[11.5px] text-fg-3">
                      Attrition guarantee: {Math.round(g.guaranteedPct * 100)}% ·
                      F&amp;B minimum{" "}
                      {g.fbMinimum
                        ? `Rp ${g.fbMinimum.toLocaleString("en-US")}`
                        : "none"}
                    </div>
                  )}
                  <div className="mt-1 text-[12.5px] text-fg-2">{g.concessions}</div>
                </Card>

                <Card className="flex flex-col gap-1.5 p-3.5">
                  <Eyebrow>{isParty ? "Booker" : "Contact & sales"}</Eyebrow>
                  <div className="text-[12.5px]">{g.contact || "—"}</div>
                  {!isParty && (
                    <div className="text-12 text-fg-3">
                      Sales manager: {g.salesManager}
                    </div>
                  )}
                </Card>

                {!isParty && (
                  <div className="flex items-start gap-2 rounded-md border border-ai-edge bg-ai-tint p-3 text-[12.5px] text-ice">
                    <Sparkles className="mt-px h-[15px] w-[15px] flex-none text-ai-fg" />
                    {cutoffMessage}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function NewBlockModal({
  propertyId,
  businessDate,
  onClose,
  onCreate,
}: {
  propertyId: Id<"properties">;
  businessDate: string;
  onClose: () => void;
  onCreate: (p: {
    name: string;
    startDate: string;
    nights: number;
    roomType: string;
    blocked: number;
    rate: string;
  }) => Promise<void>;
}) {
  const roomTypes = useQuery(api.rates.getRoomTypes, { propertyId });
  const typeNames = (roomTypes ?? []).map((t) => t.name);
  const [name, setName] = useState("");
  const [roomType, setRoomType] = useState("");
  const effectiveType = roomType || typeNames[0] || "Double Queen";
  const [startDate, setStartDate] = useState(addIso(businessDate, 30));
  const [nights, setNights] = useState(2);
  const [blocked, setBlocked] = useState(8);
  const [rate, setRate] = useState("1,850,000");
  const [busy, setBusy] = useState(false);

  const check = useQuery(api.groups.checkBlockAvailability, {
    propertyId,
    roomType: effectiveType,
    startDate,
    nights: Math.max(1, nights),
    blocked: Math.max(0, blocked),
  });

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-deepest/70 backdrop-blur-[6px]" />
      <div className="fixed left-1/2 top-1/2 z-50 w-[460px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-deep p-5 shadow-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-display text-16 font-bold text-ice">New group block</div>
          <button onClick={onClose} className="text-fg-3 hover:text-ice" aria-label="Close">
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            className="rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-ice outline-none focus:border-accent-violet"
          />
          <div className="grid grid-cols-2 gap-2.5">
            <select
              value={effectiveType}
              onChange={(e) => setRoomType(e.target.value)}
              className="rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-fg-2"
            >
              {typeNames.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <input
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="Nightly rate"
              className="rounded-sm border border-line bg-ink px-2.5 py-2 font-mono text-13 text-ice outline-none focus:border-accent-violet"
            />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <label className="flex flex-col gap-1 text-[11px] text-fg-3">
              Start
              <input
                type="date"
                value={startDate}
                onChange={(e) => e.target.value && setStartDate(e.target.value)}
                className="rounded-sm border border-line bg-ink px-2 py-1.5 font-mono text-[12px] text-ice"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-fg-3">
              Nights
              <input
                type="number"
                min={1}
                value={nights}
                onChange={(e) => setNights(Number(e.target.value))}
                className="rounded-sm border border-line bg-ink px-2 py-1.5 font-mono text-[12px] text-ice"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-fg-3">
              Rooms
              <input
                type="number"
                min={1}
                value={blocked}
                onChange={(e) => setBlocked(Number(e.target.value))}
                className="rounded-sm border border-line bg-ink px-2 py-1.5 font-mono text-[12px] text-ice"
              />
            </label>
          </div>

          {check && (
            <div
              className="rounded-md border px-3 py-2 text-[11.5px]"
              style={{
                borderColor:
                  check.oversellBy > 0 ? "var(--room-ooo)" : "var(--line)",
                color: check.oversellBy > 0 ? "var(--room-ooo)" : "var(--fg-2)",
              }}
            >
              Tightest night {check.tightestDate}: {check.sellable} sellable ·{" "}
              {check.committed} committed · {check.otherHeld} held by other groups
              → <span className="font-mono">{check.free} free</span>
              {check.oversellBy > 0 && (
                <span className="font-mono">
                  {" "}
                  · oversells by {check.oversellBy}
                </span>
              )}
            </div>
          )}

          <button
            disabled={!name.trim() || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onCreate({
                  name: name.trim(),
                  startDate,
                  nights: Math.max(1, nights),
                  roomType: effectiveType,
                  blocked: Math.max(1, blocked),
                  rate: `Rp ${rate.replace(/[^\d]/g, "")}`,
                });
              } finally {
                setBusy(false);
              }
            }}
            className="mt-1 rounded-sm bg-accent-violet px-3 py-2.5 text-13 font-semibold text-ice hover:bg-accent-violet-hi disabled:opacity-40"
          >
            {busy
              ? "Creating…"
              : check && check.oversellBy > 0
                ? `Create anyway (oversells ${check.oversellBy})`
                : "Create block"}
          </button>
        </div>
      </div>
    </>
  );
}

function Line({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-fg-3">{k}</span>
      <span className={`font-mono ${muted ? "text-fg-3" : "text-fg-1"}`}>{v}</span>
    </div>
  );
}
