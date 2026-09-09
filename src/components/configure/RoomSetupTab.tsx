"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, Eyebrow } from "@/components/upx/primitives";
import { useToast } from "@/components/providers/ToastProvider";
import { Plus, X, Trash2 } from "lucide-react";

const money = (n: number) => `Rp ${Math.round(n).toLocaleString("en-US")}`;
const num = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;
const VIEWS = ["Ocean", "Garden", "City", "Pool", "None"];

type Setup = NonNullable<ReturnType<typeof useSetup>>;
function useSetup(propertyId: Id<"properties">) {
  return useQuery(api.roomSetup.listSetup, { propertyId });
}

export default function RoomSetupTab({
  propertyId,
}: {
  propertyId: Id<"properties">;
}) {
  const setup = useSetup(propertyId);
  const toast = useToast();

  const upsertType = useMutation(api.roomSetup.upsertRoomType);
  const setTypeActive = useMutation(api.roomSetup.setRoomTypeActive);
  const upsertRoom = useMutation(api.roomSetup.upsertRoom);
  const bulkAdd = useMutation(api.roomSetup.bulkAddRooms);
  const setRoomActive = useMutation(api.roomSetup.setRoomActive);
  const deleteRoom = useMutation(api.roomSetup.deleteRoom);

  const [typeModal, setTypeModal] = useState<
    | { mode: "new" }
    | { mode: "edit"; t: Setup["types"][number] }
    | null
  >(null);
  const [roomModal, setRoomModal] = useState<
    | { mode: "new" }
    | { mode: "range" }
    | { mode: "edit"; r: Setup["rooms"][number] }
    | null
  >(null);
  const [typeFilter, setTypeFilter] = useState("All");

  const typeNames = useMemo(
    () => (setup?.types ?? []).map((t) => t.name),
    [setup]
  );
  const visibleRooms = (setup?.rooms ?? []).filter(
    (r) => typeFilter === "All" || r.type === typeFilter
  );

  if (!setup) return <div className="text-13 text-fg-3">Loading…</div>;

  return (
    <div className="flex flex-col gap-6">
      {/* ---- Room types ---- */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <Eyebrow>Room types</Eyebrow>
          <button
            onClick={() => setTypeModal({ mode: "new" })}
            className="flex items-center gap-1.5 rounded-sm bg-accent-violet px-3 py-1.5 text-12 font-medium text-ice hover:bg-accent-violet-hi"
          >
            <Plus className="h-3.5 w-3.5" /> New type
          </button>
        </div>
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-[1.4fr_1fr_0.9fr_1fr_0.7fr_0.7fr_0.7fr] border-b border-line px-4 py-2 text-[10.5px] uppercase tracking-[0.06em] text-fg-3">
            <div>Name</div>
            <div>Base rate</div>
            <div>Max occ.</div>
            <div>Bed</div>
            <div>Size</div>
            <div>Rooms</div>
            <div>Status</div>
          </div>
          {setup.types.length === 0 && (
            <div className="px-4 py-4 text-13 text-fg-3">
              No room types yet — add one to price and sell rooms.
            </div>
          )}
          {setup.types.map((t) => (
            <button
              key={t._id}
              onClick={() => setTypeModal({ mode: "edit", t })}
              className="grid w-full grid-cols-[1.4fr_1fr_0.9fr_1fr_0.7fr_0.7fr_0.7fr] items-center border-b border-line-soft px-4 py-2.5 text-left text-13 last:border-0 hover:bg-elevated"
            >
              <div className="font-semibold">{t.name}</div>
              <div className="font-mono">{money(t.baseRate)}</div>
              <div className="font-mono text-fg-2">
                {t.maxAdults}A / {t.maxChildren}C
              </div>
              <div className="text-12 text-fg-2">{t.bedConfig}</div>
              <div className="font-mono text-12 text-fg-3">
                {t.sizeSqm ? `${t.sizeSqm} m²` : "—"}
              </div>
              <div className="font-mono">{t.rooms}</div>
              <div
                className="text-[11.5px]"
                style={{
                  color: t.active ? "var(--accent-cyan)" : "var(--fg-3)",
                }}
              >
                {t.active ? "Active" : "Off"}
              </div>
            </button>
          ))}
        </Card>
      </div>

      {/* ---- Rooms ---- */}
      <div>
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <Eyebrow>Rooms · {setup.rooms.length}</Eyebrow>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-sm border border-line bg-elevated px-2 py-1.5 text-12 text-fg-2"
          >
            {["All", ...typeNames].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setRoomModal({ mode: "range" })}
              className="rounded-sm border border-line px-3 py-1.5 text-12 text-fg-1 hover:border-line-strong"
            >
              Add range
            </button>
            <button
              onClick={() => setRoomModal({ mode: "new" })}
              className="flex items-center gap-1.5 rounded-sm bg-accent-violet px-3 py-1.5 text-12 font-medium text-ice hover:bg-accent-violet-hi"
            >
              <Plus className="h-3.5 w-3.5" /> Add room
            </button>
          </div>
        </div>
        <Card className="overflow-x-auto p-0">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[0.7fr_1.2fr_0.8fr_0.8fr_1fr_1.1fr_0.7fr] border-b border-line px-4 py-2 text-[10.5px] uppercase tracking-[0.06em] text-fg-3">
              <div>Room</div>
              <div>Type</div>
              <div>Floor</div>
              <div>Max occ.</div>
              <div>Bed</div>
              <div>Attributes</div>
              <div>Status</div>
            </div>
            {visibleRooms.map((r) => (
              <button
                key={r._id}
                onClick={() => setRoomModal({ mode: "edit", r })}
                className={`grid w-full grid-cols-[0.7fr_1.2fr_0.8fr_0.8fr_1fr_1.1fr_0.7fr] items-center border-b border-line-soft px-4 py-2.5 text-left text-13 last:border-0 hover:bg-elevated ${
                  r.active ? "" : "opacity-50"
                }`}
              >
                <div className="font-mono font-semibold">{r.roomNumber}</div>
                <div className="text-12">{r.type}</div>
                <div className="text-12 text-fg-3">{r.floor || "—"}</div>
                <div className="font-mono text-12 text-fg-2">
                  {r.maxAdults ?? "—"}A / {r.maxChildren ?? "—"}C
                </div>
                <div className="text-12 text-fg-2">{r.bedConfig || "—"}</div>
                <div className="flex flex-wrap gap-1 text-[10px]">
                  {r.accessible && (
                    <span className="rounded-[3px] border border-info px-1 text-info">
                      ADA
                    </span>
                  )}
                  {r.view !== "None" && (
                    <span className="rounded-[3px] border border-line px-1 text-fg-3">
                      {r.view}
                    </span>
                  )}
                  {r.smoking && (
                    <span className="rounded-[3px] border border-room-ooo px-1 text-room-ooo">
                      Smoking
                    </span>
                  )}
                  {r.connectingRoom && (
                    <span className="rounded-[3px] border border-line px-1 text-fg-3">
                      ↔ {r.connectingRoom}
                    </span>
                  )}
                </div>
                <div
                  className="text-[11.5px]"
                  style={{
                    color: r.active ? "var(--accent-cyan)" : "var(--fg-3)",
                  }}
                >
                  {r.active ? r.status : "Retired"}
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {typeModal && (
        <TypeModal
          propertyId={propertyId}
          init={typeModal.mode === "edit" ? typeModal.t : null}
          onClose={() => setTypeModal(null)}
          onSave={async (payload) => {
            try {
              await upsertType({ propertyId, ...payload });
              toast("Room type saved", "success");
              setTypeModal(null);
            } catch (e) {
              toast(e instanceof Error ? e.message : "Save failed", "error");
            }
          }}
          onToggle={async (id, active) => {
            await setTypeActive({ id, active });
            toast(active ? "Type activated" : "Type off", "success");
            setTypeModal(null);
          }}
        />
      )}

      {roomModal && (
        <RoomModal
          propertyId={propertyId}
          mode={roomModal.mode}
          init={roomModal.mode === "edit" ? roomModal.r : null}
          typeNames={typeNames}
          rooms={setup.rooms}
          onClose={() => setRoomModal(null)}
          onSaveRoom={async (payload) => {
            try {
              await upsertRoom({ propertyId, ...payload });
              toast("Room saved", "success");
              setRoomModal(null);
            } catch (e) {
              toast(e instanceof Error ? e.message : "Save failed", "error");
            }
          }}
          onBulk={async (payload) => {
            try {
              const r = await bulkAdd({ propertyId, ...payload });
              toast(`${r.created} rooms added`, "success");
              setRoomModal(null);
            } catch (e) {
              toast(e instanceof Error ? e.message : "Add failed", "error");
            }
          }}
          onRetire={async (id, active) => {
            await setRoomActive({ roomId: id, active });
            toast(active ? "Room reactivated" : "Room retired", "success");
            setRoomModal(null);
          }}
          onDelete={async (id) => {
            try {
              await deleteRoom({ roomId: id });
              toast("Room deleted", "success");
              setRoomModal(null);
            } catch (e) {
              toast(e instanceof Error ? e.message : "Delete failed", "error");
            }
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------- type modal -------- */

function TypeModal({
  init,
  onClose,
  onSave,
  onToggle,
}: {
  propertyId: Id<"properties">;
  init: Setup["types"][number] | null;
  onClose: () => void;
  onSave: (p: {
    id?: Id<"room_types">;
    name: string;
    baseRate: number;
    maxAdults: number;
    maxChildren: number;
    bedConfig: string;
    sizeSqm?: number;
  }) => Promise<void>;
  onToggle: (id: Id<"room_types">, active: boolean) => Promise<void>;
}) {
  const [f, setF] = useState({
    name: init?.name ?? "",
    baseRate: init ? String(init.baseRate) : "",
    maxAdults: String(init?.maxAdults ?? 2),
    maxChildren: String(init?.maxChildren ?? 1),
    bedConfig: init?.bedConfig ?? "1 king",
    sizeSqm: init?.sizeSqm ? String(init.sizeSqm) : "",
  });
  return (
    <Modal title={init ? `Edit ${init.name}` : "New room type"} onClose={onClose}>
      <Field label="Name">
        <input
          value={f.name}
          onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))}
          className={inputCls}
        />
      </Field>
      <Field label="Base rate (before DOW / season)">
        <input
          value={f.baseRate}
          onChange={(e) => setF((s) => ({ ...s, baseRate: e.target.value }))}
          placeholder="1,850,000"
          className={`${inputCls} font-mono`}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Max adults">
          <input
            type="number"
            value={f.maxAdults}
            onChange={(e) => setF((s) => ({ ...s, maxAdults: e.target.value }))}
            className={`${inputCls} font-mono`}
          />
        </Field>
        <Field label="Max children">
          <input
            type="number"
            value={f.maxChildren}
            onChange={(e) =>
              setF((s) => ({ ...s, maxChildren: e.target.value }))
            }
            className={`${inputCls} font-mono`}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Bed configuration">
          <input
            value={f.bedConfig}
            onChange={(e) => setF((s) => ({ ...s, bedConfig: e.target.value }))}
            className={inputCls}
          />
        </Field>
        <Field label="Size (m²)">
          <input
            value={f.sizeSqm}
            onChange={(e) => setF((s) => ({ ...s, sizeSqm: e.target.value }))}
            className={`${inputCls} font-mono`}
          />
        </Field>
      </div>
      <div className="mt-2 flex gap-2">
        {init && (
          <button
            onClick={() => onToggle(init._id, !init.active)}
            className="rounded-sm border border-line px-3 py-2 text-12 text-fg-1 hover:border-line-strong"
          >
            {init.active ? "Take off sale" : "Activate"}
          </button>
        )}
        <button
          disabled={!f.name.trim() || num(f.baseRate) <= 0}
          onClick={() =>
            onSave({
              id: init?._id,
              name: f.name.trim(),
              baseRate: num(f.baseRate),
              maxAdults: Number(f.maxAdults) || 1,
              maxChildren: Number(f.maxChildren) || 0,
              bedConfig: f.bedConfig.trim(),
              sizeSqm: f.sizeSqm ? Number(f.sizeSqm) : undefined,
            })
          }
          className="ml-auto rounded-sm bg-accent-violet px-4 py-2 text-12 font-semibold text-ice hover:bg-accent-violet-hi disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------- room modal -------- */

function RoomModal({
  mode,
  init,
  typeNames,
  rooms,
  onClose,
  onSaveRoom,
  onBulk,
  onRetire,
  onDelete,
}: {
  propertyId: Id<"properties">;
  mode: "new" | "edit" | "range";
  init: Setup["rooms"][number] | null;
  typeNames: string[];
  rooms: Setup["rooms"];
  onClose: () => void;
  onSaveRoom: (p: {
    id?: Id<"rooms">;
    roomNumber: string;
    type: string;
    floor?: string;
    maxAdults?: number;
    maxChildren?: number;
    bedConfig?: string;
    accessible?: boolean;
    view?: string;
    smoking?: boolean;
    connectingRoomId?: Id<"rooms">;
    notes?: string;
  }) => Promise<void>;
  onBulk: (p: {
    type: string;
    floor: string;
    fromNumber: number;
    toNumber: number;
    pad?: number;
  }) => Promise<void>;
  onRetire: (id: Id<"rooms">, active: boolean) => Promise<void>;
  onDelete: (id: Id<"rooms">) => Promise<void>;
}) {
  const [f, setF] = useState({
    roomNumber: init?.roomNumber ?? "",
    type: init?.type ?? typeNames[0] ?? "",
    floor: init?.floor ?? "",
    maxAdults: init?.maxAdults != null ? String(init.maxAdults) : "",
    maxChildren: init?.maxChildren != null ? String(init.maxChildren) : "",
    bedConfig: init?.bedConfig ?? "",
    accessible: init?.accessible ?? false,
    view: init?.view ?? "None",
    smoking: init?.smoking ?? false,
    connectingRoomId: (init?.connectingRoomId ?? "") as string,
    notes: init?.notes ?? "",
  });
  const [range, setRange] = useState({
    type: typeNames[0] ?? "",
    floor: "",
    from: "",
    to: "",
  });

  if (mode === "range") {
    return (
      <Modal title="Add a range of rooms" onClose={onClose}>
        <Field label="Room type">
          <select
            value={range.type}
            onChange={(e) => setRange((s) => ({ ...s, type: e.target.value }))}
            className={inputCls}
          >
            {typeNames.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Floor label">
          <input
            value={range.floor}
            onChange={(e) => setRange((s) => ({ ...s, floor: e.target.value }))}
            placeholder="Floor 3"
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="From number">
            <input
              value={range.from}
              onChange={(e) => setRange((s) => ({ ...s, from: e.target.value }))}
              placeholder="301"
              className={`${inputCls} font-mono`}
            />
          </Field>
          <Field label="To number">
            <input
              value={range.to}
              onChange={(e) => setRange((s) => ({ ...s, to: e.target.value }))}
              placeholder="310"
              className={`${inputCls} font-mono`}
            />
          </Field>
        </div>
        <button
          disabled={!range.from || !range.to || !range.type}
          onClick={() =>
            onBulk({
              type: range.type,
              floor: range.floor.trim(),
              fromNumber: Number(range.from),
              toNumber: Number(range.to),
              pad: Math.max(range.from.length, range.to.length),
            })
          }
          className="mt-2 rounded-sm bg-accent-violet px-4 py-2 text-12 font-semibold text-ice hover:bg-accent-violet-hi disabled:opacity-40"
        >
          Create rooms
        </button>
      </Modal>
    );
  }

  return (
    <Modal
      title={init ? `Room ${init.roomNumber}` : "New room"}
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Number">
          <input
            value={f.roomNumber}
            onChange={(e) =>
              setF((s) => ({ ...s, roomNumber: e.target.value }))
            }
            className={`${inputCls} font-mono`}
          />
        </Field>
        <Field label="Floor">
          <input
            value={f.floor}
            onChange={(e) => setF((s) => ({ ...s, floor: e.target.value }))}
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="Type">
        <select
          value={f.type}
          onChange={(e) => setF((s) => ({ ...s, type: e.target.value }))}
          className={inputCls}
        >
          {typeNames.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Max adults (blank = type default)">
          <input
            type="number"
            value={f.maxAdults}
            onChange={(e) => setF((s) => ({ ...s, maxAdults: e.target.value }))}
            className={`${inputCls} font-mono`}
          />
        </Field>
        <Field label="Max children">
          <input
            type="number"
            value={f.maxChildren}
            onChange={(e) =>
              setF((s) => ({ ...s, maxChildren: e.target.value }))
            }
            className={`${inputCls} font-mono`}
          />
        </Field>
      </div>
      <Field label="Bed configuration">
        <input
          value={f.bedConfig}
          onChange={(e) => setF((s) => ({ ...s, bedConfig: e.target.value }))}
          className={inputCls}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="View">
          <select
            value={f.view}
            onChange={(e) => setF((s) => ({ ...s, view: e.target.value }))}
            className={inputCls}
          >
            {VIEWS.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Connecting room">
          <select
            value={f.connectingRoomId}
            onChange={(e) =>
              setF((s) => ({ ...s, connectingRoomId: e.target.value }))
            }
            className={inputCls}
          >
            <option value="">None</option>
            {rooms
              .filter((r) => r._id !== init?._id)
              .map((r) => (
                <option key={r._id} value={r._id}>
                  {r.roomNumber}
                </option>
              ))}
          </select>
        </Field>
      </div>
      <div className="flex gap-4 py-1 text-12">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={f.accessible}
            onChange={(e) =>
              setF((s) => ({ ...s, accessible: e.target.checked }))
            }
            className="accent-accent-violet"
          />
          Accessible
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={f.smoking}
            onChange={(e) => setF((s) => ({ ...s, smoking: e.target.checked }))}
            className="accent-accent-violet"
          />
          Smoking
        </label>
      </div>

      <div className="mt-2 flex items-center gap-2">
        {init && (
          <>
            <button
              onClick={() => onRetire(init._id, !init.active)}
              className="rounded-sm border border-line px-3 py-2 text-12 text-fg-1 hover:border-line-strong"
            >
              {init.active ? "Retire" : "Reactivate"}
            </button>
            {!init.hasHistory && (
              <button
                onClick={() => onDelete(init._id)}
                className="flex items-center gap-1 rounded-sm border border-room-ooo px-3 py-2 text-12 text-room-ooo hover:bg-room-ooo/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
          </>
        )}
        <button
          disabled={!f.roomNumber.trim() || !f.type}
          onClick={() =>
            onSaveRoom({
              id: init?._id,
              roomNumber: f.roomNumber.trim(),
              type: f.type,
              floor: f.floor.trim() || undefined,
              maxAdults: f.maxAdults ? Number(f.maxAdults) : undefined,
              maxChildren: f.maxChildren ? Number(f.maxChildren) : undefined,
              bedConfig: f.bedConfig.trim() || undefined,
              accessible: f.accessible,
              view: f.view,
              smoking: f.smoking,
              connectingRoomId: f.connectingRoomId
                ? (f.connectingRoomId as Id<"rooms">)
                : undefined,
              notes: f.notes.trim() || undefined,
            })
          }
          className="ml-auto rounded-sm bg-accent-violet px-4 py-2 text-12 font-semibold text-ice hover:bg-accent-violet-hi disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------- shared ----------- */

const inputCls =
  "w-full rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-ice outline-none focus:border-accent-violet";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-fg-3">{label}</span>
      {children}
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-deepest/70 backdrop-blur-[6px]"
      />
      <div className="upx-scroll fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[440px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 flex-col gap-2.5 overflow-y-auto rounded-lg border border-line bg-deep p-5 shadow-3">
        <div className="mb-1 flex items-center justify-between">
          <div className="font-display text-15 font-bold text-ice">{title}</div>
          <button
            onClick={onClose}
            className="text-fg-3 hover:text-ice"
            aria-label="Close"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
