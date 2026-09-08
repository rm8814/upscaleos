"use client";

import React from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { X, Calendar, MapPin, CreditCard, User, Star } from "lucide-react";
import GuestTimeline from "@/components/guests/GuestTimeline";
import { useToast } from "@/components/providers/ToastProvider";
import { useProperty } from "@/components/providers/PropertyProvider";
import { reservationActions, type ResAction } from "@/lib/resStatus";
import {
  Eyebrow,
  RES_STATUS_COLOR,
  RES_STATUS_LABEL,
  TIER_COLOR,
} from "@/components/upx/primitives";

export interface SlideOverReservation {
  _id: string;
  guestId?: string;
  guestName: string;
  guestTier?: string;
  checkIn: string;
  checkOut: string;
  status: string;
  rate: string;
  totalAmount: string;
  roomNumber?: string;
  roomType?: string;
  channel?: string;
}

const TIMELINE = [
  {
    date: "2026-05-12",
    type: "stay" as const,
    title: "Spring visit",
    description: "3 nights in a King Suite. Requested hypoallergenic pillows.",
    status: "Completed",
  },
  {
    date: "2026-07-20",
    type: "note" as const,
    title: "Preference update",
    description: "Prefers sparkling water in-room on arrival.",
    status: "Active",
  },
  {
    date: "2026-09-06",
    type: "stay" as const,
    title: "Current visit",
    description: "Priority check-in requested for 14:00.",
    status: "In progress",
  },
];

