"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useProperty } from "@/components/providers/PropertyProvider";
import { ArrowLeft, FileDown, Sparkles, FileText } from "lucide-react";
import {
  Card,
  Eyebrow,
  TIER_COLOR,
  RES_STATUS_LABEL,
  initialsOf,
} from "@/components/upx/primitives";

const CONSENT_LOG = [
  { date: "2026-06", text: "Opted in to email offers", color: "var(--accent-cyan)" },
  { date: "2026-02", text: "Consent captured at check-in kiosk", color: "var(--fg-2)" },
  { date: "2025-11", text: "Unsubscribed from SMS", color: "var(--room-ooo)" },
];
const COMMS = [
  { date: "05 Sep", text: "Called to request early check-in — noted for front desk." },
  { date: "28 Aug", text: "Emailed spa package upsell; opened, no reply." },
  { date: "12 Jul", text: "Left 5★ review mentioning housekeeping by name." },
];
const DOCS = [
  { name: "Passport scan.pdf", date: "12 Jul 2026" },
  { name: "Signed registration card.pdf", date: "12 Jul 2026" },
];

export default function GuestProfilePage() {
  const params = useParams<{ guestId: string }>();
  const { activeProperty } = useProperty();
  const profile = useQuery(
    api.guests.getGuestProfile,
    activeProperty
      ? { guestId: params.guestId, propertyId: activeProperty._id }
      : "skip"
  );

  if (profile === undefined)
    return <div className="p-1 text-13 text-fg-3">Loading profile…</div>;
  if (profile === null)
    return (
      <div className="p-1 text-13 text-fg-3">
        Guest not found.{" "}
        <Link href="/guests" className="text-accent-violet-hi">
          Back to database
        </Link>
      </div>
    );

  const tags = profile.preferences
    ? profile.preferences.split(",").map((s) => s.trim()).filter(Boolean)
    : ["Repeat guest"];

  return (
    <div className="mx-auto max-w-content">
      <div className="mb-4 flex items-center">
        <Link
          href="/guests"
          className="flex items-center gap-1.5 text-12 text-fg-3 hover:text-fg-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Guest database
        </Link>
        <button className="ml-auto flex items-center gap-1.5 rounded-sm border border-line bg-fg-1/[0.06] px-3 py-1.5 text-12 text-fg-1 hover:border-line-strong">
          <FileDown className="h-[13px] w-[13px]" /> Export profile PDF
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* LEFT */}
        <div className="flex flex-col gap-3.5">
          <Card className="flex items-center gap-4 p-5">
            <span className="flex h-14 w-14 flex-none items-center justify-center rounded-pill bg-accent-violet text-20 font-semibold text-ice">
              {initialsOf(profile.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-20 font-bold text-ice">
                {profile.name}
              </div>
              <div className="truncate text-12 text-fg-3">
                {profile.email} · {profile.phone}
              </div>
              <div className="mt-0.5 font-mono text-[10.5px] text-fg-3">{profile.gid}</div>
            </div>
            <span
              className="flex-none rounded-pill border bg-fg-1/[0.06] px-3 py-1 text-[11px] font-semibold"
              style={{ borderColor: TIER_COLOR[profile.tier], color: TIER_COLOR[profile.tier] }}
            >
              {profile.tier}
            </span>
          </Card>

          <div className="flex items-center gap-3 rounded-lg border border-ai-edge bg-ai-tint p-4">
            <Sparkles className="h-[18px] w-[18px] flex-none text-ai-fg" />
            <div className="text-13 text-ice">
              {profile.tier === "Platinum"
                ? "High-value guest — offer a complimentary suite upgrade on the next stay."
                : "Guest books direct and stays midweek — a loyalty-points bonus could lift frequency."}
            </div>
          </div>

          <Card className="p-4">
            <Eyebrow className="mb-2.5">Stay history</Eyebrow>
            {profile.stays.length === 0 && (
              <div className="py-2 text-12 text-fg-3">No stays on record.</div>
            )}
            {profile.stays.map((s) => (
              <div
                key={s._id}
                className="flex justify-between gap-3 border-b border-line-soft py-2.5 text-13 last:border-0"
              >
                <div className="flex-[1.4] font-mono text-[12px]">{s.dates}</div>
                <div className="flex-1 text-fg-3">{s.room}</div>
                <div className="flex-1 text-right font-mono">{s.total}</div>
              </div>
            ))}
            <div className="flex justify-between pt-2.5 text-13 font-semibold">
              <span>Lifetime spend</span>
              <span className="font-mono">{profile.lifetimeSpend}</span>
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <Eyebrow>Communication &amp; notes</Eyebrow>
              <button className="text-12 text-accent-violet-hi">+ Add note</button>
            </div>
            {COMMS.map((c) => (
              <div
                key={c.date}
                className="flex gap-2.5 border-b border-line-soft py-2.5 text-12 text-fg-2 last:border-0"
              >
                <span className="w-[70px] flex-none font-mono text-fg-3">{c.date}</span>
                <span className="flex-1">{c.text}</span>
              </div>
            ))}
          </Card>

          <Card className="p-4">
            <Eyebrow className="mb-2.5">Documents</Eyebrow>
            {DOCS.map((d) => (
              <div
                key={d.name}
                className="flex items-center gap-2.5 border-b border-line-soft py-2 text-[12.5px] last:border-0"
              >
                <FileText className="h-3.5 w-3.5 flex-none text-fg-3" />
                <span className="flex-1">{d.name}</span>
                <span className="text-[11.5px] text-fg-3">{d.date}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-3.5">
          <Card className="p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <Eyebrow>Preferences &amp; tags</Eyebrow>
              <button className="text-12 text-accent-violet-hi">+ Add</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="whitespace-nowrap rounded-pill border border-line bg-deep px-2.5 py-[5px] text-12 text-fg-2"
                >
                  {t}
                </span>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col gap-2 p-4">
            <Eyebrow className="mb-0.5">Loyalty</Eyebrow>
            <div className="flex justify-between text-13">
              <span className="text-fg-3">Points balance</span>
              <span className="font-mono">4,280</span>
            </div>
            <div className="flex justify-between text-13">
              <span className="text-fg-3">ID on file</span>
              <span>Passport · verified</span>
            </div>
          </Card>

          <Card className="p-4">
            <Eyebrow className="mb-2.5">Marketing consent history</Eyebrow>
            {CONSENT_LOG.map((cl) => (
              <div key={cl.date} className="flex gap-2.5 py-1.5 text-12">
                <span className="w-[66px] flex-none font-mono text-fg-3">{cl.date}</span>
                <span className="flex-1" style={{ color: cl.color }}>
                  {cl.text}
                </span>
              </div>
            ))}
          </Card>

          {profile.linkedRes && (
            <Card className="flex flex-col gap-2 p-4">
              <Eyebrow className="mb-0.5">Linked reservation</Eyebrow>
              <div className="text-13 font-semibold">{profile.linkedRes.label}</div>
              <div className="text-12 text-fg-3">{profile.linkedRes.sub}</div>
              <div className="font-mono text-12 text-fg-3">{profile.linkedRes.resId}</div>
              <div className="font-mono text-13">{profile.linkedRes.folio}</div>
              <div className="mt-1.5 flex gap-2">
                <button className="flex-1 rounded-sm border border-line bg-fg-1/[0.06] py-1.5 text-12 hover:border-line-strong">
                  Modify
                </button>
                <button className="flex-1 rounded-sm border border-room-ooo py-1.5 text-12 text-room-ooo">
                  Cancel
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
