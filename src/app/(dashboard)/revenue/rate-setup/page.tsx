"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Card, Eyebrow } from "@/components/upx/primitives";

interface Plan {
  code: string;
  name: string;
  segment: string;
  formula: string;
  status: "Active" | "Archived";
  bookings30d: string;
  revenue30d: string;
  channels: string;
  los: string;
  cta: string;
  ctd: string;
  minAdvance: number;
  cancellation: string;
  deposit: string;
  overrides?: { date: string; rule: string }[];
}

const PLANS: Plan[] = [
  {
    code: "BAR",
    name: "Best Available Rate",
    segment: "Transient",
    formula: "= dynamic base",
    status: "Active",
    bookings30d: "184",
    revenue30d: "Rp 402,900,000",
    channels: "All OTAs · Direct",
    los: "1 / 14 nights",
    cta: "None",
    ctd: "None",
    minAdvance: 0,
    cancellation: "Free cancellation up to 48h before arrival.",
    deposit: "No deposit — card guarantee only.",
    overrides: [
      { date: "24–31 Dec 2026", rule: "Peak surcharge +40%, 3-night min stay" },
      { date: "17 Aug 2026", rule: "Independence Day — CTA on" },
    ],
  },
  {
    code: "ADV21",
    name: "Advance Purchase 21",
    segment: "Transient",
    formula: "= BAR − 18%",
    status: "Active",
    bookings30d: "63",
    revenue30d: "Rp 118,400,000",
    channels: "Direct · Booking.com",
    los: "2 / 10 nights",
    cta: "None",
    ctd: "None",
    minAdvance: 21,
    cancellation: "Non-refundable.",
    deposit: "Full prepayment at booking.",
  },
  {
    code: "GOV",
    name: "Government Rate",
    segment: "Corporate",
    formula: "= flat Rp 1,250,000",
    status: "Active",
    bookings30d: "12",
    revenue30d: "Rp 21,800,000",
    channels: "Direct only",
    los: "1 / 30 nights",
    cta: "None",
    ctd: "None",
    minAdvance: 0,
    cancellation: "Free cancellation up to 24h before arrival.",
    deposit: "No deposit.",
  },
  {
    code: "PKG-HNY",
    name: "Honeymoon Package",
    segment: "Package",
    formula: "= BAR + Rp 900,000",
    status: "Active",
    bookings30d: "9",
    revenue30d: "Rp 41,600,000",
    channels: "Direct only",
    los: "2 / 7 nights",
    cta: "None",
    ctd: "None",
    minAdvance: 3,
    cancellation: "50% refundable up to 7 days before arrival.",
    deposit: "30% deposit at booking.",
  },
  {
    code: "OTA-FLEX",
    name: "OTA Flexible (legacy)",
    segment: "Transient",
    formula: "= BAR + 5%",
    status: "Archived",
    bookings30d: "0",
    revenue30d: "Rp 0",
    channels: "—",
    los: "1 / 14 nights",
    cta: "None",
    ctd: "None",
    minAdvance: 0,
    cancellation: "Free cancellation up to 72h before arrival.",
    deposit: "No deposit.",
  },
];

const PACKAGES = [
  { name: "Romance Escape", code: "PKG-ROM", inclusions: "Sparkling wine on arrival, couples massage, private beach dinner.", price: "1,900,000", unit: "/ stay" },
  { name: "Family Fun", code: "PKG-FAM", inclusions: "Kids stay & eat free, welcome amenity, late checkout.", price: "600,000", unit: "/ night" },
  { name: "Workation", code: "PKG-WRK", inclusions: "Desk upgrade, fast Wi-Fi guarantee, daily laundry.", price: "350,000", unit: "/ night" },
];

const STATUS_COLOR: Record<Plan["status"], string> = {
  Active: "var(--accent-cyan)",
  Archived: "var(--fg-3)",
};

