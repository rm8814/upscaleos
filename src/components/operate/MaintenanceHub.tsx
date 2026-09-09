"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useProperty } from "@/components/providers/PropertyProvider";
import { useToast } from "@/components/providers/ToastProvider";
import PmsDateChip from "@/components/common/PmsDateChip";
import { X } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";
import { Card, Eyebrow } from "@/components/upx/primitives";

const PRIORITY_COLOR: Record<string, string> = {
  High: "var(--room-ooo)",
  Medium: "var(--warning)",
  Low: "var(--fg-3)",
};
const STATUS_COLOR: Record<string, string> = {
  Open: "var(--accent-cyan)",
  "In progress": "var(--accent-violet-hi)",
  Scheduled: "var(--info)",
  Resolved: "var(--fg-3)",
};
const SLA_COLOR = (sla: string) =>
  sla === "Overdue" ? "var(--room-ooo)" : sla === "Done" ? "var(--fg-3)" : "var(--fg-2)";

const rupiah = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;
const fmtRp = (n: number) => `Rp ${n.toLocaleString("en-US")}`;

export default function MaintenanceHub() {
  const { activeProperty } = useProperty();
  const arg = activeProperty ? { propertyId: activeProperty._id } : "skip";
  const tickets = useQuery(api.operate.getMaintenanceTickets, arg);
  const roomBlocks = useQuery(api.operate.getRoomBlocks, arg);
  const rooms = useQuery(api.operate.getRooms, arg);
  const resolveTicket = useMutation(api.maintenance.resolveTicket);
  const createTicket = useMutation(api.operate.createTicket);
  const clearRoomBlock = useMutation(api.operate.clearRoomBlock);
  const toast = useToast();

  const [priority, setPriority] = useState("All");
  const [status, setStatus] = useState("All");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    location: "",
    priority: "Medium",
    assignee: "Budi (in-house)",
    blockRoomId: "",
  });
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    title: "",
    location: "",
    priority: "Medium",
    assignee: "Budi (in-house)",
    blockRoomId: "",
  };

  const submitTicket = async () => {
    if (!activeProperty || !form.title.trim() || saving) return;
    setSaving(true);
    await createTicket({
      propertyId: activeProperty._id,
      title: form.title,
      location: form.location,
      priority: form.priority,
      assignee: form.assignee,
      blockRoomId: form.blockRoomId
        ? (form.blockRoomId as Doc<"rooms">["_id"])
        : undefined,
    });
    setSaving(false);
    setNewOpen(false);
    setForm(emptyForm);
    toast("Maintenance ticket created", "success");
  };

  const rows = (tickets ?? []).filter((t) => {
    if (priority !== "All" && t.priority !== priority) return false;
    if (status !== "All" && t.status !== status) return false;
    return true;
  });

  const openCount = (tickets ?? []).filter((t) => t.status !== "Resolved").length;
  const oooCount = (tickets ?? []).filter((t) => t.oooLinked).length;
  const spend = (tickets ?? []).reduce((sum, t) => sum + rupiah(t.cost), 0);

  const active = (tickets ?? []).find((t) => t._id === activeId) ?? null;

  const GRID = "grid grid-cols-[0.7fr_1.5fr_0.9fr_0.7fr_1fr_0.9fr_0.8fr_0.9fr] gap-2.5";

  return (
    <div>
      {/* Stat cards */}
      <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="px-3.5 py-3">
          <div className="text-[11px] text-fg-3">Open tickets</div>
          <div className="mt-0.5 font-mono text-18 font-semibold text-ice">
            {tickets ? openCount : "—"}
          </div>
        </Card>
        <Card className="px-3.5 py-3">
          <div className="text-[11px] text-fg-3">Rooms out of order</div>
          <div className="mt-0.5 font-mono text-18 font-semibold text-room-ooo">
            {tickets ? oooCount : "—"}
          </div>
        </Card>
        <Card className="px-3.5 py-3">
          <div className="text-[11px] text-fg-3">Spend this month</div>
          <div className="mt-0.5 font-mono text-18 font-semibold text-ice">
            {tickets ? fmtRp(spend) : "—"}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-sm border border-line bg-elevated px-2.5 py-2 text-[12.5px] text-fg-2"
        >
          <option value="All">All priorities</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-sm border border-line bg-elevated px-2.5 py-2 text-[12.5px] text-fg-2"
        >
          <option value="All">All statuses</option>
          <option>Open</option>
          <option>In progress</option>
          <option>Scheduled</option>
          <option>Resolved</option>
        </select>
        <PmsDateChip className="ml-auto" />
        <button
          onClick={() => setNewOpen(true)}
          className="rounded-sm bg-accent-violet px-3.5 py-2 text-[12.5px] font-medium text-ice transition-colors hover:bg-accent-violet-hi"
        >
          + New ticket
        </button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div
          className={`${GRID} border-b border-line px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3`}
        >
          <div>ID</div>
          <div>Issue</div>
          <div>Location</div>
          <div>Priority</div>
          <div>Assignee</div>
          <div>SLA</div>
          <div>Status</div>
          <div>Created</div>
        </div>
        {!tickets && <div className="px-4 py-4 text-13 text-fg-3">Loading tickets…</div>}
        {tickets && rows.length === 0 && (
          <div className="px-4 py-4 text-13 text-fg-3">No tickets match these filters.</div>
        )}
        {rows.map((t) => (
          <button
            key={t._id}
            onClick={() => setActiveId(t._id)}
            className={`${GRID} w-full items-center border-b border-line-soft px-4 py-3 text-left text-13 transition-colors last:border-0 hover:bg-elevated`}
          >
            <div className="font-mono text-fg-3">{t.ticketCode ?? "—"}</div>
            <div className="flex items-center gap-1.5 font-semibold">
              <span className="truncate">{t.title}</span>
              {t.oooLinked && (
                <span className="flex-none rounded-[3px] border border-room-ooo px-1 text-[9.5px] font-bold text-room-ooo">
                  OOO
                </span>
              )}
            </div>
            <div className="text-12 text-fg-2">{t.location}</div>
            <div
              className="text-[11.5px] font-semibold"
              style={{ color: PRIORITY_COLOR[t.priority] ?? "var(--fg-2)" }}
            >
              {t.priority}
            </div>
            <div className="truncate text-12">{t.assignee}</div>
            <div
              className="font-mono text-[11.5px]"
              style={{ color: SLA_COLOR(t.slaText ?? "") }}
            >
              {t.slaText ?? "—"}
            </div>
            <div
              className="text-[11.5px]"
              style={{ color: STATUS_COLOR[t.status] ?? "var(--fg-2)" }}
            >
              {t.status}
            </div>
            <div className="text-12 text-fg-3">{t.created}</div>
          </button>
        ))}
      </Card>

      {/* Rooms out of order / service */}
      <Card className="mt-3.5 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <Eyebrow>Rooms out of order / service</Eyebrow>
          <span className="font-mono text-[11px] text-fg-3">
            {roomBlocks ? `${roomBlocks.length} active` : "—"}
          </span>
        </div>
        {!roomBlocks && <div className="px-4 py-4 text-13 text-fg-3">Loading blocks…</div>}
        {roomBlocks && roomBlocks.length === 0 && (
          <div className="px-4 py-4 text-13 text-fg-3">
            Every room is sellable — nothing blocked.
          </div>
        )}
        {(roomBlocks ?? []).map((b) => (
          <div
            key={b._id}
            className="grid grid-cols-[0.7fr_0.7fr_1.6fr_1.1fr_0.9fr_0.7fr] items-center gap-2.5 border-b border-line-soft px-4 py-3 text-13 last:border-0"
          >
            <div className="font-mono font-semibold text-ice">{b.roomNumber}</div>
            <div
              className="text-[11px] font-bold"
              style={{ color: b.active ? "var(--room-ooo)" : "var(--fg-3)" }}
            >
              {b.kind}
            </div>
            <div className="truncate text-12 text-fg-2">{b.reason}</div>
            <div className="font-mono text-[11.5px] text-fg-3">
              {b.from} → {b.to || "open"}
            </div>
            <div className="text-[11.5px] text-fg-3">
              {b.ticketId ? "linked ticket" : b.active ? "active" : "future"}
            </div>
            <button
              onClick={async () => {
                await clearRoomBlock({ blockId: b._id });
                toast(`Room ${b.roomNumber} released`, "success");
              }}
              className="justify-self-end rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-fg-1 transition-colors hover:border-line-strong"
            >
              Clear
            </button>
          </div>
        ))}
      </Card>

      {/* Drawer */}
      {active && (
        <>
          <div
            onClick={() => setActiveId(null)}
            className="fixed inset-0 z-20 bg-deepest/70 backdrop-blur-[6px]"
          />
          <div className="upx-scroll fixed right-0 top-0 bottom-0 z-30 flex w-[440px] max-w-[92vw] flex-col gap-4 overflow-y-auto border-l border-line bg-deep p-[22px] shadow-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-17 font-bold text-ice">{active.title}</div>
                <div className="mt-0.5 text-12 text-fg-3">
                  {active.ticketCode} · {active.location}
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

            <div className="grid grid-cols-2 gap-2.5">
              <Card className="p-3">
                <div className="text-[11px] text-fg-3">Assignee / vendor</div>
                <div className="mt-0.5 text-13 font-semibold">{active.assignee}</div>
              </Card>
              <Card className="p-3">
                <div className="text-[11px] text-fg-3">Cost (parts &amp; labor)</div>
                <div className="mt-0.5 font-mono text-13 font-semibold">
                  {fmtRp(rupiah(active.cost))}
                </div>
              </Card>
            </div>

            <div
              className="flex h-[100px] items-center justify-center rounded-md text-[12px] text-fg-3"
              style={{
                background:
                  "repeating-linear-gradient(45deg,var(--bg-elevated),var(--bg-elevated) 10px,var(--bg-deep) 10px,var(--bg-deep) 20px)",
              }}
            >
              Photo attachment
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-[12.5px]">
              <div>
                <div className="text-[11px] text-fg-3">Priority</div>
                <div
                  className="mt-0.5 font-semibold"
                  style={{ color: PRIORITY_COLOR[active.priority] ?? "var(--fg-2)" }}
                >
                  {active.priority}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-fg-3">SLA</div>
                <div className="mt-0.5 font-mono">{active.slaText ?? "—"}</div>
              </div>
              <div>
                <div className="text-[11px] text-fg-3">Status</div>
                <div
                  className="mt-0.5"
                  style={{ color: STATUS_COLOR[active.status] ?? "var(--fg-2)" }}
                >
                  {active.status}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-fg-3">Created</div>
                <div className="mt-0.5 font-mono">{active.created}</div>
              </div>
            </div>

            <div className="mt-auto flex gap-2">
              <button
                onClick={() => setActiveId(null)}
                className="flex-1 rounded-sm border border-line bg-fg-1/[0.06] px-4 py-2.5 text-13 text-fg-1 transition-colors hover:border-line-strong"
              >
                Close
              </button>
              {active.status !== "Resolved" && (
                <button
                  onClick={async () => {
                    await resolveTicket({ id: active._id, notes: "Resolved from hub" });
                    setActiveId(null);
                  }}
                  className="flex-1 rounded-sm bg-accent-violet px-4 py-2.5 text-13 font-semibold text-ice transition-colors hover:bg-accent-violet-hi"
                >
                  Mark resolved
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* New ticket modal */}
      {newOpen && (
        <>
          <div
            onClick={() => setNewOpen(false)}
            className="fixed inset-0 z-40 bg-deepest/70 backdrop-blur-[6px]"
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[420px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-elevated p-5 shadow-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-display text-16 font-bold text-ice">New maintenance ticket</div>
              <button
                onClick={() => setNewOpen(false)}
                className="text-fg-3 hover:text-ice"
                aria-label="Close"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              <input
                autoFocus
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Issue (e.g. AC not cooling)"
                className="rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-ice outline-none focus:border-accent-violet"
              />
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Location (e.g. Room 204)"
                className="rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-ice outline-none focus:border-accent-violet"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  className="rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-fg-2"
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
                <select
                  value={form.assignee}
                  onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
                  className="rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-fg-2"
                >
                  <option>Budi (in-house)</option>
                  <option>PT Sanitasi Jaya</option>
                  <option>PT Kolam Sehat</option>
                </select>
              </div>
              <select
                value={form.blockRoomId}
                onChange={(e) => setForm((f) => ({ ...f, blockRoomId: e.target.value }))}
                className="rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-fg-2"
              >
                <option value="">Don&apos;t block a room</option>
                {(rooms ?? []).map((r) => (
                  <option key={r._id} value={r._id}>
                    Take room {r.roomNumber} ({r.type}) out of order until resolved
                  </option>
                ))}
              </select>
              <button
                onClick={submitTicket}
                disabled={!form.title.trim() || saving}
                className="mt-1 rounded-sm bg-accent-violet px-3 py-2.5 text-13 font-semibold text-ice hover:bg-accent-violet-hi disabled:opacity-40"
              >
                {saving ? "Creating…" : "Create ticket"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
