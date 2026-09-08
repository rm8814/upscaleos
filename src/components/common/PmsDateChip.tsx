"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { useProperty } from "@/components/providers/PropertyProvider";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/**
 * Shows the PMS business date the current screen is anchored to and links to
 * the night audit. When the business date has drifted 2+ days behind the real
 * date it switches to a warning tone.
 */
export default function PmsDateChip({ className = "" }: { className?: string }) {
  const { activeProperty } = useProperty();
  const bizDate = activeProperty?.businessDate ?? "2026-09-08";

  const tz = activeProperty?.timezone ?? "Asia/Makassar";
  let wallToday: string;
  try {
    wallToday = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    wallToday = new Date().toISOString().slice(0, 10);
  }

  const drift = Math.round(
    (Date.parse(wallToday + "T00:00:00Z") - Date.parse(bizDate + "T00:00:00Z")) /
      86400000
  );
  const behind = drift >= 2;

  return (
    <Link
      href="/finance/night-audit"
      title="Anchored to the PMS business date — open the night audit"
      className={`flex items-center gap-1.5 rounded-sm border px-2 py-1 text-12 transition-colors ${
        behind
          ? "border-room-ooo bg-ai-tint text-ice hover:border-room-ooo/70"
          : "border-line bg-elevated text-fg-3 hover:border-line-strong hover:text-fg-1"
      } ${className}`}
    >
      <CalendarClock className="h-3.5 w-3.5 flex-none" />
      <span>
        PMS date · {fmtDate(bizDate)}
        {behind && ` · ${drift} days behind`}
      </span>
    </Link>
  );
}
