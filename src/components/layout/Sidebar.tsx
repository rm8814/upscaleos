"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  Users2,
  Wrench,
  Users,
  ClipboardList,
  Handshake,
  Globe,
  MonitorSmartphone,
  LayoutTemplate,
  CalendarRange,
  SlidersHorizontal,
  BarChart3,
  MoonStar,
  Banknote,
  ReceiptText,
  ShoppingCart,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronsUpDown,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useProperty } from "@/components/providers/PropertyProvider";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * The design canvas ships a 6-group nav (Operate / Guests / Grow / Revenue /
 * Finance / Configure). Screen-level items are added as each screen milestone
 * lands; for now each group links to its built route.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operate",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Calendar", href: "/operate/calendar", icon: CalendarDays },
      { label: "Groups & blocks", href: "/operate/groups", icon: Users2 },
      { label: "Housekeeping", href: "/operate/housekeeping", icon: Sparkles },
      { label: "Maintenance", href: "/operate/maintenance", icon: Wrench },
    ],
  },
  {
    label: "Guests",
    items: [
      { label: "Guest database", href: "/guests", icon: Users },
      { label: "Reservations", href: "/guests/reservations", icon: ClipboardList },
    ],
  },
  {
    label: "Grow",
    items: [
      { label: "Corporate rates", href: "/grow/corporate", icon: Handshake },
      { label: "Channel manager", href: "/grow/channels", icon: Globe },
      { label: "Booking widget", href: "/grow/booking-widget", icon: MonitorSmartphone },
      { label: "Booking page", href: "/grow/booking-page", icon: LayoutTemplate },
    ],
  },
  {
    label: "Revenue",
    items: [
      { label: "Rates", href: "/revenue/rates", icon: BarChart3 },
      { label: "Rate setup", href: "/revenue/rate-setup", icon: SlidersHorizontal },
      { label: "Reports", href: "/revenue/reports", icon: CalendarRange },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Night audit", href: "/finance/night-audit", icon: MoonStar },
      { label: "Cashier", href: "/finance/cashier", icon: Banknote },
      { label: "AR ledger", href: "/finance/ar-ledger", icon: ReceiptText },
      { label: "Accounts payable", href: "/finance/accounts-payable", icon: Banknote },
      { label: "POS", href: "/finance/pos", icon: ShoppingCart },
    ],
  },
  {
    label: "Configure",
    items: [{ label: "Settings", href: "/configure", icon: Settings }],
  },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { activeProperty } = useProperty();

  // Active = the single most specific nav href the current path falls under.
  const activeHref = NAV_GROUPS.flatMap((g) => g.items)
    .map((it) => it.href)
    .filter((href) =>
      href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")
    )
    .sort((a, b) => b.length - a.length)[0];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-deepest/70 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`
          upx-scroll fixed top-0 left-0 bottom-0 z-50 flex w-56 flex-col gap-1 overflow-y-auto
          border-r border-line bg-deep p-[18px]
          transition-transform duration-slow ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Brand + collapse */}
        <div className="flex items-center justify-between">
          <div className="px-2 font-brand text-[17px] font-bold text-ice">
            upscale<span className="text-accent-violet-hi">.</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-fg-3 transition-colors hover:text-ice lg:hidden"
            aria-label="Close menu"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
          <span className="hidden p-1 text-fg-4 lg:block">
            <PanelLeftOpen className="h-4 w-4" />
          </span>
        </div>

        {/* Property switcher */}
        <button
          className="mt-1 flex w-full items-center gap-[9px] rounded-sm border border-line bg-elevated px-[10px] py-[9px] text-left transition-colors hover:border-line-strong"
          type="button"
        >
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-[6px] bg-accent-violet text-[11px] font-bold text-ice">
            {activeProperty?.initials ?? "—"}
          </span>
          <span className="flex-1 overflow-hidden">
            <span className="block truncate text-[12.5px] font-semibold text-ice">
              {activeProperty?.name ?? "No property"}
            </span>
            <span className="block text-[10.5px] text-fg-3">
              {activeProperty?.location ?? "Select a property"}
            </span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 flex-none text-fg-3" />
        </button>

        {/* Nav groups */}
        {NAV_GROUPS.map((group, i) => (
          <React.Fragment key={group.label}>
            {i > 0 && <div className="mx-[10px] my-2 h-px flex-none bg-line-strong" />}
            <div className="flex flex-col gap-px">
              <div className="px-[10px] pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-eyebrow text-fg-3">
                {group.label}
              </div>
              {group.items.map((item) => {
                const active = item.href === activeHref;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-center gap-[10px] rounded-sm px-[10px] py-2 text-[13px] font-medium transition-colors duration-fast ease-out
                      ${
                        active
                          ? "bg-violet-wash text-ice"
                          : "text-fg-2 hover:bg-elevated hover:text-ice"
                      }
                    `}
                  >
                    <item.icon
                      className={`h-[17px] w-[17px] ${active ? "text-accent-violet-hi" : ""}`}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </React.Fragment>
        ))}

        {/* User footer */}
        <div className="mt-auto flex items-center gap-[10px] border-t border-line p-[10px]">
          <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-pill bg-accent-violet text-[13px] font-semibold text-ice">
            A
          </span>
          <span className="flex-1 overflow-hidden">
            <span className="block truncate text-[13px] font-medium text-ice">Amira K.</span>
            <span className="block text-[11px] text-fg-3">Front office</span>
          </span>
          <button
            onClick={logout}
            className="p-1 text-fg-3 transition-colors hover:text-ice"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
