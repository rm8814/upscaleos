"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useProperty } from "@/components/providers/PropertyProvider";
import { Search, ArrowRight } from "lucide-react";

const PAGES: { label: string; href: string; group: string }[] = [
  { label: "Property overview", href: "/", group: "Operate" },
  { label: "Calendar", href: "/operate/calendar", group: "Operate" },
  { label: "Groups & blocks", href: "/operate/groups", group: "Operate" },
  { label: "Housekeeping", href: "/operate/housekeeping", group: "Operate" },
  { label: "Maintenance", href: "/operate/maintenance", group: "Operate" },
  { label: "Guest database", href: "/guests", group: "Guests" },
  { label: "Reservations", href: "/guests/reservations", group: "Guests" },
  { label: "Corporate rates", href: "/grow/corporate", group: "Grow" },
  { label: "Channel manager", href: "/grow/channels", group: "Grow" },
  { label: "Booking widget", href: "/grow/booking-widget", group: "Grow" },
  { label: "Booking page", href: "/grow/booking-page", group: "Grow" },
  { label: "Rates", href: "/revenue/rates", group: "Revenue" },
  { label: "Rate setup", href: "/revenue/rate-setup", group: "Revenue" },
  { label: "Reports", href: "/revenue/reports", group: "Revenue" },
  { label: "Night audit", href: "/finance/night-audit", group: "Finance" },
  { label: "Cashier", href: "/finance/cashier", group: "Finance" },
  { label: "AR ledger", href: "/finance/ar-ledger", group: "Finance" },
  { label: "Accounts payable", href: "/finance/accounts-payable", group: "Finance" },
  { label: "POS dashboard", href: "/finance/pos", group: "Finance" },
  { label: "Settings", href: "/configure", group: "Configure" },
];

type Item = { label: string; sub: string; href: string };

export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { activeProperty } = useProperty();
  const arg = activeProperty ? { propertyId: activeProperty._id } : "skip";
  const guests = useQuery(api.guests.getGuestsForProperty, open ? arg : "skip");
  const reservations = useQuery(
    api.reservations.getByProperty,
    open ? arg : "skip"
  );

  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const needle = q.trim().toLowerCase();
    const pages: Item[] = PAGES.filter(
      (p) => !needle || p.label.toLowerCase().includes(needle)
    ).map((p) => ({ label: p.label, sub: p.group, href: p.href }));

    if (needle.length < 2) return pages.slice(0, 8);

    const g: Item[] = (guests ?? [])
      .filter(
        (x) =>
          x.name.toLowerCase().includes(needle) ||
          x.email.toLowerCase().includes(needle)
      )
      .slice(0, 5)
      .map((x) => ({
        label: x.name,
        sub: `Guest · ${x.tier}`,
        href: `/guests/${x.guestId}`,
      }));

    const r: Item[] = (reservations ?? [])
      .filter(
        (x) =>
          x.guestName.toLowerCase().includes(needle) ||
          x.roomNumber.includes(needle)
      )
      .slice(0, 5)
      .map((x) => ({
        label: `${x.guestName} — ${x.roomNumber}`,
        sub: `Reservation · ${x.checkIn} → ${x.checkOut}`,
        href: "/guests/reservations",
      }));

    return [...pages.slice(0, 4), ...g, ...r];
  }, [q, guests, reservations]);

  useEffect(() => setActive(0), [q]);

  if (!open) return null;

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-deepest/70 pt-[12vh] backdrop-blur-[4px]"
      onClick={onClose}
    >
      <div
        className="w-[560px] max-w-[92vw] overflow-hidden rounded-lg border border-line bg-elevated shadow-3"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, items.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && items[active]) {
            e.preventDefault();
            go(items[active].href);
          } else if (e.key === "Escape") {
            onClose();
          }
        }}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-3">
          <Search className="h-4 w-4 flex-none text-fg-3" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to a page, guest, or reservation…"
            className="flex-1 bg-transparent text-13 text-ice outline-none placeholder:text-fg-3"
          />
          <kbd className="rounded-[4px] border border-line px-1.5 py-px font-mono text-[10px] text-fg-3">
            Esc
          </kbd>
        </div>
        <div className="upx-scroll max-h-[52vh] overflow-y-auto py-1.5">
          {items.length === 0 && (
            <div className="px-3.5 py-6 text-center text-12 text-fg-3">
              No matches.
            </div>
          )}
          {items.map((it, i) => (
            <button
              key={`${it.href}-${it.label}-${i}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(it.href)}
              className={`flex w-full items-center gap-3 px-3.5 py-2 text-left ${
                i === active ? "bg-violet-wash" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-13 text-ice">{it.label}</div>
                <div className="truncate text-[11px] text-fg-3">{it.sub}</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 flex-none text-fg-3" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
