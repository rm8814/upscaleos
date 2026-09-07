"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useProperty } from "@/components/providers/PropertyProvider";
import { X, Star, Wrench } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  Card,
  Eyebrow,
  ROOM_STATUS_COLOR,
  ROOM_STATUS_WASH,
} from "@/components/upx/primitives";

const SUMMARY_STATUSES = [
  "Vacant Clean",
  "Occupied",
  "Vacant Dirty",
  "Inspected",
  "OOO",
] as const;

const FILTERS = ["All", "Vacant Dirty", "Vacant Clean", "Occupied", "OOO"] as const;
type Filter = (typeof FILTERS)[number];

const CHECKLIST = ["Strip & remake beds", "Bathroom deep clean", "Restock minibar", "Vacuum & dust"];

export default function HousekeepingBoard() {
  const { activeProperty } = useProperty();
  const arg = activeProperty ? { propertyId: activeProperty._id } : "skip";
  const rooms = useQuery(api.operate.getRooms, arg);
  const summary = useQuery(api.operate.getRoomStatusSummary, arg);
  const tickets = useQuery(api.operate.getMaintenanceTickets, arg);
  const updateStatus = useMutation(api.operate.updateRoomStatus);

  const [filter, setFilter] = useState<Filter>("All");
  const [floor, setFloor] = useState("All floors");
  const [activeId, setActiveId] = useState<string | null>(null);

  const floors = useMemo(
    () => ["All floors", ...Array.from(new Set((rooms ?? []).map((r) => r.floor ?? "—")))],
    [rooms]
  );

  const visible = (rooms ?? []).filter((r) => {
    if (filter !== "All" && r.status !== filter) return false;
    if (floor !== "All floors" && r.floor !== floor) return false;
    return true;
  });

  const active = (rooms ?? []).find((r) => r._id === activeId) ?? null;
  const roomTickets = active
    ? (tickets ?? []).filter((t) => t.location.includes(active.roomNumber))
    : [];

  const countFor = (status: string) =>
    summary?.find((s) => s.status === status)?.count ?? 0;

  return (
    <div>
      {/* Summary tiles */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {SUMMARY_STATUSES.map((s) => (
          <div
            key={s}
            className="flex items-center justify-between rounded-md border border-line bg-elevated px-3 py-2.5"
          >
            <span className="text-12 text-fg-2">{s}</span>
            <span
              className="font-mono text-14 font-semibold"
              style={{ color: ROOM_STATUS_COLOR[s] }}
            >
              {summary ? countFor(s) : "—"}
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-sm border px-3 py-2 text-[12.5px] transition-colors duration-fast ${
              filter === f
                ? "border-accent-violet bg-violet-wash text-ice"
                : "border-line bg-elevated text-fg-2 hover:border-line-strong"
            }`}
          >
            {f === "OOO" ? "Out of order" : f}
          </button>
        ))}
        <select
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
          className="rounded-sm border border-line bg-elevated px-2.5 py-2 text-12 text-fg-2"
        >
          {floors.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Room grid */}
      {!rooms && <div className="text-13 text-fg-3">Loading rooms…</div>}
      {rooms && visible.length === 0 && (
        <div className="text-13 text-fg-3">No rooms match this filter.</div>
      )}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {visible.map((room) => (
          <button
            key={room._id}
            onClick={() => setActiveId(room._id)}
            className="relative flex flex-col gap-1.5 rounded-md border p-3 text-left transition-transform duration-fast hover:-translate-y-px"
            style={{
              background: ROOM_STATUS_WASH[room.status],
              borderColor: ROOM_STATUS_COLOR[room.status],
            }}
          >
            {room.priority && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-pill bg-room-ooo">
                <Star className="h-[9px] w-[9px] text-white" fill="currentColor" />
              </span>
            )}
            <div className="flex items-center justify-between">
              <span className="font-mono text-[15px] font-semibold text-ice">
                {room.roomNumber}
              </span>
              <span
                className="h-2 w-2 rounded-pill"
                style={{ background: ROOM_STATUS_COLOR[room.status] }}
              />
            </div>
            <div className="text-[11px] text-fg-3">{room.status}</div>
            <div className="mt-0.5 border-t border-line-soft pt-1.5 text-[10px] text-fg-3">
              {room.attendant ?? "Unassigned"} · {room.updatedLabel ?? "—"}
            </div>
          </button>
        ))}
      </div>

      {/* Drawer */}
      {active && (
        <>
          <div
            onClick={() => setActiveId(null)}
            className="fixed inset-0 z-30 bg-deepest/70 backdrop-blur-[6px]"
          />
          <div className="upx-scroll fixed right-0 top-0 bottom-0 z-40 flex w-[400px] max-w-[92vw] flex-col gap-3.5 overflow-y-auto border-l border-line bg-deep p-[22px] shadow-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-18 font-bold text-ice">
                  Room {active.roomNumber}
                </div>
                <div className="mt-1 text-[12.5px] text-fg-3">
                  {active.floor ?? "—"} · {active.status}
                </div>
              </div>
              <button
                onClick={() => setActiveId(null)}
                className="text-fg-3 hover:text-ice"
                aria-label="Close"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            {active.priority && (
              <div className="flex items-center gap-2 rounded-md border border-room-ooo bg-ai-tint p-2.5 text-[12.5px] text-ice">
                <Star className="h-3.5 w-3.5 flex-none text-room-ooo" fill="currentColor" />
                Priority — VIP arrival at 15:00
              </div>
            )}

            <div>
              <div className="mb-1.5 text-[11px] text-fg-3">Assigned attendant</div>
              <div className="rounded-sm border border-line bg-ink px-3 py-2.5 text-13 text-ice">
                {active.attendant ?? "Unassigned"}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[11px] text-fg-3">Checklist</div>
              <div className="flex flex-col gap-2">
                {CHECKLIST.map((c) => (
                  <label key={c} className="flex items-center gap-2.5 text-13 text-ice">
                    <input
                      type="checkbox"
                      defaultChecked={active.status === "Inspected" || active.status === "Vacant Clean"}
                      className="accent-accent-violet"
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <Card className="flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between">
                <Eyebrow>Maintenance tickets</Eyebrow>
              </div>
              {roomTickets.length === 0 && (
                <div className="text-12 text-fg-3">No open tickets.</div>
              )}
              {roomTickets.map((t: Doc<"maintenance_tickets">) => (
                <div key={t._id} className="flex items-center gap-2 text-[12.5px]">
                  <Wrench className="h-[13px] w-[13px] flex-none text-fg-3" />
                  <span className="flex-1">{t.title}</span>
                  <span className="text-[11px] text-fg-3">{t.status}</span>
                </div>
              ))}
            </Card>

            <button
              onClick={async () => {
                await updateStatus({ id: active._id, status: "Inspected" });
                setActiveId(null);
              }}
              className="rounded-md bg-accent-violet px-3 py-3 text-14 font-semibold text-ice transition-colors hover:bg-accent-violet-hi"
            >
              Mark as inspected
            </button>
          </div>
        </>
      )}
    </div>
  );
}
