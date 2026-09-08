"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useProperty } from "@/components/providers/PropertyProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { downloadCsv } from "@/lib/csv";
import { Card, Eyebrow, GhostButton, TIER_COLOR, initialsOf } from "@/components/upx/primitives";

type Segment = "All" | "Platinum" | "Repeat guests" | "Marketing opt-in";

const GRID =
  "grid grid-cols-[1.8fr_0.8fr_0.9fr_0.6fr_0.9fr_1fr_0.9fr] gap-2.5 px-4";

export default function GuestDatabasePage() {
  const { activeProperty } = useProperty();
  const toast = useToast();
  const guests = useQuery(
    api.guests.getGuestsForProperty,
    activeProperty ? { propertyId: activeProperty._id } : "skip"
  );

  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("All tiers");
  const [segment, setSegment] = useState<Segment>("All");

  const rows = useMemo(() => {
    let list = guests ?? [];
    if (search)
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(search.toLowerCase()) ||
          g.email.toLowerCase().includes(search.toLowerCase())
      );
    if (tier !== "All tiers") list = list.filter((g) => g.tier === tier);
    if (segment === "Platinum") list = list.filter((g) => g.tier === "Platinum");
    if (segment === "Repeat guests") list = list.filter((g) => g.stays > 1);
    if (segment === "Marketing opt-in") list = list.filter((g) => !g.marketingOptOut);
    return list;
  }, [guests, search, tier, segment]);

  return (
    <div className="mx-auto max-w-content">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search guests…"
          className="w-[200px] rounded-sm border border-line bg-elevated px-2.5 py-2 text-12 text-ice outline-none focus:border-accent-violet"
        />
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="rounded-sm border border-line bg-elevated px-2.5 py-2 text-12 text-fg-2"
        >
          {["All tiers", "Platinum", "Gold", "Silver"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <GhostButton
            onClick={() => toast("CSV import isn’t available in this preview")}
          >
            Import CSV
          </GhostButton>
          <GhostButton
            onClick={() =>
              downloadCsv(
                "guests.csv",
                rows.map((g) => ({
                  name: g.name,
                  email: g.email,
                  phone: g.phone,
                  tier: g.tier,
                  source: g.source,
                  stays: g.stays,
                  lastStay: g.lastStay,
                  lifetimeValue: g.ltv,
                  marketing: g.marketingOptOut ? "Opted out" : "Subscribed",
                }))
              )
            }
          >
            Export CSV
          </GhostButton>
        </div>
      </div>

      {/* Segments */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        {(["All", "Platinum", "Repeat guests", "Marketing opt-in"] as Segment[]).map((s) => (
          <button
            key={s}
            onClick={() => setSegment(s)}
            className={`rounded-pill border px-3 py-1.5 text-12 transition-colors duration-fast ${
              segment === s
                ? "border-accent-violet bg-violet-wash text-ice"
                : "border-line bg-elevated text-fg-2 hover:border-line-strong"
            }`}
          >
            {s}
          </button>
        ))}
        <span className="ml-auto text-12 text-fg-3">{rows.length} guests</span>
      </div>

      <Card className="overflow-hidden p-0">
        <div
          className={`${GRID} border-b border-line py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3`}
        >
          <div>Guest</div>
          <div>Tier</div>
          <div>Source</div>
          <div>Stays</div>
          <div>Last stay</div>
          <div>Lifetime value</div>
          <div>Marketing</div>
        </div>

        {!guests && <div className="px-4 py-4 text-13 text-fg-3">Loading guests…</div>}
        {guests && rows.length === 0 && (
          <div className="px-4 py-4 text-13 text-fg-3">No guests match these filters.</div>
        )}

        {rows.map((g) => (
          <Link
            key={g.guestId}
            href={`/guests/${g.guestId}`}
            className={`${GRID} items-center border-b border-line-soft py-3 text-13 transition-colors last:border-0 hover:bg-elevated`}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-pill bg-deep text-[11px] font-semibold">
                {initialsOf(g.name)}
              </span>
              <span className="truncate">{g.name}</span>
            </div>
            <div>
              <span
                className="rounded-pill border bg-fg-1/[0.06] px-2.5 py-[3px] text-[11px] font-medium"
                style={{ borderColor: TIER_COLOR[g.tier], color: TIER_COLOR[g.tier] }}
              >
                {g.tier}
              </span>
            </div>
            <div className="text-12 text-fg-3">{g.source}</div>
            <div className="font-mono text-fg-2">{g.stays}</div>
            <div className="font-mono text-fg-3">{g.lastStay}</div>
            <div className="font-mono font-semibold text-ice">{g.ltv}</div>
            <div
              className="text-[11px]"
              style={{ color: g.marketingOptOut ? "var(--room-ooo)" : "var(--accent-cyan)" }}
            >
              {g.marketingOptOut ? "Opted out" : "Subscribed"}
            </div>
          </Link>
        ))}
      </Card>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() =>
            toast("Logged a GDPR data request — the DPO team follows up within 30 days")
          }
          className="text-[11.5px] text-fg-3 hover:text-fg-1"
        >
          Data controls: request export or deletion (GDPR)
        </button>
      </div>
    </div>
  );
}
