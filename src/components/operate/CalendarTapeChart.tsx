"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useProperty } from "@/components/providers/PropertyProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { reservationActions } from "@/lib/resStatus";
import PmsDateChip from "@/components/common/PmsDateChip";
import { ChevronRight, ChevronDown, X, LogIn, Move, XCircle, Zap } from "lucide-react";
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

const DAYS = 14;
const STEP = 7; // days the ‹ / › buttons shift the window
const FALLBACK_TODAY = "2026-09-08";
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HK_STATUSES = ["Vacant Clean", "Vacant Dirty", "Occupied", "Inspected", "OOO", "OOS"];
const RATE_SOURCE_COLOR: Record<string, string> = {
  rack: "var(--fg-3)",
  dynamic: "var(--accent-cyan)",
  manual: "var(--accent-violet-hi)",
};
const CHANNELS = ["Direct", "Booking.com", "Agoda", "Expedia", "Traveloka"];
const CHANNEL_COLOR: Record<string, string> = {
  Direct: "var(--accent-cyan)",
  "Booking.com": "var(--accent-violet)",
  Agoda: "var(--room-vacant-dirty)",
  Expedia: "var(--info)",
  Traveloka: "var(--room-ooo)",
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const dm = (d: Date) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}`; // 8/9
const dmIso = (s: string) => dm(new Date(s + "T00:00:00Z"));
const addDays = (base: Date, n: number) => {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};
const diffDays = (a: string, b: string) =>
  Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
const money = (n: number) => Math.round(n).toLocaleString("en-US");
const rp = (n: number) => `Rp ${money(n)}`;
const nightsBetween = (a: string, b: string) => Math.max(1, diffDays(a, b));

type Board = FunctionReturnType<typeof api.calendar.getCalendarBoard>;
type BoardRes = Board["reservations"][number];
type BoardRoom = Board["rooms"][number];
type BoardBlock = Board["blocks"][number];

export default function CalendarTapeChart() {
  const { activeProperty } = useProperty();
  const toast = useToast();
  const arg = activeProperty ? { propertyId: activeProperty._id } : "skip";
  const waitlist = useQuery(api.waitlist.list, arg);

  const updateDates = useMutation(api.reservations.updateDates);
  const setStatus = useMutation(api.reservations.setStatus);
  const createRes = useMutation(api.reservations.create);
  const removeWaitlist = useMutation(api.waitlist.remove);
  const assignOne = useMutation(api.reservations.assignOne);
  const clearBlock = useMutation(api.operate.clearRoomBlock);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignFailId, setAssignFailId] = useState<string | null>(null);

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
  const [blockMenu, setBlockMenu] = useState<{
    block: BoardBlock;
    roomNumber: string;
    x: number;
    y: number;
  } | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [peek, setPeek] = useState<
    { roomType: string; date: string; kind: "assigned" | "unassigned" } | null
  >(null);
  const [newRes, setNewRes] = useState<Partial<NewResInit> | null>(null);
  const [assignWaitlistId, setAssignWaitlistId] = useState<string | null>(null);

  // The PMS business date drives "today" — not the wall clock. It only
  // advances when the night audit runs (see /finance/night-audit).
  const todayIso = activeProperty?.businessDate ?? FALLBACK_TODAY;
  // Window start: the business date, unless the user has paged / picked away.
  const [anchorIso, setAnchorIso] = useState<string | null>(null);
  const startIso = anchorIso ?? todayIso;
  const days = useMemo(() => {
    const t = new Date(startIso + "T00:00:00Z");
    return Array.from({ length: DAYS }, (_, i) => addDays(t, i));
  }, [startIso]);
  const windowStartIso = iso(days[0]);
  const windowEndIso = iso(days[DAYS - 1]);
  const dayCol = (isoDate: string) => diffDays(windowStartIso, isoDate);
  const shiftWindow = (deltaDays: number) =>
    setAnchorIso(iso(addDays(new Date(startIso + "T00:00:00Z"), deltaDays)));

  const board = useQuery(
    api.calendar.getCalendarBoard,
    activeProperty
      ? { propertyId: activeProperty._id, from: windowStartIso, to: windowEndIso }
      : "skip"
  );

  const rooms = board?.rooms;
  const reservations = board?.reservations;
  // Every reservation the screen might reference (assigned rows + the
  // sold-but-unassigned rail), for slide-over / context-menu lookups.
  const allRes = useMemo(
    () => [...(board?.reservations ?? []), ...(board?.unassigned ?? [])],
    [board]
  );

  // Sold, not yet given a room number — surfaced in its own rail below.
  const unassignedRes = board?.unassigned ?? [];

  const roomTypeNames = useMemo(
    () => Array.from(new Set((rooms ?? []).map((r) => r.type))),
    [rooms]
  );

  // ---- rate grid + room blocks keyed for O(1) lookup --------------------
  const rateCell = useMemo(() => {
    const m = new Map<string, Board["rateGrid"][number]>();
    for (const c of board?.rateGrid ?? []) m.set(`${c.roomType}|${c.date}`, c);
    return m;
  }, [board]);
  const blocksByRoom = useMemo(() => {
    const m = new Map<string, BoardBlock[]>();
    for (const b of board?.blocks ?? []) {
      if (!m.has(b.roomId)) m.set(b.roomId, []);
      m.get(b.roomId)!.push(b);
    }
    return m;
  }, [board]);
  const blockOnRoomDate = (roomId: string, isoDate: string) =>
    (blocksByRoom.get(roomId) ?? []).find(
      (b) => b.from <= isoDate && (b.to === "" || b.to > isoDate)
    );

  // ---- reservations keyed by room, after search + channel filter ----------
  const resByRoom = useMemo(() => {
    const map = new Map<string, BoardRes[]>();
    for (const res of reservations ?? []) {
      if (!res.roomId) continue;
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
    if (!board) return [];
    const byType = new Map<string, BoardRoom[]>();
    for (const r of board.rooms) {
      if (typeFilter !== "All room types" && r.type !== typeFilter) continue;
      if (hkFilter !== "All housekeeping" && r.status !== hkFilter) continue;
      if (!byType.has(r.type)) byType.set(r.type, []);
      byType.get(r.type)!.push(r);
    }
    return Array.from(byType.entries()).map(([type, rs]) => {
      const occRow = board.typeOcc[type] ?? [];
      const cells = days.map((d) => {
        const dISO = iso(d);
        const o = occRow.find((x) => x.date === dISO);
        const c = rateCell.get(`${type}|${dISO}`);
        return {
          date: dISO,
          rate: c ? money(c.rate) : "—",
          rateSource: c?.source ?? "rack",
          available: o?.available ?? 0,
          assigned: o?.assigned ?? 0,
          unassigned: o?.unassigned ?? 0,
          held: o?.held ?? 0,
          occPct: o?.occPct ?? 0,
        };
      });
      return { type, rooms: rs, cells };
    });
  }, [board, typeFilter, hkFilter, days, rateCell]);

  const occByDay = days.map(
    (d) => board?.occByDay.find((x) => x.date === iso(d)) ?? null
  );

  // Reservations behind an available/assigned/unassigned box, for the peek.
  const peekList = useMemo(() => {
    if (!peek) return [];
    const released = new Set(["cancelled", "departed", "no_show"]);
    return allRes.filter(
      (r) =>
        !released.has(r.status) &&
        r.roomType === peek.roomType &&
        r.checkIn <= peek.date &&
        r.checkOut > peek.date &&
        (peek.kind === "assigned" ? !!r.roomId : !r.roomId)
    );
  }, [peek, allRes]);

  const blockColor = (r: BoardRes) =>
    colorBy === "channel"
      ? CHANNEL_COLOR[r.channel ?? "Direct"] ?? "var(--accent-violet)"
      : RES_STATUS_COLOR[r.status] ?? "var(--res-confirmed)";

  // ---- drag to move (across dates and rooms) --------------------------
  const [drag, setDrag] = useState<{
    resId: string;
    startX: number;
    cellW: number;
    origCheckIn: string;
    nights: number;
    dxDays: number;
    origRoomId?: string;
    origRoomNumber: string;
    origRoomType: string;
    targetRoomId?: string;
  } | null>(null);
  const draggedRef = useRef(false);

  // A completed drag that needs confirmation before it is written.
  const [pendingMove, setPendingMove] = useState<{
    resId: string;
    guestName: string;
    fromLabel: string;
    fromType: string;
    toLabel: string;
    toType: string;
    fromDates: string;
    toDates: string;
    checkIn: string;
    checkOut: string;
    roomId?: string;
    typeChanged: boolean;
  } | null>(null);

  const startDrag = (e: React.MouseEvent, res: BoardRes) => {
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
      origRoomId: res.roomId as string | undefined,
      origRoomNumber: res.roomNumber ?? "—",
      origRoomType: res.roomType ?? "—",
    });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const dx = Math.round((e.clientX - drag.startX) / drag.cellW);
      const rowEl = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>("[data-room-id]");
      const overRoomId = rowEl?.dataset.roomId;
      if (dx !== 0 || (overRoomId && overRoomId !== drag.origRoomId)) {
        draggedRef.current = true;
      }
      setDrag((d) =>
        d ? { ...d, dxDays: dx, targetRoomId: overRoomId ?? d.targetRoomId } : d
      );
    };
    const onUp = () => {
      const d = drag;
      setDrag(null);
      if (!d) return;
      const roomChanged = !!d.targetRoomId && d.targetRoomId !== d.origRoomId;
      if (d.dxDays === 0 && !roomChanged) return;

      const start = iso(
        addDays(new Date(d.origCheckIn + "T00:00:00Z"), d.dxDays)
      );
      const end = iso(addDays(new Date(start + "T00:00:00Z"), d.nights));
      const targetRoom = roomChanged
        ? (rooms ?? []).find((r) => r._id === d.targetRoomId)
        : undefined;
      const res = allRes.find((r) => r._id === d.resId);
      const landingRoomId = (roomChanged ? d.targetRoomId : d.origRoomId) as
        | string
        | undefined;

      // Availability guard: the landing room must be free every night of the
      // new stay — not OOO/OOS, no other live reservation, no dated block.
      if (landingRoomId) {
        const landingRoom = (rooms ?? []).find((r) => r._id === landingRoomId);
        if (
          landingRoom &&
          (landingRoom.status === "OOO" || landingRoom.status === "OOS")
        ) {
          toast(
            `Room ${landingRoom.roomNumber} is ${landingRoom.status} — not sellable.`,
            "error"
          );
          return;
        }
        for (
          let nd = start;
          nd < end;
          nd = iso(addDays(new Date(nd + "T00:00:00Z"), 1))
        ) {
          const blk = blockOnRoomDate(landingRoomId, nd);
          if (blk) {
            toast(
              `That room is ${blk.kind} (${blk.reason}) on ${dmIso(nd)}.`,
              "error"
            );
            return;
          }
        }
        const clash = (resByRoom.get(landingRoomId) ?? []).find(
          (o) => o._id !== d.resId && o.checkIn < end && o.checkOut > start
        );
        if (clash) {
          toast(
            `${targetRoom?.roomNumber ?? d.origRoomNumber} is already booked (${clash.guestName}).`,
            "error"
          );
          return;
        }
      }

      setPendingMove({
        resId: d.resId,
        guestName: res?.guestName ?? "Reservation",
        fromLabel: d.origRoomNumber,
        fromType: d.origRoomType,
        toLabel: targetRoom?.roomNumber ?? d.origRoomNumber,
        toType: targetRoom?.type ?? d.origRoomType,
        fromDates: `${dmIso(d.origCheckIn)} → ${dmIso(
          iso(addDays(new Date(d.origCheckIn + "T00:00:00Z"), d.nights))
        )}`,
        toDates: `${dmIso(start)} → ${dmIso(end)}`,
        checkIn: start,
        checkOut: end,
        roomId: roomChanged ? d.targetRoomId : undefined,
        typeChanged: !!targetRoom && targetRoom.type !== d.origRoomType,
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, rooms, allRes, resByRoom, blocksByRoom]);

  const confirmMove = async () => {
    if (!pendingMove) return;
    const p = pendingMove;
    setPendingMove(null);
    try {
      await updateDates({
        id: p.resId as Id<"reservations">,
        checkIn: p.checkIn,
        checkOut: p.checkOut,
        ...(p.roomId ? { roomId: p.roomId as Id<"rooms"> } : {}),
      });
      toast(
        p.roomId
          ? `Moved ${p.guestName} to ${p.toLabel} · ${p.toType}`
          : `Rescheduled ${p.guestName}`,
        "success"
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Move rejected", "error");
    }
  };

  const selectedRes = allRes.find((r) => r._id === openResId) ?? null;
  const ctxRes = allRes.find((r) => r._id === ctxMenu?.resId) ?? null;

  const GRID = {
    gridTemplateColumns: `150px repeat(${DAYS}, minmax(66px,1fr))`,
  } as React.CSSProperties;

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
        <button
          onClick={() => setNewRes({})}
          className="ml-auto rounded-sm bg-accent-violet px-3.5 py-2 text-13 font-medium text-ice transition-colors hover:bg-accent-violet-hi"
        >
          + New reservation
        </button>
      </div>

      {/* Range + legend */}
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <PmsDateChip />
        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftWindow(-STEP)}
            className="rounded-sm border border-line bg-elevated px-2 py-1.5 text-12 text-fg-2 hover:border-line-strong"
            aria-label="Previous week"
          >
            ‹
          </button>
          <input
            type="date"
            value={startIso}
            onChange={(e) => e.target.value && setAnchorIso(e.target.value)}
            className="rounded-sm border border-line bg-elevated px-2 py-1.5 font-mono text-12 text-ice"
          />
          <button
            onClick={() => shiftWindow(STEP)}
            className="rounded-sm border border-line bg-elevated px-2 py-1.5 text-12 text-fg-2 hover:border-line-strong"
            aria-label="Next week"
          >
            ›
          </button>
          {anchorIso && anchorIso !== todayIso && (
            <button
              onClick={() => setAnchorIso(null)}
              className="rounded-sm border border-line bg-elevated px-2 py-1.5 text-12 text-accent-violet-hi hover:border-line-strong"
            >
              Today
            </button>
          )}
        </div>
        <div className="text-12 text-fg-3">
          {dm(days[0])} – {dm(days[DAYS - 1])}
        </div>
        {legend.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5 text-12 text-fg-3">
            <span className="h-2 w-2 rounded-pill" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}

        <span className="h-3 w-px bg-line" />

        <div className="flex items-center gap-1.5 text-12 text-fg-3">
          <span className="rounded-[4px] bg-accent-cyan/10 px-[5px] font-mono text-[10px] font-bold text-accent-cyan">
            n
          </span>
          Available
          <span className="rounded-[4px] bg-fg-1/[0.08] px-[5px] font-mono text-[10px] font-bold text-fg-2">
            n
          </span>
          Assigned
          <span className="rounded-[4px] bg-room-ooo/[0.14] px-[5px] font-mono text-[10px] font-bold text-room-ooo">
            n
          </span>
          Unassigned
        </div>

        <span className="h-3 w-px bg-line" />

        <div className="flex items-center gap-1.5 text-12 text-fg-3">
          <Zap className="h-3 w-3 text-fg-2" />
          Auto-assigned
        </div>
        <div className="flex items-center gap-1.5 text-12 text-fg-3">
          <span
            className="h-2.5 w-3.5 rounded-[2px]"
            style={{
              background:
                "repeating-linear-gradient(45deg,var(--bg-elevated),var(--bg-elevated) 3px,color-mix(in srgb, var(--room-ooo) 55%, transparent) 3px,color-mix(in srgb, var(--room-ooo) 55%, transparent) 6px)",
            }}
          />
          OOO
        </div>
        <div className="flex items-center gap-1.5 text-12 text-fg-3">
          <span
            className="h-2.5 w-3.5 rounded-[2px]"
            style={{
              background:
                "repeating-linear-gradient(45deg,var(--bg-elevated),var(--bg-elevated) 3px,color-mix(in srgb, var(--room-oos) 55%, transparent) 3px,color-mix(in srgb, var(--room-oos) 55%, transparent) 6px)",
            }}
          />
          OOS
        </div>
        <div className="flex items-center gap-1.5 text-12 text-fg-3">
          <span
            className="h-2 w-3.5 rounded-[2px]"
            style={{ background: "var(--res-tentative)" }}
          />
          Group hold
        </div>

        <span className="h-3 w-px bg-line" />

        <div className="flex items-center gap-1.5 text-12 text-fg-3">
          <span className="text-fg-4">Rate</span>
          <span style={{ color: RATE_SOURCE_COLOR.rack }}>rack</span>
          <span style={{ color: RATE_SOURCE_COLOR.dynamic }}>dynamic</span>
          <span style={{ color: RATE_SOURCE_COLOR.manual }}>manual</span>
        </div>
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
        <div className="min-w-[1080px]">
          {/* header */}
          <div className="grid" style={GRID}>
            <div className="border-b border-line px-3 py-2.5 text-[11px] text-fg-3">
              Room type
            </div>
            {days.map((d) => (
              <div
                key={iso(d)}
                className="border-b border-l border-line py-2 text-center font-mono text-[11px] text-fg-3"
                style={{ background: iso(d) === todayIso ? "var(--violet-wash)" : undefined }}
              >
                <div className="text-[9px] font-semibold uppercase text-fg-2">
                  {DOW[d.getUTCDay()]}
                </div>
                <div>{dm(d)}</div>
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
                  {g.cells.map((cell, i) =>
                    isCollapsed ? (
                      <div
                        key={i}
                        onClick={(ev) => ev.stopPropagation()}
                        className="flex flex-col items-center gap-1 border-l border-line-soft px-1 py-1.5"
                      >
                        <span
                          className="font-mono text-[11px] font-semibold"
                          style={{ color: RATE_SOURCE_COLOR[cell.rateSource] }}
                          title={`${cell.rateSource} rate`}
                        >
                          {cell.rate}
                        </span>
                        <div className="flex flex-wrap justify-center gap-[3px]">
                          <span
                            className="rounded-[4px] bg-accent-cyan/10 px-[5px] font-mono text-[10px] font-bold text-accent-cyan"
                            title={`${cell.available} available`}
                          >
                            {cell.available}
                          </span>
                          {cell.assigned > 0 ? (
                            <button
                              onClick={() =>
                                setPeek({
                                  roomType: g.type,
                                  date: cell.date,
                                  kind: "assigned",
                                })
                              }
                              title={`${cell.assigned} assigned — view`}
                              className="rounded-[4px] bg-fg-1/[0.08] px-[5px] font-mono text-[10px] font-bold text-fg-2 hover:bg-fg-1/[0.18]"
                            >
                              {cell.assigned}
                            </button>
                          ) : (
                            <span className="rounded-[4px] bg-fg-1/[0.08] px-[5px] font-mono text-[10px] font-bold text-fg-2">
                              0
                            </span>
                          )}
                          {cell.unassigned > 0 && (
                            <button
                              onClick={() =>
                                setPeek({
                                  roomType: g.type,
                                  date: cell.date,
                                  kind: "unassigned",
                                })
                              }
                              title={`${cell.unassigned} sold, unassigned — view`}
                              className="rounded-[4px] bg-room-ooo/[0.14] px-[5px] font-mono text-[10px] font-bold text-room-ooo hover:bg-room-ooo/30"
                            >
                              {cell.unassigned}
                            </button>
                          )}
                          {cell.held > 0 && (
                            <span
                              className="rounded-[4px] bg-res-tentative/[0.16] px-[5px] font-mono text-[10px] font-bold text-res-tentative"
                              title={`${cell.held} held for a group block`}
                            >
                              {cell.held}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        key={i}
                        className="border-l border-line-soft py-2 text-center font-mono text-[10.5px]"
                        style={{ color: RATE_SOURCE_COLOR[cell.rateSource] }}
                        title={`${cell.rateSource} rate`}
                      >
                        {cell.rate}
                      </div>
                    )
                  )}
                </div>

                {/* group-held inventory band — unpicked rooms in active blocks */}
                {!isCollapsed && g.cells.some((c) => c.held > 0) && (
                  <div className="grid border-b border-line-soft bg-deep/60" style={GRID}>
                    <div className="px-3 py-1.5 text-[10.5px] font-medium text-res-tentative">
                      Group hold
                    </div>
                    {g.cells.map((c, i) => (
                      <div
                        key={i}
                        className="border-l border-line-soft py-1.5 text-center font-mono text-[10.5px]"
                        style={{
                          color: c.held > 0 ? "var(--res-tentative)" : "var(--fg-4)",
                        }}
                        title={c.held > 0 ? `${c.held} rooms held for a group block` : undefined}
                      >
                        {c.held > 0 ? c.held : "·"}
                      </div>
                    ))}
                  </div>
                )}

                {/* rooms */}
                {!isCollapsed &&
                  g.rooms.map((room) => {
                    const list = resByRoom.get(room._id) ?? [];
                    const roomBlocks = blocksByRoom.get(room._id) ?? [];
                    // OOO is indefinite — the whole row is out of the sell set
                    // until maintenance releases it, regardless of any end date.
                    const oooRoom = room.status === "OOO";
                    const hardBlock = oooRoom
                      ? roomBlocks.find((b) => b.kind === "OOO") ?? roomBlocks[0]
                      : undefined;
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
                            disabled={oooRoom}
                            onChange={() => toggleRoom(room._id)}
                            className="accent-accent-violet disabled:opacity-30"
                          />
                          <span
                            className="h-1.5 w-1.5 flex-none rounded-pill"
                            style={{ background: ROOM_STATUS_COLOR[room.status] }}
                            title={room.status}
                          />
                          <span className="font-mono text-12 text-fg-2">{room.roomNumber}</span>
                          {oooRoom && (
                            <span
                              className="ml-1 rounded-[3px] px-1 py-px text-[9px] font-bold leading-none"
                              style={{
                                color: ROOM_STATUS_COLOR.OOO,
                                border: `1px solid ${ROOM_STATUS_COLOR.OOO}`,
                              }}
                              title={hardBlock?.reason ?? "Out of order"}
                            >
                              OOO
                            </span>
                          )}
                        </div>
                        <div
                          data-room-id={room._id}
                          className="relative grid transition-colors"
                          style={{
                            gridTemplateColumns: `repeat(${DAYS}, 1fr)`,
                            background:
                              drag &&
                              drag.targetRoomId === room._id &&
                              drag.targetRoomId !== drag.origRoomId
                                ? "var(--violet-wash)"
                                : undefined,
                          }}
                        >
                          {days.map((d, i) => {
                            const blk =
                              hardBlock ?? blockOnRoomDate(room._id, iso(d));
                            if (blk) {
                              const c =
                                ROOM_STATUS_COLOR[blk.kind] ?? "var(--room-ooo)";
                              return (
                                <div
                                  key={i}
                                  title={`${blk.kind} — ${blk.reason} · click to release`}
                                  onClick={(ev) =>
                                    setBlockMenu({
                                      block: blk,
                                      roomNumber: room.roomNumber,
                                      x: ev.clientX,
                                      y: ev.clientY,
                                    })
                                  }
                                  className="h-9 cursor-pointer border-l border-line-soft"
                                  style={{
                                    background: `repeating-linear-gradient(45deg,var(--bg-elevated),var(--bg-elevated) 5px,color-mix(in srgb, ${c} 24%, transparent) 5px,color-mix(in srgb, ${c} 24%, transparent) 10px)`,
                                  }}
                                />
                              );
                            }
                            return (
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
                            );
                          })}
                          {list.map((res) => {
                            const shift =
                              drag && drag.resId === res._id ? drag.dxDays : 0;
                            const s = dayCol(res.checkIn) + shift;
                            const e = dayCol(res.checkOut) + shift;
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
                            const autoRoom = !!res.roomAutoAssigned;
                            return (
                              <div
                                key={res._id}
                                title={`${res.guestName} · ${RES_STATUS_LABEL[res.status] ?? res.status}${
                                  autoRoom ? " · room auto-assigned" : ""
                                } · drag to move`}
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
                                className="absolute top-1.5 bottom-1.5 flex select-none items-center gap-1 overflow-hidden whitespace-nowrap rounded-[6px] border px-2 text-12 text-ice"
                                style={{
                                  left: `${leftPct}%`,
                                  width: `${widthPct}%`,
                                  background: `color-mix(in srgb, ${color} 26%, var(--bg-deep))`,
                                  borderColor: color,
                                  borderStyle: autoRoom ? "dashed" : "solid",
                                  cursor: dragging ? "grabbing" : "grab",
                                  transition: dragging ? "none" : "left 40ms linear",
                                  opacity: dragging ? 0.85 : 1,
                                  zIndex: dragging ? 5 : 1,
                                }}
                              >
                                {autoRoom && (
                                  <Zap
                                    className="h-3 w-3 flex-none opacity-80"
                                    style={{ color }}
                                  />
                                )}
                                <span className="overflow-hidden text-ellipsis">
                                  {res.guestName}
                                </span>
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

          {/* Occupancy footer — on the books, sellable-room basis, includes
              sold rooms not yet assigned a number */}
          <div className="grid border-t border-line bg-deep" style={GRID}>
            <div className="px-3 py-2.5 text-12 font-semibold text-ice">
              Occupancy
              <span className="ml-1 font-normal text-[10px] text-fg-4">
                on the books
              </span>
            </div>
            {occByDay.map((o, i) => (
              <div
                key={i}
                className="border-l border-line-soft py-2.5 text-center font-mono text-12 font-semibold text-accent-cyan"
                title={
                  o
                    ? `${o.sold} of ${o.sellable} sellable${
                        o.unassignedSold ? ` · ${o.unassignedSold} unassigned` : ""
                      }`
                    : undefined
                }
              >
                {o ? `${o.occPct}%` : "—"}
                {o && o.unassignedSold > 0 && (
                  <span className="ml-0.5 align-super text-[8px] text-res-tentative">
                    +{o.unassignedSold}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Sold but not yet assigned a room number */}
      {unassignedRes.length > 0 && (
        <div className="mt-4">
          <Eyebrow className="mb-2.5">
            Sold, not yet assigned · {unassignedRes.length} need a room number
          </Eyebrow>
          <Card className="overflow-hidden p-0">
            {unassignedRes.map((r) => (
              <div
                key={r._id}
                className="flex flex-wrap items-center gap-3.5 border-b border-line-soft px-4 py-3 text-13 last:border-0"
              >
                <button
                  onClick={() => setOpenResId(r._id)}
                  className="min-w-[140px] flex-1 text-left font-medium hover:text-accent-violet-hi"
                >
                  {r.guestName}
                </button>
                <div className="w-[110px] text-12 text-fg-3">{r.roomType}</div>
                <div className="w-[110px] font-mono text-12 text-fg-3">
                  {dmIso(r.checkIn)} → {dmIso(r.checkOut)}
                </div>
                <div
                  className="w-[80px] text-[11px] font-semibold"
                  style={{ color: RES_STATUS_COLOR[r.status] ?? "var(--fg-2)" }}
                >
                  {RES_STATUS_LABEL[r.status] ?? r.status}
                </div>
                {r.channel && (
                  <div className="w-[90px] text-12 text-fg-3">{r.channel}</div>
                )}
                {assignFailId === r._id ? (
                  <span className="text-12 text-room-ooo">No room free</span>
                ) : (
                  <button
                    disabled={assigningId === r._id}
                    onClick={async () => {
                      setAssigningId(r._id);
                      setAssignFailId(null);
                      const res = await assignOne({ id: r._id as Id<"reservations"> });
                      if (!res.assigned) setAssignFailId(r._id);
                      setAssigningId(null);
                    }}
                    className="rounded-sm border border-line bg-fg-1/[0.06] px-3 py-1.5 text-12 hover:border-line-strong disabled:opacity-40"
                  >
                    {assigningId === r._id ? "Assigning…" : "Auto-assign room"}
                  </button>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

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

      {/* Move confirmation */}
      {pendingMove &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-deepest/70 backdrop-blur-[4px]"
            onClick={() => setPendingMove(null)}
          >
            <div
              className="w-[380px] max-w-[92vw] rounded-lg border border-line bg-elevated p-5 shadow-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-1 font-display text-16 font-bold text-ice">
                Move reservation
              </div>
              <div className="mb-3 text-12 text-fg-3">{pendingMove.guestName}</div>

              <div className="flex flex-col gap-2 rounded-md border border-line bg-deep p-3 text-13">
                <Row2 label="Room">
                  <span className="text-fg-3">
                    {pendingMove.fromLabel} · {pendingMove.fromType}
                  </span>
                  {pendingMove.roomId && (
                    <>
                      <span className="mx-1.5 text-fg-3">→</span>
                      <span className="font-semibold text-ice">
                        {pendingMove.toLabel} · {pendingMove.toType}
                      </span>
                    </>
                  )}
                  {!pendingMove.roomId && (
                    <span className="ml-1.5 text-fg-3">(unchanged)</span>
                  )}
                </Row2>
                <Row2 label="Dates">
                  {pendingMove.fromDates === pendingMove.toDates ? (
                    <span className="text-fg-3">{pendingMove.fromDates} (unchanged)</span>
                  ) : (
                    <>
                      <span className="text-fg-3">{pendingMove.fromDates}</span>
                      <span className="mx-1.5 text-fg-3">→</span>
                      <span className="font-semibold text-ice">{pendingMove.toDates}</span>
                    </>
                  )}
                </Row2>
              </div>

              {pendingMove.typeChanged && (
                <div className="mt-2.5 rounded-md border border-res-tentative bg-elevated px-3 py-2 text-[11.5px] text-fg-2">
                  Room type changes to {pendingMove.toType} — the rate and folio
                  total will be recalculated.
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setPendingMove(null)}
                  className="flex-1 rounded-sm border border-line bg-fg-1/[0.06] py-2 text-12 hover:border-line-strong"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmMove}
                  className="flex-1 rounded-sm bg-accent-violet py-2 text-12 font-semibold text-ice hover:bg-accent-violet-hi"
                >
                  Confirm move
                </button>
              </div>
            </div>
          </div>,
          document.body
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
              {reservationActions(ctxRes.status, ctxRes.checkIn, todayIso).actions.map(
                (a) => (
                  <button
                    key={a.label}
                    onClick={async () => {
                      setCtxMenu(null);
                      await setStatus({
                        id: ctxMenu.resId as Id<"reservations">,
                        status: a.next,
                      });
                      toast(
                        a.tone === "danger"
                          ? `${ctxRes.guestName} — ${a.label.toLowerCase()}`
                          : `${ctxRes.guestName} — ${
                              RES_STATUS_LABEL[a.next] ?? a.next
                            }`,
                        a.tone === "danger" ? "error" : "success"
                      );
                    }}
                    className={`flex items-center gap-2 rounded-sm p-2 text-left text-[12.5px] hover:bg-deep ${
                      a.tone === "danger" ? "text-room-ooo" : "text-fg-1"
                    }`}
                  >
                    {a.tone === "danger" ? (
                      <XCircle className="h-3.5 w-3.5" />
                    ) : (
                      <LogIn className="h-3.5 w-3.5" />
                    )}
                    {a.label}
                  </button>
                )
              )}
              <button
                onClick={() => {
                  setCtxMenu(null);
                  setOpenResId(ctxMenu.resId);
                }}
                className="flex items-center gap-2 rounded-sm p-2 text-left text-[12.5px] text-fg-1 hover:bg-deep"
              >
                <Move className="h-3.5 w-3.5" /> Move reservation
              </button>
            </div>
          </>,
          document.body
        )}

      {/* Room-block popover — release an OOO / OOS room back to sell */}
      {blockMenu &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[70]"
              onClick={() => setBlockMenu(null)}
            />
            <div
              className="fixed z-[71] w-[248px] rounded-md border border-line-strong bg-elevated p-3 shadow-3"
              style={{
                left: Math.min(blockMenu.x, window.innerWidth - 264),
                top: blockMenu.y,
              }}
            >
              <div className="mb-1.5 flex items-center gap-1.5">
                <span
                  className="rounded-[3px] px-1.5 py-0.5 text-[10px] font-bold"
                  style={{
                    color:
                      ROOM_STATUS_COLOR[blockMenu.block.kind] ??
                      "var(--room-ooo)",
                    border: `1px solid ${
                      ROOM_STATUS_COLOR[blockMenu.block.kind] ??
                      "var(--room-ooo)"
                    }`,
                  }}
                >
                  {blockMenu.block.kind}
                </span>
                <span className="font-mono text-12 text-fg-2">
                  Room {blockMenu.roomNumber}
                </span>
              </div>
              <div className="text-12 text-fg-2">{blockMenu.block.reason}</div>
              <div className="mt-1 font-mono text-[11px] text-fg-3">
                {dmIso(blockMenu.block.from)} →{" "}
                {blockMenu.block.to ? dmIso(blockMenu.block.to) : "open"}
              </div>
              {blockMenu.block.ticketId && (
                <div className="mt-1.5 rounded-sm border border-line bg-deep px-2 py-1 text-[10.5px] text-fg-3">
                  Linked to a work order — releasing here won&apos;t close the
                  ticket.
                </div>
              )}
              <button
                disabled={releasing}
                onClick={async () => {
                  setReleasing(true);
                  try {
                    await clearBlock({
                      blockId: blockMenu.block._id as Id<"room_blocks">,
                    });
                    toast(
                      `Room ${blockMenu.roomNumber} released — set to Vacant Dirty for inspection.`,
                      "success"
                    );
                    setBlockMenu(null);
                  } catch (err) {
                    toast(
                      err instanceof Error ? err.message : "Could not release",
                      "error"
                    );
                  } finally {
                    setReleasing(false);
                  }
                }}
                className="mt-2.5 w-full rounded-sm bg-accent-violet px-3 py-2 text-12 font-semibold text-ice hover:bg-accent-violet-hi disabled:opacity-40"
              >
                {releasing ? "Releasing…" : "Release room to sell"}
              </button>
              <div className="mt-1.5 text-[10px] text-fg-4">
                Room goes to Vacant Dirty; housekeeping inspects before it&apos;s
                sellable again.
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Peek — the reservations behind an assigned / unassigned box */}
      {peek &&
        createPortal(
          <>
            <div
              onClick={() => setPeek(null)}
              className="fixed inset-0 z-[55] bg-deepest/70 backdrop-blur-[6px]"
            />
            <div className="fixed left-1/2 top-1/2 z-[56] w-[520px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-deep p-5 shadow-3">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="font-display text-16 font-bold text-ice">
                    {peek.kind === "assigned" ? "Assigned" : "Sold, unassigned"} ·{" "}
                    {peek.roomType}
                  </div>
                  <div className="mt-0.5 text-12 text-fg-3">
                    Night of {dmIso(peek.date)} · {peekList.length} reservation
                    {peekList.length === 1 ? "" : "s"}
                  </div>
                </div>
                <button
                  onClick={() => setPeek(null)}
                  className="text-fg-3 hover:text-ice"
                  aria-label="Close"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>
              <div className="upx-scroll max-h-[52vh] overflow-y-auto rounded-md border border-line">
                {peekList.length === 0 && (
                  <div className="px-3 py-4 text-13 text-fg-3">
                    No matching reservations.
                  </div>
                )}
                {peekList.map((r) => (
                  <button
                    key={r._id}
                    onClick={() => {
                      setOpenResId(r._id);
                      setPeek(null);
                    }}
                    className="flex w-full items-center gap-3 border-b border-line-soft px-3 py-2.5 text-left last:border-0 hover:bg-elevated"
                  >
                    <span
                      className="h-2 w-2 flex-none rounded-pill"
                      style={{
                        background: RES_STATUS_COLOR[r.status] ?? "var(--fg-3)",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-13 font-semibold">
                        {r.guestName}
                      </div>
                      <div className="text-[11px] text-fg-3">
                        {dmIso(r.checkIn)} → {dmIso(r.checkOut)} ·{" "}
                        {r.channel ?? "Direct"}
                      </div>
                    </div>
                    <div className="flex-none text-right">
                      <div className="font-mono text-12">
                        {r.roomNumber && r.roomNumber !== "—"
                          ? `Room ${r.roomNumber}`
                          : "Unassigned"}
                      </div>
                      <div
                        className="text-[10.5px]"
                        style={{
                          color: RES_STATUS_COLOR[r.status] ?? "var(--fg-3)",
                        }}
                      >
                        {RES_STATUS_LABEL[r.status] ?? r.status}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>,
          document.body
        )}

      {/* New reservation modal */}
      {newRes && activeProperty && (
        <NewReservationModal
          init={newRes}
          today={todayIso}
          propertyId={activeProperty._id}
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
  today,
  propertyId,
  rooms,
  roomTypeNames,
  onClose,
  onCreate,
}: {
  init: Partial<NewResInit>;
  today: string;
  propertyId: Id<"properties">;
  rooms: BoardRoom[];
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
    checkIn: init.checkIn ?? today,
    checkOut: init.checkOut ?? iso(addDays(new Date(today + "T00:00:00Z"), 2)),
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

  const validRange = diffDays(f.checkIn, f.checkOut) > 0;

  const quote = useQuery(
    api.revenue.getStayQuote,
    validRange
      ? {
          roomType: f.roomType,
          checkIn: f.checkIn,
          checkOut: f.checkOut,
          propertyId,
        }
      : "skip"
  );
  const available = useQuery(
    api.operate.getAvailability,
    validRange
      ? {
          propertyId,
          checkIn: f.checkIn,
          checkOut: f.checkOut,
          roomType: f.roomType,
        }
      : "skip"
  );

  const roomOptions =
    available ?? rooms.filter((r) => r.type === f.roomType);
  const nights = quote?.nightCount ?? Math.max(1, diffDays(f.checkIn, f.checkOut));
  const estimate = quote?.total ?? 0;

  // Drop a chosen room once it's no longer offered for the picked dates/type.
  useEffect(() => {
    if (f.roomId && !roomOptions.some((r) => r._id === f.roomId)) {
      setF((s) => ({ ...s, roomId: "" }));
    }
  }, [f.roomId, roomOptions]);

  const canSubmit =
    f.guestName.trim() && diffDays(f.checkIn, f.checkOut) > 0 && !busy;

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
            {nights} night{nights === 1 ? "" : "s"} · est.{" "}
            <span className="font-mono font-semibold text-ice">
              {quote ? quote.totalLabel : rp(estimate)}
            </span>{" "}
            <span className="text-fg-4">incl. tax</span>
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

function Row2({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-[46px] flex-none text-[11px] uppercase tracking-wide text-fg-3">
        {label}
      </span>
      <span className="flex-1">{children}</span>
    </div>
  );
}