export default function RateSetupPage() {
  const [selectedCode, setSelectedCode] = useState(PLANS[0].code);
  const plan = PLANS.find((p) => p.code === selectedCode)!;

  return (
    <div className="mx-auto max-w-content">
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <Eyebrow>Rate plans</Eyebrow>
        <button className="ml-auto flex items-center gap-1.5 rounded-sm bg-accent-violet px-3.5 py-2 text-12 font-medium text-ice hover:bg-accent-violet-hi">
          <Plus className="h-3.5 w-3.5" /> New rate plan
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-[380px_1fr]">
        <Card className="overflow-hidden p-0">
          {PLANS.map((p) => (
            <button
              key={p.code}
              onClick={() => setSelectedCode(p.code)}
              className={`flex w-full flex-col gap-1.5 border-b border-line-soft p-3.5 text-left last:border-0 transition-colors ${
                p.code === selectedCode ? "bg-violet-wash" : "hover:bg-elevated"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-12 font-semibold">{p.code}</span>
                <span className="min-w-0 flex-1 truncate text-13">{p.name}</span>
                <span
                  className="whitespace-nowrap rounded-pill border px-2 py-0.5 text-[10px] font-semibold"
                  style={{ borderColor: STATUS_COLOR[p.status], color: STATUS_COLOR[p.status] }}
                >
                  {p.status}
                </span>
              </div>
              <div className="pl-1 font-mono text-[11px] text-fg-3">{p.formula}</div>
            </button>
          ))}
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-display text-18 font-bold">{plan.name}</div>
              <div className="mt-0.5 text-12 text-fg-3">
                {plan.code} · {plan.segment} · {plan.formula}
              </div>
            </div>
            <span
              className="rounded-pill border px-2.5 py-1 text-[11px] font-semibold"
              style={{ borderColor: STATUS_COLOR[plan.status], color: STATUS_COLOR[plan.status] }}
            >
              {plan.status}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ["Bookings, 30d", plan.bookings30d],
              ["Revenue, 30d", plan.revenue30d],
              ["Channels", plan.channels],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border border-line-soft bg-deep px-3 py-2.5">
                <div className="text-[10.5px] uppercase tracking-wide text-fg-3">{k}</div>
                <div className="mt-0.5 font-mono text-[13px]">{v}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Eyebrow className="mb-2">Restrictions</Eyebrow>
              <div className="flex flex-col gap-1.5 text-[12.5px]">
                <Row k="Min / max LOS" v={plan.los} mono />
                <Row k="Closed to arrival" v={plan.cta} />
                <Row k="Closed to departure" v={plan.ctd} />
                <Row k="Min advance booking" v={`${plan.minAdvance} days`} mono />
              </div>
            </div>
            <div>
              <Eyebrow className="mb-2">Cancellation &amp; deposit</Eyebrow>
              <div className="flex flex-col gap-1.5 text-[12.5px]">
                <div className="text-fg-1">{plan.cancellation}</div>
                <div className="text-fg-3">{plan.deposit}</div>
              </div>
            </div>
          </div>

          {plan.overrides && (
            <div>
              <Eyebrow className="mb-2">Date overrides</Eyebrow>
              {plan.overrides.map((o) => (
                <div
                  key={o.date}
                  className="flex gap-3 border-t border-line-soft py-2 text-[12.5px]"
                >
                  <div className="w-[130px] flex-none font-mono text-fg-3">{o.date}</div>
                  <div>{o.rule}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Eyebrow className="mb-2.5">Packages &amp; add-ons</Eyebrow>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {PACKAGES.map((pk) => (
          <Card key={pk.code} className="flex flex-col gap-2 p-4">
            <div className="flex items-baseline justify-between">
              <div className="text-14 font-semibold">{pk.name}</div>
              <span className="font-mono text-[11px] text-fg-3">{pk.code}</span>
            </div>
            <div className="text-12 leading-relaxed text-fg-3">{pk.inclusions}</div>
            <div className="mt-auto flex items-baseline gap-1.5 border-t border-line-soft pt-2">
              <span className="font-mono text-15 font-semibold">Rp {pk.price}</span>
              <span className="text-[11px] text-fg-3">{pk.unit}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-fg-3">{k}</span>
      <span className={mono ? "font-mono" : ""}>{v}</span>
    </div>
  );
}
