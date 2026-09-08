"use client";

import React, { useState } from "react";
import { Star, Tag, BadgeCheck, ChevronDown, Flame, Mail } from "lucide-react";

const PRICE_CAL = [
  { label: "Fri 12", price: "1,200,000", cheapest: false },
  { label: "Sat 13", price: "1,400,000", cheapest: false },
  { label: "Sun 14", price: "980,000", cheapest: true },
  { label: "Mon 15", price: "1,000,000", cheapest: false },
  { label: "Tue 16", price: "1,000,000", cheapest: false },
  { label: "Wed 17", price: "1,100,000", cheapest: false },
  { label: "Thu 18", price: "1,200,000", cheapest: false },
];

const ROOMS = [
  { name: "Deluxe Twin", blurb: "Garden view · 32m²", price: "Rp 1,450,000", left: 3 },
  { name: "Double Queen", blurb: "Pool view · 38m²", price: "Rp 1,850,000", left: 5 },
  { name: "King Suite", blurb: "Ocean view · 54m²", price: "Rp 2,600,000", left: 1 },
];

const ADDONS = [
  { label: "Airport transfer (one way)", price: "Rp 250,000" },
  { label: "Daily breakfast for 2", price: "Rp 180,000" },
  { label: "Late checkout (16:00)", price: "Rp 300,000" },
];

