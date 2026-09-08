"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useProperty } from "@/components/providers/PropertyProvider";
import { ChevronRight, ChevronDown, X, LogIn, Move, XCircle } from "lucide-react";
import {
  Card,
  Eyebrow,
  Segmented,
  ROOM_STATUS_COLOR,
  RES_STATUS_COLOR,
  RES_STATUS_LABEL,
} from "@/components/upx/primitives";
import ReservationSlideOver, {
  type SlideOverReservation,
} from "@/components/guests/ReservationSlideOver";

const WINDOW_START = new Date("2026-09-05T00:00:00Z");
const DAYS = 10;
const TODAY_ISO = "2026-09-08";
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_MULT = [0.9, 0.92, 0.95, 1.0, 1.08, 1.25, 1.3]; // Sun..Sat
const NIGHTLY: Record<string, number> = {
  "Deluxe Twin": 1_450_000,
  "Double Queen": 1_850_000,
  "King Suite": 2_600_000,
  "Presidential Suite": 6_900_000,
};
const HK_STATUSES = ["Vacant Clean", "Vacant Dirty", "Occupied", "Inspected", "OOO", "OOS"];
const CHANNELS = ["Direct", "Booking.com", "Agoda", "Expedia", "Traveloka"];
const CHANNEL_COLOR: Record<string, string> = {
  Direct: "var(--accent-cyan)",
  "Booking.com": "var(--accent-violet)",
  Agoda: "var(--room-vacant-dirty)",
  Expedia: "var(--info)",
  Traveloka: "var(--room-ooo)",
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (base: Date, n: number) => {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};
const dayIndex = (isoDate: string) =>
  Math.round((new Date(isoDate + "T00:00:00Z").getTime() - WINDOW_START.getTime()) / 86400000);
const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("en-US")}`;
const nightsBetween = (a: string, b: string) => Math.max(1, dayIndex(b) - dayIndex(a));

type Rooms = FunctionReturnType<typeof api.operate.getRooms>;
type Reservations = FunctionReturnType<typeof api.reservations.getByProperty>;

export default function CalendarTapeChart() {
  const { activeProperty } = useProperty();
  const arg = activeProperty ? { propertyId: activeProperty._id } : "skip";
  const rooms = useQuery(api.operate.getRooms, arg);
  const reservations = useQuery(api.reservations.getByProperty, arg);
  const waitlist = useQuery(api.waitlist.list, arg);

  const updateDates = useMutation(api.reservations.updateDates);
  const setStatus = useMutation(api.reservations.setStatus);
  const createRes = useMutation(api.reservations.create);
  const removeWaitlist = useMutation(api.waitlist.remove);

  const [colorBy, setColorBy] = useState<"status" | "channel">("status");
  const [viewMode, setViewMode] = useState<"rooms" | "types">("rooms");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All room types");
  const [hkFilter, setHkFilter] = useState("All housekeeping");
  const [channelFilter, setChannelFilter] = useState("All channels");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openResId, setOpenResId] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ resId: string; x: number; y: number } | null>(null);
  const [newRes, setNewRes] = useState<Partial<NewResInit> | null>(null);
  const [assignWaitlistId, setAssignWaitlistId] = useState<string | null>(null);

  const days = useMemo(
    () => Array.from({ length: DAYS }, (_, i) => addDays(WINDOW_START, i)),
    []
  );

  const roomTypeNames = useMemo(
    () => Array.from(new Set((rooms ?? []).map((r) => r.type))),
    [rooms]
  );

  // ---- reservations keyed by room, after search + channel filter ----------
  const resByRoom = useMemo(() => {
    const map = new Map<string, Reservations>();
    for (const res of reservations ?? []) {
      if (!res.roomId || res.status === "cancelled") continue;
      if (channelFilter !== "All channels" && (res.channel ?? "Direct") !== channelFilter)
        continue;
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
  }, [reservations, search, channelFilter]);

  // ---- groups by room type ---------------------------------------------
  const groups = useMemo(() => {
    if (!rooms) return [];
    const byType = new Map<string, Rooms>();
    for (const r of rooms) {
      if (typeFilter !== "All room types" && r.type !== typeFilter) continue;
      if (hkFilter !== "All housekeeping" && r.status !== hkFilter) continue;
      if (!byType.has(r.type)) byType.set(r.type, []);
      byType.get(r.type)!.push(r);
    }
    return Array.from(byType.entries()).map(([type, rs]) => {
      const total = (rooms ?? []).filter((r) => r.type === type).length || 1;
      const aggOcc = days.map((d) => {
        const dISO = iso(d);
        const occ = (reservations ?? []).filter(
          (res) =>
            res.roomType === type &&
            res.status !== "cancelled" &&
            res.checkIn <= dISO &&
            res.checkOut > dISO
        ).length;
        return Math.round((occ / total) * 100);
      });
      const rates = days.map((d) =>
        rp((NIGHTLY[type] ?? 1_850_000) * DOW_MULT[d.getUTCDay()])
      );
      return { type, rooms: rs, aggOcc, rates };
    });
  }, [rooms, reservations, typeFilter, hkFilter, days]);

  const occByDay = days.map((d) => {
    const dISO = iso(d);
    const total = rooms?.length ?? 0;
    const occ = (reservations ?? []).filter(
      (r) => r.checkIn <= dISO && r.checkOut > dISO && r.status !== "cancelled"
    ).length;
    return total ? Math.round((occ / total) * 100) : 0;
  });

  const blockColor = (r: Reservations[number]) =>
    colorBy === "channel"
      ? CHANNEL_COLOR[r.channel ?? "Direct"] ?? "var(--accent-violet)"
      : RES_STATUS_COLOR[r.status] ?? "var(--res-confirmed)";

  // ---- drag to move -----------------------------------------------------
  const [drag, setDrag] = useState<{
    resId: string;
    startX: number;
    cellW: number;
    origCheckIn: string;
    nights: number;
    dxDays: number;
  } | null>(null);
  const draggedRef = useRef(false);

  const startDrag = (e: React.MouseEvent, res: Reservations[number]) => {
    if (e.button !== 0) return;
    const track = (e.currentTarget as HTMLElement).parentElement;
    if (!track) return;
    const cellW = track.getBoundingClientRect().width / DAYS;
    draggedRef.current = false;
    setDrag({
      resId: res._id,
      startX: e.clientX,
      cellW,
      origCheckIn: res.checkIn,
      nights: nightsBetween(res.checkIn, res.checkOut),
      dxDays: 0,
    });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const dx = Math.round((e.clientX - drag.startX) / drag.cellW);
      if (dx !== 0) draggedRef.current = true;
      setDrag((d) => (d ? { ...d, dxDays: dx } : d));
    };
    const onUp = async () => {
      const d = drag;
      setDrag(null);
      if (d && d.dxDays !== 0) {
        const start = iso(addDays(new Date(d.origCheckIn + "T00:00:00Z"), d.dxDays));
        const end = iso(addDays(new Date(start + "T00:00:00Z"), d.nights));
        await updateDates({ id: d.resId as Id<"reservations">, checkIn: start, checkOut: end });
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, updateDates]);

  const selectedRes =
    (reservations ?? []).find((r) => r._id === openResId) ?? null;
  const ctxRes = (reservations ?? []).find((r) => r._id === ctxMenu?.resId) ?? null;

  const GRID = { gridTemplateColumns: `150px repeat(${DAYS}, 1fr)` } as React.CSSProperties;

  const legend =
    colorBy === "status"
      ? ["inhouse", "confirmed", "tentative", "departed"].map((s) => ({
          label: RES_STATUS_LABEL[s],
          color: RES_STATUS_COLOR[s],
        }))
      : Object.entries(CHANNEL_COLOR).map(([label, color]) => ({ label, color }));

  const toggleCollapse = (type: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      n.has(type) ? n.delete(type) : n.add(type);
      return n;
    });
  const toggleRoom = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

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
          {["All room types", ...roomTypeNames].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          value={hkFilter}
          onChange={(e) => setHkFilter(e.target.value)}
          className="rounded-sm border border-line bg-elevated px-2.5 py-2 text-12 text-fg-2"
        >
          {["All housekeeping", ...HK_STATUSES].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="rounded-sm border border-line bg-elevated px-2.5 py-2 text-12 text-fg-2"
        >
          {["All channels", ...CHANNELS].map((c) => (
            <option key={c}>{c}</option>
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
        <Segmented<"rooms" | "types">
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: "rooms", label: "Rooms" },
            { value: "types", label: "Room types" },
          ]}
        />
      </div>

      {/* Range + legend */}
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <div className="text-12 text-fg-3">
          {iso(days[0])} – {iso(days[DAYS - 1])}
        </div>
        {legend.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5 text-12 text-fg-3">
            <span className="h-2 w-2 rounded-pill" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
        <button
          onClick={() => setNewRes({})}
          className="ml-auto rounded-sm bg-accent-violet px-3.5 py-2 text-13 font-medium text-ice transition-colors hover:bg-accent-violet-hi"
        >
          + New reservation
        </button>
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="mb-2.5 flex flex-wrap items-center gap-2.5 rounded-md border border-accent-violet bg-violet-wash px-3.5 py-2.5">
          <span className="text-12 font-semibold text-ice">
            {selected.size} room{selected.size > 1 ? "s" : ""} selected
          </span>
          <button
            onClick={() => setNewRes({ multi: selected.size })}
            className="rounded-sm bg-accent-violet px-3 py-1.5 text-12 font-medium text-ice hover:bg-accent-violet-hi"
          >
            Book together
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-12 text-fg-3 hover:text-fg-1"
          >
            Clear
          </button>
        </div>
      )}

      {/* Grid */}
      <Card className="overflow-x-auto p-0">
        <div className="min-w-[860px]">
          {/* header */}
          <div className="grid" style={GRID}>
            <div className="border-b border-line px-3 py-2.5 text-[11px] text-fg-3">
              Room type
            </div>
            {days.map((d) => (
              <div
                key={iso(d)}
                className="border-b border-l border-line py-2 text-center font-mono text-[11px] text-fg-3"
                style={{ background: iso(d) === TODAY_ISO ? "var(--violet-wash)" : undefined }}
              >
                <div className="text-[9px] font-semibold uppercase text-fg-2">
                  {DOW[d.getUTCDay()]}
                </div>
                <div>{d.getUTCDate()}</div>
              </div>
            ))}
          </div>

          {!rooms && <div className="px-3 py-4 text-13 text-fg-3">Loading tape chart…</div>}

          {groups.map((g) => {
            const isCollapsed = viewMode === "types" || collapsed.has(g.type);
            return (
              <React.Fragment key={g.type}>
                {/* group header — collapsible; shows agg occupancy or rate row */}
                <div
                  onClick={() =>
                    viewMode === "types" ? setViewMode("rooms") : toggleCollapse(g.type)
                  }
                  className="grid cursor-pointer border-b border-line bg-deep"
                  style={GRID}
                >
                  <div className="flex items-center gap-1.5 px-3 py-2 text-12 font-semibold text-ice">
                    {isCollapsed ? (
                      <ChevronRight className="h-[13px] w-[13px] text-fg-3" />
                    ) : (
                      <ChevronDown className="h-[13px] w-[13px] text-fg-3" />
                    )}
                    {g.type}
                    <span className="text-[10.5px] font-normal text-fg-3">
                      · {g.rooms.length}
                    </span>
                  </div>
                  {(isCollapsed ? g.aggOcc : g.rates).map((cell, i) => (
                    <div
                      key={i}
                      className="border-l border-line-soft py-2 text-center font-mono text-[10.5px]"
                      style={{ color: isCollapsed ? "var(--accent-cyan)" : "var(--fg-3)" }}
                    >
                      {isCollapsed ? `${cell}%` : cell}
                    </div>
                  ))}
                </div>

                {/* rooms */}
                {!isCollapsed &&
                  g.rooms.map((room) => {
                    const list = resByRoom.get(room._id) ?? [];
                    return (
                      <div
                        key={room._id}
                        className="grid border-b border-line-soft"
                        style={{ gridTemplateColumns: "150px 1fr" }}
                      >
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={selected.has(room._id)}
                            onChange={() => toggleRoom(room._id)}
                            className="accent-accent-violet"
                          />
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
                          {days.map((d, i) => (
                            <div
                              key={i}
                              onClick={() =>
                                setNewRes({
                                  roomId: room._id,
                                  roomType: room.type,
                                  checkIn: iso(d),
                                  checkOut: iso(addDays(d, 1)),
                                })
                              }
                              className="h-9 cursor-cell border-l border-line-soft transition-colors hover:bg-elevated"
                            />
                          ))}
                          {list.map((res) => {
                            const shift =
                              drag && drag.resId === res._id ? drag.dxDays : 0;
                            const s = dayIndex(res.checkIn) + shift;
                            const e = dayIndex(res.checkOut) + shift;
                            // Blocks straddle columns: from the middle of the
                            // check-in day to the middle of the check-out day.
                            const leftPct =
                              Math.max(0, Math.min(1, (s + 0.5) / DAYS)) * 100;
                            const rightPct =
                              Math.max(0, Math.min(1, (e + 0.5) / DAYS)) * 100;
                            const widthPct = rightPct - leftPct;
                            if (widthPct <= 0) return null;
                            const color = blockColor(res);
                            const dragging = drag?.resId === res._id;
                            return (
                              <div
                                key={res._id}
                                title={`${res.guestName} · ${RES_STATUS_LABEL[res.status] ?? res.status} · drag to move`}
                                onMouseDown={(e) => startDrag(e, res)}
                                onClick={() => {
                                  if (draggedRef.current) {
                                    draggedRef.current = false;
                                    return;
                                  }
                                  setOpenResId(res._id);
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  setCtxMenu({ resId: res._id, x: e.clientX, y: e.clientY });
                                }}
                                className="absolute top-1.5 bottom-1.5 flex select-none items-center overflow-hidden whitespace-nowrap rounded-[6px] border px-2 text-12 text-ice"
                                style={{
                                  left: `${leftPct}%`,
                                  width: `${widthPct}%`,
                                  background: `color-mix(in srgb, ${color} 26%, var(--bg-deep))`,
                                  borderColor: color,
                                  cursor: dragging ? "grabbing" : "grab",
                                  transition: dragging ? "none" : "left 40ms linear",
                                  opacity: dragging ? 0.85 : 1,
                                  zIndex: dragging ? 5 : 1,
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
            );
          })}

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

      {/* Waitlist */}
      <div className="mt-4">
        <Eyebrow className="mb-2.5">Waitlist · unassigned requests</Eyebrow>
        <Card className="overflow-hidden p-0">
          {!waitlist && <div className="px-4 py-3 text-13 text-fg-3">Loading…</div>}
          {waitlist?.length === 0 && (
            <div className="px-4 py-3 text-13 text-fg-3">Nothing waiting. Clear runway.</div>
          )}
          {waitlist?.map((w) => (
            <div
              key={w._id}
              className="flex flex-wrap items-center gap-3.5 border-b border-line-soft px-4 py-3 text-13 last:border-0"
            >
              <div className="min-w-[140px] flex-1 font-medium">{w.guest}</div>
              <div className="w-[110px] text-12 text-fg-3">{w.roomType}</div>
              <div className="w-[150px] font-mono text-12 text-fg-3">
                {w.checkIn} → {w.checkOut}
              </div>
              <div className="w-[120px] text-12 text-fg-3">{w.party}</div>
              <div className="w-[90px] text-12 text-fg-3">{w.source}</div>
              <button
                onClick={() => {
                  setAssignWaitlistId(w._id);
                  setNewRes({
                    guestName: w.guest,
                    roomType: w.roomType,
                    checkIn: w.checkIn,
                    checkOut: w.checkOut,
                  });
                }}
                className="rounded-sm border border-line bg-fg-1/[0.06] px-3 py-1.5 text-12 hover:border-line-strong"
              >
                Assign room
              </button>
            </div>
          ))}
        </Card>
      </div>

      {/* Slide-over */}
      {selectedRes && (
        <ReservationSlideOver
          res={selectedRes as SlideOverReservation}
          onClose={() => setOpenResId(null)}
        />
      )}

      {/* Context menu */}
      {ctxMenu &&
        ctxRes &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => setCtxMenu(null)} />
            <div
              className="fixed z-[71] flex min-w-[172px] flex-col rounded-md border border-line-strong bg-elevated p-1.5 shadow-3"
              style={{ left: ctxMenu.x, top: ctxMenu.y }}
            >
              <div className="px-2 py-1.5 text-[11px] text-fg-3">{ctxRes.guestName}</div>
              <button
                onClick={async () => {
                  await setStatus({
                    id: ctxMenu.resId as Id<"reservations">,
                    status: "inhouse",
                  });
                  setCtxMenu(null);
                }}
                className="flex items-center gap-2 rounded-sm p-2 text-left text-[12.5px] text-fg-1 hover:bg-deep"
              >
                <LogIn className="h-3.5 w-3.5" /> Check in
              </button>
              <button
                onClick={() => {
                  setCtxMenu(null);
                  setOpenResId(ctxMenu.resId);
                }}
                className="flex items-center gap-2 rounded-sm p-2 text-left text-[12.5px] text-fg-1 hover:bg-deep"
              >
                <Move className="h-3.5 w-3.5" /> Move reservation
              </button>
              <button
                onClick={async () => {
                  await setStatus({
                    id: ctxMenu.resId as Id<"reservations">,
                    status: "cancelled",
                  });
                  setCtxMenu(null);
                }}
                className="flex items-center gap-2 rounded-sm p-2 text-left text-[12.5px] text-room-ooo hover:bg-deep"
              >
                <XCircle className="h-3.5 w-3.5" /> Cancel reservation
              </button>
            </div>
          </>,
          document.body
        )}

      {/* New reservation modal */}
      {newRes && activeProperty && (
        <NewReservationModal
          init={newRes}
          rooms={rooms ?? []}
          roomTypeNames={roomTypeNames}
          onClose={() => {
            setNewRes(null);
            setAssignWaitlistId(null);
          }}
          onCreate={async (payload) => {
            await createRes({ propertyId: activeProperty._id, ...payload });
            if (assignWaitlistId) {
              await removeWaitlist({ id: assignWaitlistId as Id<"waitlist"> });
            }
            setSelected(new Set());
            setNewRes(null);
            setAssignWaitlistId(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------- New reservation modal */

interface NewResInit {
  guestName: string;
  roomId: Id<"rooms">;
  roomType: string;
  checkIn: string;
  checkOut: string;
  multi: number;
}

interface CreatePayload {
  guestName: string;
  email?: string;
  phone?: string;
  checkIn: string;
  checkOut: string;
  roomId?: Id<"rooms">;
  roomType: string;
  channel: string;
  status: string;
  adults: number;
  children: number;
}

function NewReservationModal({
  init,
  rooms,
  roomTypeNames,
  onClose,
  onCreate,
}: {
  init: Partial<NewResInit>;
  rooms: Rooms;
  roomTypeNames: string[];
  onClose: () => void;
  onCreate: (p: CreatePayload) => Promise<void>;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [f, setF] = useState({
    guestName: init.guestName ?? "",
    email: "",
    phone: "",
    checkIn: init.checkIn ?? iso(addDays(WINDOW_START, dayIndex(TODAY_ISO))),
    checkOut: init.checkOut ?? iso(addDays(WINDOW_START, dayIndex(TODAY_ISO) + 2)),
    roomType: init.roomType ?? roomTypeNames[0] ?? "Double Queen",
    roomId: (init.roomId ?? "") as string,
    adults: 2,
    children: 0,
    channel: "Direct",
    status: "Confirmed",
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  const roomOptions = rooms.filter((r) => r.type === f.roomType);
  const nights = Math.max(1, dayIndex(f.checkOut) - dayIndex(f.checkIn));
  const estimate =
    (NIGHTLY[f.roomType] ?? 1_850_000) *
    nights *
    (DOW_MULT[new Date(f.checkIn + "T00:00:00Z").getUTCDay()] ?? 1);

  const canSubmit =
    f.guestName.trim() && dayIndex(f.checkOut) > dayIndex(f.checkIn) && !busy;

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-deepest/70 backdrop-blur-[6px]"
      />
      <div className="upx-scroll fixed left-1/2 top-1/2 z-[61] max-h-[86vh] w-[560px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-line bg-deep p-6 shadow-3">
        <div className="mb-1 flex items-start justify-between">
          <div className="font-display text-18 font-bold text-ice">New reservation</div>
          <button onClick={onClose} className="text-fg-3 hover:text-ice" aria-label="Close">
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="mb-4 text-[12.5px] text-fg-3">
          {init.multi
            ? `Booking ${init.multi} selected rooms together`
            : init.roomId
              ? `Prefilled from the ${f.roomType} track`
              : "Blank reservation"}
        </div>

        <Eyebrow className="mb-2">Guest</Eyebrow>
        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <input
            placeholder="Guest name"
            value={f.guestName}
            onChange={(e) => set("guestName", e.target.value)}
            className="col-span-2 rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-ice outline-none focus:border-accent-violet"
          />
          <input
            placeholder="Email"
            value={f.email}
            onChange={(e) => set("email", e.target.value)}
            className="rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-ice outline-none focus:border-accent-violet"
          />
          <input
            placeholder="Phone"
            value={f.phone}
            onChange={(e) => set("phone", e.target.value)}
            className="rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-ice outline-none focus:border-accent-violet"
          />
        </div>

        <Eyebrow className="mb-2">Stay</Eyebrow>
        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <Labelled label="Check-in">
            <input
              type="date"
              value={f.checkIn}
              onChange={(e) => set("checkIn", e.target.value)}
              className="w-full rounded-sm border border-line bg-ink px-2.5 py-2 font-mono text-[12.5px] text-ice"
            />
          </Labelled>
          <Labelled label="Check-out">
            <input
              type="date"
              value={f.checkOut}
              onChange={(e) => set("checkOut", e.target.value)}
              className="w-full rounded-sm border border-line bg-ink px-2.5 py-2 font-mono text-[12.5px] text-ice"
            />
          </Labelled>
          <Labelled label="Room type">
            <select
              value={f.roomType}
              onChange={(e) => set("roomType", e.target.value)}
              className="w-full rounded-sm border border-line bg-ink px-2.5 py-2 text-[12.5px] text-ice"
            >
              {roomTypeNames.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Labelled>
          <Labelled label="Room">
            <select
              value={f.roomId}
              onChange={(e) => set("roomId", e.target.value)}
              className="w-full rounded-sm border border-line bg-ink px-2.5 py-2 text-[12.5px] text-ice"
            >
              <option value="">Auto-assign</option>
              {roomOptions.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.roomNumber}
                </option>
              ))}
            </select>
          </Labelled>
          <Labelled label="Adults">
            <input
              type="number"
              min={1}
              value={f.adults}
              onChange={(e) => set("adults", Number(e.target.value))}
              className="w-full rounded-sm border border-line bg-ink px-2.5 py-2 font-mono text-[12.5px] text-ice"
            />
          </Labelled>
          <Labelled label="Children">
            <input
              type="number"
              min={0}
              value={f.children}
              onChange={(e) => set("children", Number(e.target.value))}
              className="w-full rounded-sm border border-line bg-ink px-2.5 py-2 font-mono text-[12.5px] text-ice"
            />
          </Labelled>
        </div>

        <Eyebrow className="mb-2">Booking details</Eyebrow>
        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <Labelled label="Channel">
            <select
              value={f.channel}
              onChange={(e) => set("channel", e.target.value)}
              className="w-full rounded-sm border border-line bg-ink px-2.5 py-2 text-[12.5px] text-ice"
            >
              {CHANNELS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Labelled>
          <Labelled label="Status">
            <select
              value={f.status}
              onChange={(e) => set("status", e.target.value)}
              className="w-full rounded-sm border border-line bg-ink px-2.5 py-2 text-[12.5px] text-ice"
            >
              <option value="Confirmed">Confirmed</option>
              <option value="Tentative">Tentative</option>
              <option value="Guaranteed">Guaranteed</option>
            </select>
          </Labelled>
        </div>

        <textarea
          placeholder="Special requests"
          className="mb-5 min-h-[56px] w-full resize-y rounded-sm border border-line bg-ink px-2.5 py-2 text-[12.5px] text-ice outline-none focus:border-accent-violet"
        />

        <div className="flex items-center justify-between border-t border-line pt-3.5">
          <div className="text-12 text-fg-3">
            Rate estimate:{" "}
            <span className="font-mono font-semibold text-ice">{rp(estimate)}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-sm border border-line bg-fg-1/[0.06] px-4 py-2.5 text-13 hover:border-line-strong"
            >
              Cancel
            </button>
            <button
              disabled={!canSubmit}
              onClick={async () => {
                setBusy(true);
                await onCreate({
                  guestName: f.guestName.trim(),
                  email: f.email.trim() || undefined,
                  phone: f.phone.trim() || undefined,
                  checkIn: f.checkIn,
                  checkOut: f.checkOut,
                  roomId: f.roomId ? (f.roomId as Id<"rooms">) : undefined,
                  roomType: f.roomType,
                  channel: f.channel,
                  status:
                    f.status === "Confirmed"
                      ? "confirmed"
                      : f.status === "Tentative"
                        ? "tentative"
                        : "confirmed",
                  adults: f.adults,
                  children: f.children,
                });
              }}
              className="rounded-sm bg-accent-violet px-4 py-2.5 text-13 font-semibold text-ice transition-colors hover:bg-accent-violet-hi disabled:opacity-40"
            >
              {busy ? "Creating…" : "Create reservation"}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-fg-3">{label}</span>
      {children}
    </label>
  );
}
