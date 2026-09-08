"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useProperty } from "@/components/providers/PropertyProvider";
import { Bell, Search, Menu } from "lucide-react";
import CommandPalette from "@/components/layout/CommandPalette";

interface TopBarProps {
  onMenuClick: () => void;
}

const TITLES: Record<string, string> = {
  "/": "Property overview",
  "/operate/calendar": "Calendar",
  "/operate/groups": "Groups & blocks",
  "/operate/housekeeping": "Housekeeping",
  "/operate/maintenance": "Maintenance",
  "/guests": "Guest database",
  "/guests/reservations": "Reservations",
  "/grow/corporate": "Corporate rates",
  "/grow/channels": "Channel manager",
  "/grow/booking-widget": "Booking widget",
  "/grow/booking-page": "Booking page",
  "/revenue/rates": "Rates",
  "/revenue/rate-setup": "Rate setup",
  "/revenue/reports": "Reports",
  "/finance/night-audit": "Night audit",
  "/finance/cashier": "Cashier",
  "/finance/ar-ledger": "AR ledger",
  "/finance/accounts-payable": "Accounts payable",
  "/finance/pos": "POS dashboard",
  "/configure": "Settings",
};

export default function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const { activeProperty } = useProperty();
  const stats = useQuery(
    api.operate.getDashboardStats,
    activeProperty ? { propertyId: activeProperty._id } : "skip"
  );

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const title =
    TITLES[pathname] ??
    Object.entries(TITLES).find(([href]) => href !== "/" && pathname.startsWith(href))?.[1] ??
    "Upscale OS";

  const notifications = useMemo(() => {
    if (!stats) return [];
    const bd = activeProperty?.businessDate ?? "2026-09-08";
    const tz = activeProperty?.timezone ?? "Asia/Makassar";
    let wall = bd;
    try {
      wall = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch {
      /* keep bd */
    }
    const drift = Math.round(
      (Date.parse(wall + "T00:00:00Z") - Date.parse(bd + "T00:00:00Z")) / 86400000
    );
    const out: { text: string; href: string }[] = [];
    if (drift >= 2)
      out.push({
        text: `Night audit is ${drift} days behind`,
        href: "/finance/night-audit",
      });
    if (stats.ooo > 0)
      out.push({
        text: `${stats.ooo} room${stats.ooo > 1 ? "s" : ""} out of order`,
        href: "/operate/maintenance",
      });
    if (stats.dirty > 0)
      out.push({
        text: `${stats.dirty} vacant-dirty room${stats.dirty > 1 ? "s" : ""} to clean`,
        href: "/operate/housekeeping",
      });
    if (stats.arrivalsToday > 0)
      out.push({
        text: `${stats.arrivalsToday} arrival${stats.arrivalsToday > 1 ? "s" : ""} expected today`,
        href: "/guests/reservations",
      });
    if (stats.openTickets > 0)
      out.push({
        text: `${stats.openTickets} open maintenance ticket${stats.openTickets > 1 ? "s" : ""}`,
        href: "/operate/maintenance",
      });
    return out;
  }, [stats, activeProperty]);

  return (
    <header
      className="relative flex h-14 flex-none items-center gap-3.5 border-b border-line px-5"
      style={{ backdropFilter: "blur(20px) saturate(140%)" }}
    >
      <button
        onClick={onMenuClick}
        className="-ml-1 p-1.5 text-fg-2 transition-colors hover:text-ice lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="font-display text-16 font-semibold tracking-tight text-ice">{title}</div>

      <button
        onClick={() => setPaletteOpen(true)}
        className="ml-4 hidden max-w-[360px] flex-1 items-center gap-2 rounded-sm border border-line bg-elevated px-2.5 py-2 text-13 text-fg-3 transition-colors hover:border-line-strong sm:flex"
      >
        <Search className="h-3.5 w-3.5 flex-none" />
        <span className="truncate">Search reservations, guests, rooms&hellip;</span>
        <kbd className="ml-auto flex-none rounded-[4px] border border-line px-1.5 py-px font-mono text-[11px]">
          &#8984;K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-4">
        <div className="hidden items-center gap-1.5 text-12 text-fg-3 md:flex">
          <span
            className="h-1.5 w-1.5 rounded-pill bg-accent-cyan text-accent-cyan"
            style={{ animation: "upx-pulse 1.6s infinite cubic-bezier(.2,.8,.2,1)" }}
          />
          All channels synced
        </div>

        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative text-fg-2 transition-colors hover:text-ice"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {notifications.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-pill bg-room-ooo px-1 text-[9px] font-bold text-white">
                {notifications.length}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setNotifOpen(false)}
              />
              <div className="absolute right-0 top-8 z-50 w-[280px] overflow-hidden rounded-md border border-line bg-elevated shadow-3">
                <div className="border-b border-line px-3.5 py-2 text-[11px] uppercase tracking-wide text-fg-3">
                  Notifications
                </div>
                {notifications.length === 0 ? (
                  <div className="px-3.5 py-4 text-12 text-fg-3">All clear.</div>
                ) : (
                  notifications.map((n) => (
                    <Link
                      key={n.text}
                      href={n.href}
                      onClick={() => setNotifOpen(false)}
                      className="block border-b border-line-soft px-3.5 py-2.5 text-[12.5px] text-fg-1 last:border-0 hover:bg-violet-wash"
                    >
                      {n.text}
                    </Link>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}