export default function BookingWidgetPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [promo, setPromo] = useState("DIRECT10");

  return (
    <div
      className="mx-auto max-w-[920px] rounded-[20px] p-7"
      style={{ background: "#FDFDFB", color: "#14213E", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}
    >
      <div className="flex items-baseline justify-between">
        <div className="mb-1 font-display text-20 font-bold">Book direct at Grand Samudra Bali</div>
        <div className="flex items-center gap-1.5 text-13" style={{ color: "#5B6B8C" }}>
          <Star className="h-3.5 w-3.5" style={{ color: "#E8A93B" }} fill="currentColor" /> 4.8 · 1,204
          reviews
        </div>
      </div>
      <div className="mb-3.5 text-13" style={{ color: "#5B6B8C" }}>
        Best rate guaranteed · no OTA fees · free cancellation up to 48h
      </div>

      <div className="mb-3 flex gap-2">
        <div
          className="flex flex-1 items-center gap-2 rounded-[12px] px-3.5 py-2.5"
          style={{ background: "#F3F1EC" }}
        >
          <Tag className="h-3.5 w-3.5" style={{ color: "#5B3FD9" }} />
          <span className="text-12" style={{ color: "#5B6B8C" }}>
            Promo / loyalty code
          </span>
          <input
            value={promo}
            onChange={(e) => setPromo(e.target.value)}
            className="flex-1 bg-transparent font-mono text-12 outline-none"
          />
        </div>
        {promo === "DIRECT10" && (
          <span
            className="flex items-center gap-1.5 rounded-[12px] px-3.5 py-2.5 text-12 font-semibold"
            style={{ background: "#E3FBEE", color: "#1F8A56" }}
          >
            <BadgeCheck className="h-[13px] w-[13px]" /> 10% off applied
          </span>
        )}
        <div
          className="flex items-center gap-1.5 rounded-[12px] px-3.5 py-2.5 text-12"
          style={{ background: "#F3F1EC", color: "#5B6B8C" }}
        >
          IDR <ChevronDown className="h-3 w-3" />
        </div>
      </div>

      <div className="mb-3 flex gap-2.5">
        {[
          ["Check-in", "12 Sep 2026"],
          ["Check-out", "15 Sep 2026"],
          ["Rooms · guests", "1 room · 2 adults"],
        ].map(([k, v]) => (
          <div key={k} className="flex-1 rounded-[12px] px-3.5 py-3" style={{ background: "#F3F1EC" }}>
            <div className="text-[11px] uppercase tracking-wide" style={{ color: "#7A88A6" }}>
              {k}
            </div>
            <div className="mt-0.5 font-mono text-14">{v}</div>
          </div>
        ))}
        <button
          className="rounded-[12px] px-6 text-14 font-semibold text-white"
          style={{ background: "var(--accent-violet)" }}
        >
          Search
        </button>
      </div>

      <div className="mb-5 flex gap-1.5 overflow-x-auto">
        {PRICE_CAL.map((d) => (
          <div
            key={d.label}
            className="min-w-[70px] flex-1 rounded-[10px] p-2 text-center"
            style={{
              background: d.cheapest ? "#E3FBEE" : "#F7F5F0",
              border: `1px solid ${d.cheapest ? "#1F8A56" : "#E7E3D8"}`,
            }}
          >
            <div className="text-[10px]" style={{ color: "#8A93AC" }}>
              {d.label}
            </div>
            <div
              className="mt-0.5 font-mono text-12 font-semibold"
              style={{ color: d.cheapest ? "#1F8A56" : "#14213E" }}
            >
              {d.price}
            </div>
            {d.cheapest && (
              <div className="mt-px text-[8.5px] font-semibold" style={{ color: "#1F8A56" }}>
                lowest
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-12 uppercase tracking-wide" style={{ color: "#8A93AC" }}>
          Choose your room
        </div>
        <div className="flex items-center gap-1.5 text-[11.5px]" style={{ color: "#B34A3C" }}>
          <Flame className="h-3 w-3" /> 14 people viewing this hotel now
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ROOMS.map((r) => (
          <div
            key={r.name}
            className="relative flex flex-col overflow-hidden rounded-[14px]"
            style={{ border: "1px solid #E7E3D8" }}
          >
            <div
              className="flex h-[90px] items-center justify-center font-mono text-[11px]"
              style={{
                color: "#B7B0A0",
                background:
                  "repeating-linear-gradient(45deg,#EDEAE0,#EDEAE0 10px,#F5F3EC 10px,#F5F3EC 20px)",
              }}
            >
              room photo
            </div>
            <span
              className="absolute left-2 top-2 rounded-pill px-2 py-0.5 text-[10px] font-semibold text-white"
              style={{ background: "#14213E" }}
            >
              {r.left} left today
            </span>
            <div className="flex flex-col gap-1.5 p-3">
              <div className="text-13 font-semibold">{r.name}</div>
              <div className="text-[11px]" style={{ color: "#8A93AC" }}>
                {r.blurb}
              </div>
              <div className="font-mono text-14 font-semibold">{r.price}</div>
              <button
                onClick={() => setSelected(r.name)}
                className="mt-1 rounded-[10px] p-2 text-13 font-medium text-white"
                style={{ background: selected === r.name ? "#1F8A56" : "#5B3FD9" }}
              >
                {selected === r.name ? "Selected" : "Select room"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="mt-4 rounded-[14px] p-4" style={{ border: "1px solid #E7E3D8" }}>
          <div className="mb-2.5 text-12 uppercase tracking-wide" style={{ color: "#8A93AC" }}>
            Add to your stay
          </div>
          {ADDONS.map((a) => (
            <label
              key={a.label}
              className="flex items-center gap-2.5 py-2 text-13"
              style={{ borderBottom: "1px solid #F0EDE4" }}
            >
              <input type="checkbox" />
              <span className="flex-1">{a.label}</span>
              <span className="font-mono text-[12.5px]" style={{ color: "#5B6B8C" }}>
                +{a.price}
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-12" style={{ color: "#8A93AC" }}>
        <button
          className="flex items-center gap-1.5 text-[12.5px] font-semibold"
          style={{ color: "#5B3FD9" }}
        >
          <Mail className="h-[13px] w-[13px]" /> Email me this quote
        </button>
        <span>Secure checkout · Visa, Mastercard, QRIS, GoPay</span>
      </div>

      {selected && (
        <div
          className="sticky bottom-4 mt-4 flex items-center justify-between rounded-[14px] px-5 py-3.5 text-white"
          style={{ background: "#14213E", boxShadow: "0 12px 30px rgba(0,0,0,.4)" }}
        >
          <div className="text-13">
            {selected} ·{" "}
            <span className="font-mono font-semibold">
              {ROOMS.find((r) => r.name === selected)?.price}
            </span>{" "}
            total
          </div>
          <button
            className="rounded-[10px] px-5 py-2.5 text-13 font-semibold text-white"
            style={{ background: "#5B3FD9" }}
          >
            Continue to checkout
          </button>
        </div>
      )}
    </div>
  );
}
