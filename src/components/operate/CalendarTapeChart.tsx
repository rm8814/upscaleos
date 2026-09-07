"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useProperty } from "@/components/providers/PropertyProvider";
import {
  Card,
  Segmented,
  ROOM_STATUS_COLOR,
  RES_STATUS_COLOR,
  RES_STATUS_LABEL,
} from "@/components/upx/primitives";

const WINDOW_START = new Date("2026-09-05T00:00:00Z");
const DAYS = 10;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayList() {
  return Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(WINDOW_START);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
}
const isoOf = (d: Date) => d.toISOString().slice(0, 10);
const dayIndex = (iso: string) =>
  Math.round(
    (new Date(iso + "T00:00:00Z").getTime() - WINDOW_START.getTime()) / 86400000
  );

export default function CalendarTapeChart() {
  const { activeProperty } = useProperty();
  const arg = activeProperty ? { propertyId: activeProperty._id } : "skip";
  const rooms = useQuery(api.operate.getRooms, arg);
  const reservations = useQuery(api.reservations.getByProperty, arg);

  const [colorBy, setColorBy] = useState<"status" | "channel">("status");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All room types");

  const days = useMemo(dayList, []);
  const todayIso = "2026-09-08";

  const groups = useMemo(() => {
    if (!rooms) return [];
    const byType = new Map<string, typeof rooms>();
    for (const r of rooms) {
      if (typeFilter !== "All room types" && r.type !== typeFilter) continue;
      if (!byType.has(r.type)) byType.set(r.type, []);
      byType.get(r.type)!.push(r);
    }
    return Array.from(byType.entries()).map(([type, rs]) => ({ type, rooms: rs }));
  }, [rooms, typeFilter]);

  const roomTypes = useMemo(
    () => ["All room types", ...Array.from(new Set((rooms ?? []).map((r) => r.type)))],
    [rooms]
  );

  const resByRoom = useMemo(() => {
    const map = new Map<string, NonNullable<typeof reservations>>();
    for (const res of reservations ?? []) {
      if (!res.roomId) continue;
      if (
        search &&
        !res.guestName.toLowerCase().includes(search.toLowerCase()) &&
        !res.roomNumber.includes(search)
      )
        continue;
      if (!map.has(res.roomId)) map.set(res.roomId, []);
      map.get(res.roomId)!.push(res);
    }
    return map;
  }, [reservations, search]);

  // occupancy per day column
  const occByDay = days.map((d) => {
    const iso = isoOf(d);
    const total = rooms?.length ?? 0;
    const occ = (reservations ?? []).filter(
      (r) => r.checkIn <= iso && r.checkOut > iso && r.status !== "cancelled"
    ).length;
    return total ? Math.round((occ / total) * 100) : 0;
  });

  const GRID = { gridTemplateColumns: `150px repeat(${DAYS}, 1fr)` };
  const CHANNEL_COLOR: Record<string, string> = {
    Direct: "var(--accent-cyan)",
    "Booking.com": "var(--accent-violet)",
    Agoda: "var(--room-vacant-dirty)",
    Expedia: "var(--info)",
    Traveloka: "var(--room-ooo)",
  };
  const blockColor = (r: NonNullable<typeof reservations>[number]) =>
    colorBy === "channel"
      ? CHANNEL_COLOR[r.channel ?? "Direct"] ?? "var(--accent-violet)"
      : RES_STATUS_COLOR[r.status] ?? "var(--res-confirmed)";

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search guest or room…"
          className="w-[180px] rounded-sm border border-line bg-elevated px-2.5 py-2 text-12 text-ice outline-none focus:border-accent-violet"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-sm border border-line bg-elevated px-2.5 py-2 text-12 text-fg-2"
        >
          {roomTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <Segmented<"status" | "channel">
          value={colorBy}
          onChange={setColorBy}
          options={[
            { value: "status", label: "By status" },
            { value: "channel", label: "By channel" },
          ]}
        />
      </div>

      {/* Range + legend */}
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <div className="text-12 text-fg-3">
          {isoOf(days[0])} – {isoOf(days[DAYS - 1])}
        </div>
        {colorBy === "status"
          ? ["inhouse", "confirmed", "tentative", "departed"].map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-12 text-fg-3">
                <span
                  className="h-2 w-2 rounded-pill"
                  style={{ background: RES_STATUS_COLOR[s] }}
                />
                {RES_STATUS_LABEL[s]}
              </div>
            ))
          : Object.entries(CHANNEL_COLOR).map(([name, color]) => (
              <div key={name} className="flex items-center gap-1.5 text-12 text-fg-3">
                <span className="h-2 w-2 rounded-pill" style={{ background: color }} />
                {name}
              </div>
            ))}
        <button className="ml-auto rounded-sm bg-accent-violet px-3.5 py-2 text-13 font-medium text-ice transition-colors hover:bg-accent-violet-hi">
          + New reservation
        </button>
      </div>

      {/* Grid */}
      <Card className="overflow-x-auto p-0">
        <div className="min-w-[820px]">
          {/* header */}
          <div className="grid" style={GRID}>
            <div className="border-b border-line px-3 py-2.5 text-[11px] text-fg-3">
              Room type
            </div>
            {days.map((d) => {
              const iso = isoOf(d);
              return (
                <div
                  key={iso}
                  className="border-b border-l border-line py-2 text-center font-mono text-[11px] text-fg-3"
                  style={{ background: iso === todayIso ? "var(--violet-wash)" : undefined }}
                >
                  <div className="text-[9px] font-semibold uppercase text-fg-2">
                    {DOW[d.getUTCDay()]}
                  </div>
                  <div>{d.getUTCDate()}</div>
                </div>
              );
            })}
          </div>

          {!rooms && <div className="px-3 py-4 text-13 text-fg-3">Loading tape chart…</div>}

          {groups.map((g) => (
            <React.Fragment key={g.type}>
              <div
                className="grid border-b border-line bg-deep"
                style={GRID}
              >
                <div className="px-3 py-2 text-12 font-semibold text-ice">{g.type}</div>
                {days.map((_, i) => (
                  <div key={i} className="border-l border-line-soft" />
                ))}
              </div>

              {g.rooms.map((room) => {
                const list = resByRoom.get(room._id) ?? [];
                return (
                  <div
                    key={room._id}
                    className="grid border-b border-line-soft"
                    style={{ gridTemplateColumns: "150px 1fr" }}
                  >
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <span
                        className="h-1.5 w-1.5 flex-none rounded-pill"
                        style={{ background: ROOM_STATUS_COLOR[room.status] }}
                        title={room.status}
                      />
                      <span className="font-mono text-12 text-fg-2">{room.roomNumber}</span>
                    </div>
                    <div
                      className="relative grid"
                      style={{ gridTemplateColumns: `repeat(${DAYS}, 1fr)` }}
                    >
                      {days.map((_, i) => (
                        <div key={i} className="h-9 border-l border-line-soft" />
                      ))}
                      {list.map((res) => {
                        const start = Math.max(0, dayIndex(res.checkIn));
                        const end = Math.min(DAYS, dayIndex(res.checkOut));
                        if (end <= 0 || start >= DAYS || end <= start) return null;
                        const color = blockColor(res);
                        return (
                          <div
                            key={res._id}
                            title={`${res.guestName} · ${RES_STATUS_LABEL[res.status] ?? res.status}`}
                            className="absolute top-1.5 bottom-1.5 flex items-center overflow-hidden whitespace-nowrap rounded-[6px] border px-2 text-12 text-ice"
                            style={{
                              left: `${(start / DAYS) * 100}%`,
                              width: `${((end - start) / DAYS) * 100}%`,
                              background: `color-mix(in srgb, ${color} 26%, var(--bg-deep))`,
                              borderColor: color,
                            }}
                          >
                            {res.guestName}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}

          {/* Occupancy footer */}
          <div className="grid border-t border-line bg-deep" style={GRID}>
            <div className="px-3 py-2.5 text-12 font-semibold text-ice">Total occupancy</div>
            {occByDay.map((pct, i) => (
              <div
                key={i}
                className="border-l border-line-soft py-2.5 text-center font-mono text-12 font-semibold text-accent-cyan"
              >
                {pct}%
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
