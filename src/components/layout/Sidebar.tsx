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
  Check,
  Plus,
  LogOut,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useProperty } from "@/components/providers/PropertyProvider";
import { AddPropertyButton } from "@/components/property/AddPropertyDialog";

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
  /** Desktop-only icon-rail state. Ignored on mobile (drawer is always full). */
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  isOpen,
  setIsOpen,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { properties, activeProperty, setActivePropertyId } = useProperty();
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Active = the single most specific nav href the current path falls under.
  const activeHref = NAV_GROUPS.flatMap((g) => g.items)
    .map((it) => it.href)
    .filter((href) =>
      href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")
    )
    .sort((a, b) => b.length - a.length)[0];

  // These classes only bite at >=lg; on mobile the drawer always shows labels.
  const hideWhenRail = collapsed ? "lg:hidden" : "";

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
          transition-[width,transform] duration-base ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${collapsed ? "lg:w-16 lg:px-2" : "lg:w-56"}
        `}
      >
        {/* Brand + toggles */}
        <div
          className={`flex items-center justify-between ${
            collapsed ? "lg:flex-col lg:gap-2" : ""
          }`}
        >
          <div
            className={`px-2 font-brand text-[17px] font-bold text-ice ${hideWhenRail}`}
          >
            upscale<span className="text-accent-violet-hi">.</span>
          </div>

          {/* mobile: close drawer */}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-fg-3 transition-colors hover:text-ice lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>

          {/* desktop: collapse / expand rail */}
          <button
            onClick={onToggleCollapse}
            className="hidden p-1 text-fg-3 transition-colors hover:text-ice lg:block"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Property switcher */}
        <div className="relative mt-1">
          <button
            type="button"
            title={collapsed ? activeProperty?.name ?? "No property" : undefined}
            onClick={() => {
              if (collapsed) onToggleCollapse();
              else setMenuOpen((o) => !o);
            }}
            className={`flex w-full items-center gap-[9px] rounded-sm border border-line bg-elevated px-[10px] py-[9px] text-left transition-colors hover:border-line-strong ${
              collapsed ? "lg:justify-center lg:border-transparent lg:bg-transparent lg:px-0" : ""
            }`}
          >
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-[6px] bg-accent-violet text-[11px] font-bold text-ice">
              {activeProperty?.initials ?? "—"}
            </span>
            <span className={`flex-1 overflow-hidden ${hideWhenRail}`}>
              <span className="block truncate text-[12.5px] font-semibold text-ice">
                {activeProperty?.name ?? "No property"}
              </span>
              <span className="block text-[10.5px] text-fg-3">
                {activeProperty?.location ?? "Select a property"}
              </span>
            </span>
            <ChevronsUpDown className={`h-3.5 w-3.5 flex-none text-fg-3 ${hideWhenRail}`} />
          </button>

          {menuOpen && !collapsed && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 flex flex-col gap-px rounded-md border border-line-strong bg-elevated p-1.5 shadow-3">
                {properties.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => {
                      setActivePropertyId(p._id);
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-[9px] rounded-sm p-2 text-left transition-colors hover:bg-deep"
                  >
                    <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[6px] border border-line bg-deep text-[10px] font-bold">
                      {p.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-ice">
                        {p.name}
                      </span>
                      <span className="block text-[10.5px] text-fg-3">{p.location}</span>
                    </span>
                    {p.status === "onboarding" && (
                      <span className="flex-none rounded-pill border border-res-tentative px-1.5 text-[9px] font-semibold text-res-tentative">
                        Setup
                      </span>
                    )}
                    {p._id === activeProperty?._id && (
                      <Check className="h-3.5 w-3.5 flex-none text-accent-violet-hi" />
                    )}
                  </button>
                ))}
                <div className="mt-1 border-t border-line pt-1">
                  <AddPropertyButton className="flex w-full items-center gap-[9px] rounded-sm p-2 text-left text-[12.5px] text-fg-2 hover:bg-deep hover:text-ice">
                    <Plus className="h-3.5 w-3.5" /> Add property
                  </AddPropertyButton>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Nav groups */}
        {NAV_GROUPS.map((group, i) => (
          <React.Fragment key={group.label}>
            {i > 0 && (
              <div
                className={`my-2 h-px flex-none bg-line-strong ${
                  collapsed ? "lg:mx-1" : "mx-[10px]"
                }`}
              />
            )}
            <div className="flex flex-col gap-px">
              <div
                className={`px-[10px] pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-eyebrow text-fg-3 ${hideWhenRail}`}
              >
                {group.label}
              </div>
              {group.items.map((item) => {
                const active = item.href === activeHref;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={`
                      flex items-center gap-[10px] rounded-sm px-[10px] py-2 text-[13px] font-medium transition-colors duration-fast ease-out
                      ${collapsed ? "lg:justify-center lg:px-0" : ""}
                      ${
                        active
                          ? "bg-violet-wash text-ice"
                          : "text-fg-2 hover:bg-elevated hover:text-ice"
                      }
                    `}
                  >
                    <item.icon
                      className={`h-[17px] w-[17px] flex-none ${
                        active ? "text-accent-violet-hi" : ""
                      }`}
                    />
                    <span className={hideWhenRail}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </React.Fragment>
        ))}

        {/* User footer */}
        <div
          className={`mt-auto flex items-center gap-[10px] border-t border-line p-[10px] ${
            collapsed ? "lg:flex-col lg:gap-2 lg:px-0" : ""
          }`}
        >
          <span
            title={collapsed ? "Amira K. · Front office" : undefined}
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-pill bg-accent-violet text-[13px] font-semibold text-ice"
          >
            A
          </span>
          <span className={`flex-1 overflow-hidden ${hideWhenRail}`}>
            <span className="block truncate text-[13px] font-medium text-ice">Amira K.</span>
            <span className="block text-[11px] text-fg-3">Front office</span>
          </span>
          <button
            onClick={logout}
            className="p-1 text-fg-3 transition-colors hover:text-ice"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
