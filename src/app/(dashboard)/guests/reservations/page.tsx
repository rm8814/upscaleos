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

const PAGE_SIZES = [50, 100];
// Guest · RSV · Booked · Arrival · Departure · Source · Room type · Room · Status · Value · action
const GRID =
  "grid grid-cols-[1.5fr_0.95fr_0.9fr_0.9fr_0.9fr_0.95fr_1fr_0.6fr_0.85fr_1fr_0.75fr] items-center gap-3 px-4 min-w-[1240px]";

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
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
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
    // Newest booking first.
    return [...rows].sort((a, b) => b._creationTime - a._creationTime);
  }, [list, tab, search, status, channel, TODAY, qUnassigned, qRoomType, qDate]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

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
                rsvNumber: `RSV-${r._id.slice(-6).toUpperCase()}`,
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
            className={`${GRID} whitespace-nowrap border-b border-line bg-deep/40 py-2.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-fg-3`}
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
            <div className="text-right">Value</div>
            <div />
          </div>

          {!reservations && (
            <div className="px-4 py-4 text-13 text-fg-3">Loading reservations…</div>
          )}
          {reservations && pageRows.length === 0 && (
            <div className="px-4 py-4 text-13 text-fg-3">No reservations match.</div>
          )}

          {pageRows.map((r) => {
            const action =
              r.status === "tentative"
                ? "Confirm"
                : r.status === "confirmed"
                  ? r.checkIn <= TODAY
                    ? "Check in"
                    : "View"
                  : r.status === "inhouse"
                    ? "Check out"
                    : r.status === "cancelled"
                      ? "Reinstate"
                      : "View";
            return (
              <button
                key={r._id}
                onClick={() => setSelected(r._id)}
                className={`${GRID} border-b border-line-soft py-2.5 text-left text-12 transition-colors last:border-0 hover:bg-elevated`}
              >
                <div className="truncate font-semibold">{r.guestName}</div>
                <div className="truncate font-mono text-[11px] text-fg-3">
                  RSV-{r._id.slice(-6).toUpperCase()}
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
                <div className="truncate text-[11px] text-fg-3">
                  {r.channel ?? "Direct"}
                </div>
                <div className="truncate text-[11px] text-fg-2">{r.roomType}</div>
                <div className="font-mono">{r.roomNumber}</div>
                <div
                  className="whitespace-nowrap text-[10.5px] font-semibold"
                  style={{ color: RES_STATUS_COLOR[r.status] }}
                >
                  {RES_STATUS_LABEL[r.status] ?? r.status}
                </div>
                <div className="text-right font-mono text-[11.5px] font-semibold">
                  {r.totalAmount}
                </div>
                <div className="text-right">
                  <span className="whitespace-nowrap rounded-sm border border-line bg-fg-1/[0.06] px-2 py-1 text-[10.5px] text-fg-1">
                    {action}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-12 text-fg-3">
          {filtered.length === 0
            ? "No results"
            : `${safePage * pageSize + 1}–${Math.min(
                (safePage + 1) * pageSize,
                filtered.length
              )} of ${filtered.length}`}
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
