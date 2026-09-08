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

const PAGE_SIZE = 8;
const GRID =
  "grid grid-cols-[1.3fr_0.9fr_0.8fr_0.8fr_1.1fr_0.9fr_0.5fr_0.8fr_0.9fr_0.8fr] gap-2 px-3.5 min-w-[1000px]";

type Tab = "arrivals" | "inhouse" | "departures" | "all";

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
  const tabCounts = {
    arrivals: list.filter((r) => r.checkIn === TODAY).length,
    inhouse: list.filter((r) => r.status === "inhouse").length,
    departures: list.filter((r) => r.checkOut === TODAY).length,
    all: list.length,
  };

  const filtered = useMemo(() => {
    let rows = list;
    if (tab === "arrivals") rows = rows.filter((r) => r.checkIn === TODAY);
    if (tab === "inhouse") rows = rows.filter((r) => r.status === "inhouse");
    if (tab === "departures") rows = rows.filter((r) => r.checkOut === TODAY);
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
    return rows;
  }, [list, tab, search, status, channel, TODAY, qUnassigned, qRoomType, qDate]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

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
                confirmation: `RSV-${r._id.slice(-6).toUpperCase()}`,
                arrival: r.checkIn,
                departure: r.checkOut,
                roomType: r.roomType,
                room: r.roomNumber,
                source: r.channel ?? "Direct",
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
            className={`${GRID} border-b border-line py-2.5 text-[10px] uppercase tracking-[0.04em] text-fg-3`}
          >
            <div>Guest</div>
            <div>RSV number</div>
            <div>Arrival</div>
            <div>Departure</div>
            <div>Room type</div>
            <div>Source</div>
            <div>Room</div>
            <div>Status</div>
            <div>Value</div>
            <div />
          </div>

          {!reservations && (
            <div className="px-3.5 py-4 text-13 text-fg-3">Loading reservations…</div>
          )}
          {reservations && pageRows.length === 0 && (
            <div className="px-3.5 py-4 text-13 text-fg-3">No reservations match.</div>
          )}

          {pageRows.map((r) => (
            <button
              key={r._id}
              onClick={() => setSelected(r._id)}
              className={`${GRID} items-center border-b border-line-soft py-3 text-left text-12 transition-colors last:border-0 hover:bg-elevated`}
            >
              <div className="truncate font-semibold">{r.guestName}</div>
              <div className="truncate font-mono text-[11px] text-fg-3">
                RSV-{r._id.slice(-6).toUpperCase()}
              </div>
              <div className="font-mono text-[11px]">{r.checkIn}</div>
              <div className="font-mono text-[11px]">{r.checkOut}</div>
              <div className="truncate text-[11px] text-fg-2">{r.roomType}</div>
              <div className="truncate text-[11px] text-fg-3">{r.channel ?? "Direct"}</div>
              <div className="font-mono">{r.roomNumber}</div>
              <div
                className="text-[10.5px] font-semibold"
                style={{ color: RES_STATUS_COLOR[r.status] }}
              >
                {RES_STATUS_LABEL[r.status] ?? r.status}
              </div>
              <div className="font-mono text-[11.5px] font-semibold">{r.totalAmount}</div>
              <div>
                <span className="rounded-sm border border-line bg-fg-1/[0.06] px-2 py-1 text-[10.5px] text-fg-1">
                  {r.status === "confirmed"
                    ? "Check in"
                    : r.status === "inhouse"
                      ? "Check out"
                      : "View"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-12 text-fg-3">
          {filtered.length === 0
            ? "No results"
            : `${safePage * PAGE_SIZE + 1}–${Math.min(
                (safePage + 1) * PAGE_SIZE,
                filtered.length
              )} of ${filtered.length}`}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="rounded-sm border border-line bg-fg-1/[0.06] px-3 py-1.5 text-12 disabled:opacity-40"
          >
            Prev
          </button>
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
