"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Bell, Search, Menu } from "lucide-react";

interface TopBarProps {
  onMenuClick: () => void;
}

const TITLES: Record<string, string> = {
  "/": "Property overview",
  "/operate/calendar": "Calendar",
  "/operate/groups": "Groups & blocks",
  "/operate/housekeeping": "Housekeeping",
  "/operate/maintenance": "Maintenance",
  "/technician": "Technician",
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
  const title =
    TITLES[pathname] ??
    Object.entries(TITLES).find(([href]) => href !== "/" && pathname.startsWith(href))?.[1] ??
    "Upscale OS";

  return (
    <header
      className="flex h-14 flex-none items-center gap-3.5 border-b border-line px-5"
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

      <div className="ml-4 hidden max-w-[360px] flex-1 items-center gap-2 rounded-sm border border-line bg-elevated px-2.5 py-2 text-13 text-fg-3 sm:flex">
        <Search className="h-3.5 w-3.5 flex-none" />
        <span className="truncate">Search reservations, guests, rooms&hellip;</span>
        <kbd className="ml-auto flex-none rounded-[4px] border border-line px-1.5 py-px font-mono text-[11px]">
          &#8984;K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="hidden items-center gap-1.5 text-12 text-fg-3 md:flex">
          <span
            className="h-1.5 w-1.5 rounded-pill bg-accent-cyan text-accent-cyan"
            style={{ animation: "upx-pulse 1.6s infinite cubic-bezier(.2,.8,.2,1)" }}
          />
          All channels synced
        </div>
        <button className="text-fg-2 transition-colors hover:text-ice" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}