export default function ReservationSlideOver({
  res,
  onClose,
}: {
  res: SlideOverReservation;
  onClose: () => void;
}) {
  const statusColor = RES_STATUS_COLOR[res.status] ?? "var(--fg-2)";
  const setStatus = useMutation(api.reservations.setStatus);
  const toast = useToast();
  const { activeProperty } = useProperty();
  const businessDate = activeProperty?.businessDate ?? "2026-09-08";

  const { actions, note } = reservationActions(
    res.status,
    res.checkIn,
    businessDate
  );

  const folio = useQuery(api.folios.getForReservation, {
    reservationId: res._id as Id<"reservations">,
  });

  const apply = async (a: ResAction) => {
    await setStatus({ id: res._id as Id<"reservations">, status: a.next });
    toast(
      a.label === "Check in"
        ? "Guest checked in"
        : a.label === "Check out"
          ? "Guest checked out"
          : `${a.label} — ${RES_STATUS_LABEL[a.next] ?? a.next}`,
      a.tone === "danger" ? "error" : "success"
    );
    if (a.next === "departed" || a.next === "cancelled") onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-deepest/70 backdrop-blur-[6px]"
      />
      <div className="upx-scroll fixed right-0 top-0 bottom-0 z-50 flex w-[440px] max-w-[92vw] flex-col gap-5 overflow-y-auto border-l border-line bg-deep p-6 shadow-3">
        <div className="flex items-start justify-between">
          <div>
            <Eyebrow>Reservation RSV-{res._id.slice(-6).toUpperCase()}</Eyebrow>
            <div className="mt-1 font-display text-22 font-bold text-ice">
              {res.guestName}
            </div>
            {res.guestTier && (
              <span
                className="mt-1 inline-block rounded-pill border bg-fg-1/[0.06] px-2 py-0.5 text-[11px] font-semibold"
                style={{ borderColor: TIER_COLOR[res.guestTier], color: TIER_COLOR[res.guestTier] }}
              >
                {res.guestTier}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-fg-3 hover:text-ice" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between rounded-md border border-line bg-elevated p-3.5">
          <div className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 rounded-pill"
              style={{ background: statusColor }}
            />
            <div>
              <div className="text-[11px] text-fg-3">Status</div>
              <div className="text-13 font-semibold" style={{ color: statusColor }}>
                {RES_STATUS_LABEL[res.status] ?? res.status}
              </div>
            </div>
          </div>
        </div>

        {/* Stay */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-md border border-line bg-ink p-3.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-fg-3">
              <Calendar className="h-3 w-3" /> Check-in
            </div>
            <div className="font-mono text-13 font-semibold text-ice">{res.checkIn}</div>
          </div>
          <div className="rounded-md border border-line bg-ink p-3.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-fg-3">
              <Calendar className="h-3 w-3" /> Check-out
            </div>
            <div className="font-mono text-13 font-semibold text-ice">{res.checkOut}</div>
          </div>
        </div>

        {/* Room + channel */}
        <div className="rounded-md border border-line bg-elevated">
          <div className="flex items-center justify-between border-b border-line bg-deep/50 px-3.5 py-2.5">
            <Eyebrow>Assignment</Eyebrow>
            {res.guestId && (
              <Link
                href={`/guests/${res.guestId}`}
                className="text-12 font-medium text-accent-violet-hi hover:underline"
              >
                Open guest profile
              </Link>
            )}
          </div>
          <div className="space-y-3 p-3.5">
            <Row icon={<MapPin className="h-4 w-4" />} label="Room">
              <span className="font-mono">
                {res.roomNumber ?? "Unassigned"} · {res.roomType ?? "—"}
              </span>
            </Row>
            <Row icon={<User className="h-4 w-4" />} label="Channel">
              {res.channel ?? "Direct"}
            </Row>
            <Row icon={<Star className="h-4 w-4" />} label="Nightly rate">
              <span className="font-mono">{res.rate}</span>
            </Row>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          <Eyebrow>Interaction history</Eyebrow>
          <GuestTimeline guestId={res.guestId ?? "guest"} events={TIMELINE} />
        </div>

        {/* Billing */}
        <div className="rounded-md border border-line bg-ink p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3 w-3 text-fg-3" />
              <Eyebrow>{folio ? "Folio" : "Billing"}</Eyebrow>
            </div>
            {folio && (
              <span
                className="rounded-pill border px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  borderColor:
                    folio.status === "open"
                      ? "var(--accent-cyan)"
                      : "var(--fg-3)",
                  color:
                    folio.status === "open"
                      ? "var(--accent-cyan)"
                      : "var(--fg-3)",
                }}
              >
                {folio.status === "open" ? "Open" : "Closed"}
              </span>
            )}
          </div>

          {folio ? (
            <>
              <div className="flex max-h-[180px] flex-col gap-1 overflow-y-auto">
                {folio.lines.length === 0 && (
                  <div className="py-1 text-12 text-fg-3">No charges posted yet.</div>
                )}
                {folio.lines.map((l) => (
                  <div
                    key={l._id}
                    className="flex items-baseline justify-between gap-3 text-12"
                  >
                    <span className="min-w-0 flex-1 truncate text-fg-2">
                      {l.description}
                    </span>
                    <span
                      className={`font-mono ${
                        l.raw < 0 ? "text-accent-cyan" : "text-fg-1"
                      }`}
                    >
                      {l.amount}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-13">
                <span className="font-semibold text-ice">Balance</span>
                <span className="font-mono text-16 font-semibold text-accent-cyan">
                  {folio.balance}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between border-t border-line pt-2 text-13">
              <span className="font-semibold text-ice">Total</span>
              <span className="font-mono text-16 font-semibold text-accent-cyan">
                {res.totalAmount}
              </span>
            </div>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2">
          {note && (
            <div className="rounded-md border border-line bg-elevated px-3 py-2 text-[11.5px] text-fg-3">
              {note}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={() => apply(a)}
                className={`flex-1 whitespace-nowrap rounded-md py-3 text-13 font-semibold transition-colors ${
                  a.tone === "primary"
                    ? "bg-accent-violet text-ice hover:bg-accent-violet-hi"
                    : a.tone === "danger"
                      ? "border border-room-ooo text-room-ooo hover:bg-room-ooo/10"
                      : "border border-line bg-fg-1/[0.06] text-fg-1 hover:border-line-strong"
                }`}
              >
                {a.label}
              </button>
            ))}
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-md border border-line bg-fg-1/[0.06] px-4 py-3 text-fg-3 hover:text-ice"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-13">
      <span className="flex items-center gap-2 text-fg-3">
        {icon} {label}
      </span>
      <span className="text-ice">{children}</span>
    </div>
  );
}
