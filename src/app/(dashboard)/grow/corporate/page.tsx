"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useProperty } from "@/components/providers/PropertyProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Clock, X, Paperclip } from "lucide-react";
import { Card, Eyebrow } from "@/components/upx/primitives";
import PmsDateChip from "@/components/common/PmsDateChip";

const STATUS_COLOR: Record<string, string> = {
  Active: "var(--accent-cyan)",
  "Expiring soon": "var(--res-tentative)",
  Expired: "var(--room-ooo)",
};

const GRID =
  "grid grid-cols-[1.3fr_0.8fr_0.9fr_0.7fr_0.9fr_0.9fr_1fr_1fr_0.8fr] gap-2.5 px-4";

export default function CorporateRatesPage() {
  const { activeProperty } = useProperty();
  const toast = useToast();
  const arg = activeProperty ? { propertyId: activeProperty._id } : "skip";
  const agreements = useQuery(api.revenue.getCorporateAgreements, arg);

  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    let list = agreements ?? [];
    if (statusFilter !== "All") list = list.filter((a) => a.status === statusFilter);
    if (typeFilter !== "All") list = list.filter((a) => a.type === typeFilter);
    return list;
  }, [agreements, statusFilter, typeFilter]);

  // "Today" is the PMS business date, not the wall clock.
  const todayMs = Date.parse(
    (activeProperty?.businessDate ?? "2026-09-08") + "T00:00:00Z"
  );
  const expiring = (agreements ?? []).filter((a) => {
    const end = new Date(a.contractEnd).getTime();
    return end - todayMs < 90 * 86400000 && end > todayMs;
  }).length;

  const open = (agreements ?? []).find((a) => a._id === openId) ?? null;

  return (
    <div className="mx-auto max-w-content">
      {expiring > 0 && (
        <div className="mb-3.5 flex items-center gap-2.5 rounded-lg border border-res-tentative bg-elevated p-3.5">
          <Clock className="h-[15px] w-[15px] flex-none text-res-tentative" />
          <span className="text-[12.5px]">
            {expiring} agreement{expiring > 1 ? "s" : ""} expiring within 90 days — review for
            renewal.
          </span>
        </div>
      )}

      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-sm border border-line bg-elevated px-2.5 py-2 text-[12.5px] text-fg-2"
        >
          <option value="All">All statuses</option>
          <option>Active</option>
          <option>Expired</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-sm border border-line bg-elevated px-2.5 py-2 text-[12.5px] text-fg-2"
        >
          <option value="All">All types</option>
          <option>Corporate</option>
          <option>Travel Agent</option>
        </select>
        <PmsDateChip className="ml-auto" />
        <button
          onClick={() => toast("Agreement creation isn’t wired in this preview")}
          className="rounded-sm bg-accent-violet px-3.5 py-2 text-[12.5px] font-medium text-ice hover:bg-accent-violet-hi"
        >
          + New agreement
        </button>
      </div>

      <Card className="overflow-hidden p-0">
        <div
          className={`${GRID} border-b border-line py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3`}
        >
          <div>Account</div>
          <div>Type</div>
          <div>Rate</div>
          <div>vs. BAR</div>
          <div>Commission</div>
          <div>Room type</div>
          <div>Contract start</div>
          <div>Contract end</div>
          <div>Status</div>
        </div>

        {!agreements && <div className="px-4 py-4 text-13 text-fg-3">Loading agreements…</div>}
        {agreements && rows.length === 0 && (
          <div className="px-4 py-4 text-13 text-fg-3">No agreements match.</div>
        )}

        {rows.map((a) => (
          <button
            key={a._id}
            onClick={() => setOpenId(a._id)}
            className={`${GRID} w-full items-center border-b border-line-soft py-3 text-left text-13 transition-colors last:border-0 hover:bg-elevated`}
          >
            <div className="font-semibold">{a.accountName}</div>
            <div className="text-12 text-fg-3">{a.type}</div>
            <div className="font-mono">{a.rate}</div>
            <div className="font-mono text-12 text-accent-cyan">{a.vsBar}</div>
            <div className="font-mono text-12">{a.commission}</div>
            <div className="text-12">{a.roomType}</div>
            <div className="text-12 text-fg-3">{a.contractStart}</div>
            <div className="text-12 text-fg-3">{a.contractEnd}</div>
            <div
              className="text-[11.5px] font-semibold"
              style={{ color: STATUS_COLOR[a.status] ?? "var(--fg-2)" }}
            >
              {a.status}
            </div>
          </button>
        ))}
      </Card>

      {open && (
        <CorpDrawer agreementId={open._id as Id<"corporate_agreements">} agreement={open} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}

function CorpDrawer({
  agreementId,
  agreement,
  onClose,
}: {
  agreementId: Id<"corporate_agreements">;
  agreement: {
    accountName: string;
    type: string;
    contractStart: string;
    contractEnd: string;
    roomType: string;
    blackoutDates?: string;
  };
  onClose: () => void;
}) {
  const production = useQuery(api.revenue.getAgreementProduction, { agreementId });
  const toast = useToast();
  const pct = production
    ? Math.round((production.roomsBooked / production.roomsContracted) * 100)
    : 0;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-20 bg-deepest/70 backdrop-blur-[6px]" />
      <div className="upx-scroll fixed right-0 top-0 bottom-0 z-30 flex w-[440px] max-w-[92vw] flex-col gap-4 overflow-y-auto border-l border-line bg-deep p-[22px] shadow-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-display text-17 font-bold text-ice">{agreement.accountName}</div>
            <div className="mt-0.5 text-12 text-fg-3">
              {agreement.type} · {agreement.contractStart} – {agreement.contractEnd}
            </div>
          </div>
          <button onClick={onClose} className="text-fg-3 hover:text-ice" aria-label="Close">
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => toast(`Drafted a renewal of the ${agreement.accountName} agreement`, "success")}
            className="flex-1 rounded-sm border border-line bg-fg-1/[0.06] py-2 text-[12.5px] hover:border-line-strong"
          >
            Clone for renewal
          </button>
          <button
            onClick={() => toast("Contract PDF isn’t available in this preview")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-line bg-fg-1/[0.06] py-2 text-[12.5px] hover:border-line-strong"
          >
            <Paperclip className="h-[13px] w-[13px]" /> Contract PDF
          </button>
        </div>

        <div>
          <Eyebrow className="mb-2">Room allocation &amp; blackout</Eyebrow>
          <div className="flex justify-between border-b border-line-soft py-2 text-[12.5px]">
            <span>{agreement.roomType}</span>
            <span className="font-mono">8 rooms/night</span>
          </div>
          <div className="mt-2 text-12 text-fg-3">Blackout: {agreement.blackoutDates ?? "None"}</div>
        </div>

        <div>
          <Eyebrow className="mb-2">Production this contract year</Eyebrow>
          <div className="mb-1.5 flex items-center gap-2.5">
            <span className="h-2 flex-1 overflow-hidden rounded-pill bg-deep">
              <span className="block h-full bg-accent-violet" style={{ width: `${pct}%` }} />
            </span>
            <span className="font-mono text-12">{pct}%</span>
          </div>
          <div className="text-12 text-fg-3">
            {production
              ? `${production.roomsBooked} of ${production.roomsContracted} contracted room-nights used`
              : "Loading…"}
          </div>
        </div>
      </div>
    </>
  );
}
