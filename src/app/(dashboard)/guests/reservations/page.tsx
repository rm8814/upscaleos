"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useProperty } from "@/components/providers/PropertyProvider";
import { downloadCsv } from "@/lib/csv";
import { FileSpreadsheet } from "lucide-react";
import {
  Card,
  RES_STATUS_COLOR,
  RES_STATUS_LABEL,
} from "@/components/upx/primitives";
import ReservationSlideOver from "@/components/guests/ReservationSlideOver";
import PmsDateChip from "@/components/common/PmsDateChip";
import { ChevronRight, ChevronDown } from "lucide-react";

const PAGE_SIZES = [10, 50, 100];
const parseRp = (s: string) => Number((s ?? "").replace(/[^\d]/g, "")) || 0;
const fmtRp = (n: number) => `Rp ${Math.round(n).toLocaleString("en-US")}`;
// Guest · RSV · Booked · Arrival · Departure · Source · Room type · Room · Status · Value · action
const GRID =
  "grid grid-cols-[1.6fr_1fr_0.95fr_0.85fr_0.85fr_1fr_1.1fr_0.6fr_0.9fr_1fr_0.8fr] items-center gap-3 px-4 min-w-[1260px]";

type Tab = "arrivals" | "inhouse" | "departures" | "all";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const shortDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};
const bookedDate = (ms: number) => {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
};

type Row = {
  _id: string;
  _creationTime: number;
  guestName: string;
  checkIn: string;
  checkOut: string;
  channel?: string;
  roomType: string;
  roomNumber: string;
  status: string;
  totalAmount: string;
  groupId?: string;
  groupName?: string | null;
  groupKind?: string | null;
  groupExternalRef?: string | null;
  bookingRoomIndex?: number;
};

/** RSV number: solo → RSV-XXXXXX; part of a booking/group → RSV-BASE-NN. */
function rsvNumber(r: Row, indexInGroup?: number) {
  if (r.groupId) {
    const base = (r.groupExternalRef ?? r.groupId.slice(-6)).toUpperCase();
    const n = r.bookingRoomIndex ?? indexInGroup ?? 1;
    return `RSV-${base}-${String(n).padStart(2, "0")}`;
  }
  return `RSV-${r._id.slice(-6).toUpperCase()}`;
}

type Unit =
  | { kind: "single"; row: Row; sortAt: number }
  | {
      kind: "group";
      groupId: string;
      name: string;
      groupKind: string;
      base: string;
      rows: Row[];
      sortAt: number;
    };

function buildUnits(rows: Row[]): Unit[] {
  const groups = new Map<string, Row[]>();
  const singles: Row[] = [];
  for (const r of rows) {
    if (r.groupId) {
      if (!groups.has(r.groupId)) groups.set(r.groupId, []);
      groups.get(r.groupId)!.push(r);
    } else singles.push(r);
  }
  const units: Unit[] = singles.map((row) => ({
    kind: "single" as const,
    row,
    sortAt: row._creationTime,
  }));
  for (const [groupId, gr] of groups) {
    if (gr.length === 1) {
      units.push({ kind: "single", row: gr[0], sortAt: gr[0]._creationTime });
      continue;
    }
    gr.sort(
      (a, b) =>
        (a.bookingRoomIndex ?? 0) - (b.bookingRoomIndex ?? 0) ||
        a._creationTime - b._creationTime
    );
    units.push({
      kind: "group",
      groupId,
      name: gr[0].groupName ?? gr[0].guestName,
      groupKind: gr[0].groupKind ?? "block",
      base: (gr[0].groupExternalRef ?? groupId.slice(-6)).toUpperCase(),
      rows: gr,
      sortAt: Math.max(...gr.map((x) => x._creationTime)),
    });
  }
  return units.sort((a, b) => b.sortAt - a.sortAt);
}

export default function ReservationListPage() {
  return (
    <Suspense
      fallback={<div className="p-4 text-13 text-fg-3">Loading reservations…</div>}
    >
      <ReservationListInner />
    </Suspense>
  );
}

function ReservationListInner() {
  const router = useRouter();
  const { activeProperty } = useProperty();
  const reservations = useQuery(
    api.reservations.getByProperty,
    activeProperty ? { propertyId: activeProperty._id } : "skip"
  );

  const assignRooms = useMutation(api.reservations.assignRooms);
  const [assigning, setAssigning] = useState(false);

  // Deep-link filters (e.g. from the rate grid's unassigned chip).
  const params = useSearchParams();
  const qUnassigned = params.get("unassigned") === "1";
  const qRoomType = params.get("roomType");
  const qDate = params.get("date");
  const hasUrlFilter = qUnassigned || !!qRoomType || !!qDate;

  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [channel, setChannel] = useState("All");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<string | null>(null);

  const TODAY = activeProperty?.businessDate ?? "2026-09-08";
  const list = reservations ?? [];
  const unassigned = list.filter(
    (r) =>
      r.roomNumber === "—" &&
      r.status !== "cancelled" &&
      r.status !== "departed" &&
      r.checkOut > TODAY
  ).length;

  const runAssign = async () => {
    if (!activeProperty || assigning) return;
    setAssigning(true);
    await assignRooms({ propertyId: activeProperty._id });
    setAssigning(false);
  };
  const isArrival = (r: (typeof list)[number]) =>
    r.checkIn === TODAY &&
    (r.status === "confirmed" || r.status === "tentative");
  const isDeparture = (r: (typeof list)[number]) =>
    r.checkOut === TODAY && r.status === "inhouse";

  const tabCounts = {
    arrivals: list.filter(isArrival).length,
    inhouse: list.filter((r) => r.status === "inhouse").length,
    departures: list.filter(isDeparture).length,
    all: list.length,
  };

  const filtered = useMemo(() => {
    let rows = list;
    if (tab === "arrivals") rows = rows.filter(isArrival);
    if (tab === "inhouse") rows = rows.filter((r) => r.status === "inhouse");
    if (tab === "departures") rows = rows.filter(isDeparture);
    if (search)
      rows = rows.filter(
        (r) =>
          r.guestName.toLowerCase().includes(search.toLowerCase()) ||
          r.roomNumber.includes(search)
      );
    if (status !== "All") rows = rows.filter((r) => r.status === status);
    if (channel !== "All") rows = rows.filter((r) => (r.channel ?? "Direct") === channel);
    if (qUnassigned)
      rows = rows.filter(
        (r) =>
          r.roomNumber === "—" &&
          r.status !== "cancelled" &&
          r.status !== "departed"
      );
    if (qRoomType) rows = rows.filter((r) => r.roomType === qRoomType);
    if (qDate) rows = rows.filter((r) => r.checkIn <= qDate && r.checkOut > qDate);
    return rows as unknown as Row[];
  }, [list, tab, search, status, channel, TODAY, qUnassigned, qRoomType, qDate]);

  // Fold rows that share a group into one booking unit; newest booking first.
  const units = useMemo(() => buildUnits(filtered), [filtered]);

  const pages = Math.max(1, Math.ceil(units.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const pageUnits = units.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize
  );

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const selectedRes = list.find((r) => r._id === selected) ?? null;

  const TABS: { id: Tab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "arrivals", label: "Arrivals today" },
    { id: "inhouse", label: "In-house" },
    { id: "departures", label: "Departures today" },
  ];

  return (
    <div className="mx-auto max-w-content">
      {/* Toolbar */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search guest, room, or confirmation…"
          className="w-[240px] rounded-sm border border-line bg-elevated px-2.5 py-2 text-[12.5px] text-ice outline-none focus:border-accent-violet"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-sm border border-line bg-elevated px-2.5 py-2 text-[12.5px] text-fg-2"
        >
          <option value="All">All statuses</option>
          <option value="inhouse">In-house</option>
          <option value="confirmed">Confirmed</option>
          <option value="tentative">Tentative</option>
          <option value="departed">Departed</option>
        </select>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="rounded-sm border border-line bg-elevated px-2.5 py-2 text-[12.5px] text-fg-2"
        >
          <option value="All">All channels</option>
          <option>Direct</option>
          <option>Booking.com</option>
          <option>Agoda</option>
          <option>Expedia</option>
          <option>Traveloka</option>
        </select>
        <button
          onClick={() =>
            downloadCsv(
              `reservations-${TODAY}.csv`,
              filtered.map((r) => ({
                guest: r.guestName,
                rsvNumber: rsvNumber(r),
                bookingDate: new Date(r._creationTime).toISOString().slice(0, 10),
                arrival: r.checkIn,
                departure: r.checkOut,
                source: r.channel ?? "Direct",
                roomType: r.roomType,
                roomNumber: r.roomNumber,
                status: RES_STATUS_LABEL[r.status] ?? r.status,
                value: r.totalAmount,
              }))
            )
          }
          className="flex items-center gap-1.5 rounded-sm border border-line bg-fg-1/[0.06] px-3 py-2 text-12 text-fg-1 hover:border-line-strong"
        >
          <FileSpreadsheet className="h-[13px] w-[13px]" /> Export
        </button>
        <PmsDateChip className="ml-auto" />
        {unassigned > 0 && (
          <button
            onClick={runAssign}
            disabled={assigning}
            className="ml-auto rounded-sm border border-accent-violet bg-violet-wash px-3 py-2 text-[12.5px] font-medium text-ice hover:bg-elevated disabled:opacity-40"
          >
            {assigning
              ? "Assigning…"
              : `Auto-assign ${unassigned} room${unassigned > 1 ? "s" : ""}`}
          </button>
        )}
        <button
          onClick={() => router.push("/operate/calendar")}
          className={`${
            unassigned > 0 ? "" : "ml-auto"
          } rounded-sm bg-accent-violet px-3.5 py-2 text-[12.5px] font-medium text-ice hover:bg-accent-violet-hi`}
        >
          + New reservation
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-7 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setPage(0);
            }}
            className={`flex items-center gap-2 border-b-2 pb-2.5 text-13 transition-colors ${
              tab === t.id
                ? "border-accent-violet text-ice"
                : "border-transparent text-fg-3 hover:text-fg-1"
            }`}
          >
            {t.label}
            <span className="rounded-pill bg-fg-1/[0.08] px-1.5 py-px font-mono text-[10px] text-fg-2">
              {tabCounts[t.id]}
            </span>
          </button>
        ))}
      </div>

      {hasUrlFilter && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-accent-violet bg-violet-wash px-3 py-2 text-[12.5px] text-ice">
          <span className="font-semibold">Filtered:</span>
          {qUnassigned && <span>unassigned</span>}
          {qRoomType && <span>· {qRoomType}</span>}
          {qDate && <span>· stays on {qDate}</span>}
          <span className="text-fg-3">({filtered.length})</span>
          <Link
            href="/guests/reservations"
            className="ml-auto text-fg-3 hover:text-ice"
          >
            Clear ✕
          </Link>
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <div className="upx-scroll overflow-x-auto">
          <div
            className={`${GRID} whitespace-nowrap border-b border-line py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-fg-3`}
          >
            <div>Guest</div>
            <div>RSV #</div>
            <div>Booked</div>
            <div>Arrival</div>
            <div>Departure</div>
            <div>Source</div>
            <div>Room type</div>
            <div>Room</div>
            <div>Status</div>
            <div>Value</div>
            <div />
          </div>

          {!reservations && (
            <div className="px-4 py-4 text-13 text-fg-3">Loading reservations…</div>
          )}
          {reservations && pageUnits.length === 0 && (
            <div className="px-4 py-4 text-13 text-fg-3">No reservations match.</div>
          )}

          {pageUnits.map((u) => {
            if (u.kind === "single")
              return (
                <ResRow
                  key={u.row._id}
                  r={u.row}
                  today={TODAY}
                  onOpen={() => setSelected(u.row._id)}
                />
              );
            const open = expanded.has(u.groupId);
            const assigned = u.rows.filter(
              (x) => x.roomNumber && x.roomNumber !== "—"
            ).length;
            const types = [...new Set(u.rows.map((x) => x.roomType))];
            const statuses = [...new Set(u.rows.map((x) => x.status))];
            const value = u.rows.reduce((s, x) => s + parseRp(x.totalAmount), 0);
            return (
              <div key={u.groupId} className="border-b border-line-soft last:border-0">
                <button
                  onClick={() => toggle(u.groupId)}
                  className={`${GRID} w-full py-2.5 text-left text-12 transition-colors hover:bg-elevated`}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    {open ? (
                      <ChevronDown className="h-3.5 w-3.5 flex-none text-fg-3" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 flex-none text-fg-3" />
                    )}
                    <span className="truncate font-semibold">{u.name}</span>
                    <span
                      className="flex-none rounded-[3px] border px-1 text-[9px] font-bold uppercase"
                      style={{
                        color:
                          u.groupKind === "transient"
                            ? "var(--accent-cyan)"
                            : "var(--group-hold)",
                        borderColor:
                          u.groupKind === "transient"
                            ? "var(--accent-cyan)"
                            : "var(--group-hold)",
                      }}
                    >
                      {u.groupKind === "transient" ? "Party" : "Group"}
                    </span>
                  </div>
                  <div className="truncate font-mono text-[11px] text-fg-3">
                    RSV-{u.base}
                  </div>
                  <div className="whitespace-nowrap font-mono text-[11px] text-fg-3">
                    {bookedDate(u.sortAt)}
                  </div>
                  <div className="whitespace-nowrap font-mono text-[11px]">
                    {shortDate(u.rows[0].checkIn)}
                  </div>
                  <div className="whitespace-nowrap font-mono text-[11px]">
                    {shortDate(u.rows[0].checkOut)}
                  </div>
                  <div className="truncate text-[11px] text-fg-3">
                    {u.rows[0].channel ?? "Direct"}
                  </div>
                  <div className="truncate text-[11px] text-fg-2">
                    {types.length === 1 ? types[0] : "Mixed"}
                  </div>
                  <div className="font-mono text-[11px]">
                    {assigned}/{u.rows.length} rm
                  </div>
                  <div
                    className="whitespace-nowrap text-[10.5px] font-semibold"
                    style={{
                      color:
                        statuses.length === 1
                          ? RES_STATUS_COLOR[statuses[0]]
                          : "var(--fg-2)",
                    }}
                  >
                    {statuses.length === 1
                      ? RES_STATUS_LABEL[statuses[0]] ?? statuses[0]
                      : "Mixed"}
                  </div>
                  <div className="font-mono text-[11.5px] font-semibold">
                    {fmtRp(value)}
                  </div>
                  <div />
                </button>
                {open &&
                  u.rows.map((r, i) => (
                    <ResRow
                      key={r._id}
                      r={r}
                      today={TODAY}
                      indexInGroup={i + 1}
                      nested
                      onOpen={() => setSelected(r._id)}
                    />
                  ))}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-12 text-fg-3">
          {units.length === 0
            ? "No results"
            : `${safePage * pageSize + 1}–${Math.min(
                (safePage + 1) * pageSize,
                units.length
              )} of ${units.length} bookings`}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="rounded-sm border border-line bg-elevated px-2 py-1.5 text-12 text-fg-2"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="rounded-sm border border-line bg-fg-1/[0.06] px-3 py-1.5 text-12 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-12 text-fg-3">
            {safePage + 1} / {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            disabled={safePage >= pages - 1}
            className="rounded-sm border border-line bg-fg-1/[0.06] px-3 py-1.5 text-12 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {selectedRes && (
        <ReservationSlideOver res={selectedRes} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function ResRow({
  r,
  today,
  onOpen,
  nested,
  indexInGroup,
}: {
  r: Row;
  today: string;
  onOpen: () => void;
  nested?: boolean;
  indexInGroup?: number;
}) {
  const action =
    r.status === "tentative"
      ? "Confirm"
      : r.status === "confirmed"
        ? r.checkIn <= today
          ? "Check in"
          : "View"
        : r.status === "inhouse"
          ? "Check out"
          : r.status === "cancelled"
            ? "Reinstate"
            : "View";
  return (
    <button
      onClick={onOpen}
      className={`${GRID} w-full py-2.5 text-left text-12 transition-colors last:border-0 hover:bg-elevated ${
        nested
          ? "border-b border-line-soft bg-deep/30"
          : "border-b border-line-soft"
      }`}
    >
      <div className={`truncate ${nested ? "pl-5 text-fg-2" : "font-semibold"}`}>
        {nested ? `Room ${indexInGroup}` : r.guestName}
      </div>
      <div className="truncate font-mono text-[11px] text-fg-3">
        {rsvNumber(r, indexInGroup)}
      </div>
      <div className="whitespace-nowrap font-mono text-[11px] text-fg-3">
        {bookedDate(r._creationTime)}
      </div>
      <div className="whitespace-nowrap font-mono text-[11px]">
        {shortDate(r.checkIn)}
      </div>
      <div className="whitespace-nowrap font-mono text-[11px]">
        {shortDate(r.checkOut)}
      </div>
      <div className="truncate text-[11px] text-fg-3">{r.channel ?? "Direct"}</div>
      <div className="truncate text-[11px] text-fg-2">{r.roomType}</div>
      <div className="font-mono">{r.roomNumber}</div>
      <div
        className="whitespace-nowrap text-[10.5px] font-semibold"
        style={{ color: RES_STATUS_COLOR[r.status] }}
      >
        {RES_STATUS_LABEL[r.status] ?? r.status}
      </div>
      <div className="font-mono text-[11.5px] font-semibold">{r.totalAmount}</div>
      <div>
        <span className="whitespace-nowrap rounded-sm border border-line bg-fg-1/[0.06] px-2 py-1 text-[10.5px] text-fg-1">
          {action}
        </span>
      </div>
    </button>
  );
}
