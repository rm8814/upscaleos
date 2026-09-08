"use client";

import React from "react";
import { Star, ShieldCheck, BadgeCheck, Undo2, Waves, Wifi, Coffee, Dumbbell, Car } from "lucide-react";
import { useProperty } from "@/components/providers/PropertyProvider";
import { useToast } from "@/components/providers/ToastProvider";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

const ROOMS = [
  { name: "Deluxe Twin", blurb: "Garden view · 32m²", ota: "Rp 1,680,000", price: "Rp 1,450,000", left: 3 },
  { name: "Double Queen", blurb: "Pool view · 38m²", ota: "Rp 2,140,000", price: "Rp 1,850,000", left: 5 },
  { name: "King Suite", blurb: "Ocean view · 54m²", ota: "Rp 3,050,000", price: "Rp 2,600,000", left: 1 },
];
const AMENITIES = [
  { icon: Waves, label: "Infinity pool" },
  { icon: Wifi, label: "Fast Wi-Fi" },
  { icon: Coffee, label: "Free breakfast" },
  { icon: Dumbbell, label: "24h gym" },
  { icon: Car, label: "Free parking" },
];
const OFFERS = [
  { title: "Stay 3, pay 2", blurb: "Book three nights midweek and the third is on us — direct only." },
  { title: "Honeymoon package", blurb: "Sparkling wine, late checkout, and a private cliffside dinner." },
];
const NEARBY = [
  ["Seminyak Beach", "400 m"],
  ["Potato Head Beach Club", "1.2 km"],
  ["Ngurah Rai Airport", "9 km"],
  ["Petitenget Temple", "700 m"],
];
const REVIEWS = [
  { quote: "The direct rate was well below Booking.com and breakfast was included. Staff remembered our names by day two.", author: "Marta R. · stayed Aug 2026" },
  { quote: "Cliffside view is unreal. Check-in kiosk took under two minutes.", author: "Devin K. · stayed Jul 2026" },
];
const FAQS = [
  { q: "Is the direct rate really cheaper?", a: "Yes — direct rates run 8–15% below OTAs and always include breakfast and late checkout." },
  { q: "What's the cancellation policy?", a: "Free cancellation up to 48 hours before arrival on all flexible rates." },
  { q: "Do you offer airport transfers?", a: "Yes, add it during checkout for Rp 250,000 one way." },
  { q: "Can I pay with QRIS or GoPay?", a: "All local e-wallets and major cards are accepted at secure checkout." },
];

export default function BookingLandingPage() {
  const { activeProperty } = useProperty();
  const toast = useToast();
  const previewNote = () =>
    toast("This is a preview — the live booking page takes real bookings");
  const businessDate = activeProperty?.businessDate ?? "2026-09-08";

  return (
    <div
      className="mx-auto max-w-[1040px] overflow-hidden rounded-[20px]"
      style={{ background: "#FDFDFB", color: "#14213E", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}
    >
      <div
        className="p-2 text-center text-[12.5px] font-medium text-white"
        style={{ background: "#14213E" }}
      >
        Book direct and save 12% vs. OTAs · ends in 04:12:36
      </div>

      <div
        className="flex items-center gap-6 px-12 py-4"
        style={{ borderBottom: "1px solid #E7E3D8" }}
      >
        <div className="font-brand text-15 font-bold" style={{ color: "#5B3FD9" }}>
          grand samudra<span style={{ color: "#14213E" }}>.</span>
        </div>
        <div className="ml-3 flex gap-5 text-13" style={{ color: "#4C5876" }}>
          <span>Rooms</span>
          <span>Amenities</span>
          <span>Reviews</span>
          <span>FAQ</span>
        </div>
        <button
          onClick={previewNote}
          className="ml-auto rounded-[10px] px-4 py-2 text-13 font-semibold text-white"
          style={{ background: "#5B3FD9" }}
        >
          Book now
        </button>
      </div>

      {/* Hero */}
      <div
        className="px-12 pt-14 text-center"
        style={{ background: "linear-gradient(135deg,#EFE9FF 0%,#E3FBFF 100%)" }}
      >
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {["4.8 · 1,204 reviews", "Best price guarantee", "Free cancellation"].map((b) => (
            <span
              key={b}
              className="flex items-center gap-1.5 rounded-pill bg-white px-2.5 py-1.5 text-[11px] font-semibold"
              style={{ color: "#4C5876", border: "1px solid #E7E3D8" }}
            >
              {b.startsWith("4.8") && (
                <Star className="h-3 w-3" style={{ color: "#E8A93B" }} fill="currentColor" />
              )}
              {b}
            </span>
          ))}
        </div>
        <div className="mb-4 font-brand text-16 font-bold" style={{ color: "#5B3FD9" }}>
          GRAND SAMUDRA BALI
        </div>
        <div className="mx-auto mb-3 max-w-[600px] font-display text-[38px] font-bold tracking-display">
          A cliffside stay, booked without the middleman.
        </div>
        <div className="mx-auto mb-6 max-w-[460px] text-15" style={{ color: "#4C5876" }}>
          Direct rates are always 8–15% below OTAs, with free breakfast and late checkout included.
        </div>
        <div
          className="mx-auto flex max-w-[640px] translate-y-7 gap-2 rounded-[14px] bg-white p-3.5"
          style={{ boxShadow: "0 10px 30px rgba(20,33,62,.12)" }}
        >
          {[
            ["Check-in", fmtDate(businessDate, 4)],
            ["Check-out", fmtDate(businessDate, 7)],
            ["Guests", "2 adults"],
          ].map(([k, v]) => (
            <div key={k} className="flex-1 rounded-[10px] p-2.5 text-left" style={{ background: "#F3F1EC" }}>
              <div className="text-[10px] uppercase" style={{ color: "#8A93AC" }}>
                {k}
              </div>
              <div className="font-mono text-13">{v}</div>
            </div>
          ))}
          <button
            onClick={previewNote}
            className="rounded-[10px] px-5 text-13 font-semibold text-white"
            style={{ background: "#5B3FD9" }}
          >
            Check availability
          </button>
        </div>
      </div>

      {/* Rooms */}
      <div className="px-12 pb-10 pt-14">
        <div className="mb-3.5 text-12 uppercase tracking-wider" style={{ color: "#8A93AC" }}>
          Rooms · direct price beats every OTA
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ROOMS.map((r) => (
            <div
              key={r.name}
              className="relative overflow-hidden rounded-[14px]"
              style={{ border: "1px solid #E7E3D8" }}
            >
              <div
                className="flex h-[120px] items-center justify-center font-mono text-[11px]"
                style={{
                  color: "#B7B0A0",
                  background:
                    "repeating-linear-gradient(45deg,#EDEAE0,#EDEAE0 10px,#F5F3EC 10px,#F5F3EC 20px)",
                }}
              >
                room photo
              </div>
              <span
                className="absolute left-2.5 top-2.5 rounded-pill px-2 py-1 text-[10.5px] font-semibold text-white"
                style={{ background: "#14213E" }}
              >
                {r.left} left today
              </span>
              <div className="p-3.5">
                <div className="text-14 font-semibold">{r.name}</div>
                <div className="text-[11px]" style={{ color: "#8A93AC" }}>
                  {r.blurb}
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span
                    className="font-mono text-12 line-through"
                    style={{ color: "#B0A9C8" }}
                  >
                    {r.ota}
                  </span>
                  <span className="font-mono text-15 font-semibold">{r.price}</span>
                  <span className="text-[10px]" style={{ color: "#8A93AC" }}>
                    / night
                  </span>
                </div>
                <button
                  onClick={previewNote}
                  className="mt-2.5 w-full rounded-[10px] p-2.5 text-13 font-semibold text-white"
                  style={{ background: "#14213E" }}
                >
                  Book now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div className="px-12 pb-10">
        <div className="mb-3.5 text-12 uppercase tracking-wider" style={{ color: "#8A93AC" }}>
          Amenities
        </div>
        <div className="grid grid-cols-3 gap-3.5 sm:grid-cols-5">
          {AMENITIES.map((a) => (
            <div key={a.label} className="flex flex-col items-center gap-2 text-center">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-pill"
                style={{ background: "#F3F1EC" }}
              >
                <a.icon className="h-[19px] w-[19px]" style={{ color: "#5B3FD9" }} />
              </div>
              <div className="text-12" style={{ color: "#4C5876" }}>
                {a.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Offers */}
      <div className="px-12 pb-10">
        <div className="mb-3.5 text-12 uppercase tracking-wider" style={{ color: "#8A93AC" }}>
          Offers &amp; packages
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {OFFERS.map((o) => (
            <div
              key={o.title}
              className="flex items-center justify-between rounded-[14px] p-[18px]"
              style={{ border: "1px solid #E7E3D8", background: "linear-gradient(135deg,#F7F5F0,#fff)" }}
            >
              <div>
                <div className="text-14 font-semibold">{o.title}</div>
                <div className="mt-1 max-w-[280px] text-12" style={{ color: "#6B7590" }}>
                  {o.blurb}
                </div>
              </div>
              <button
                onClick={previewNote}
                className="whitespace-nowrap rounded-[10px] px-3.5 py-2 text-[12.5px] font-semibold text-white"
                style={{ background: "#5B3FD9" }}
              >
                View offer
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="px-12 pb-10">
        <div className="mb-3.5 text-12 uppercase tracking-wider" style={{ color: "#8A93AC" }}>
          Location &amp; nearby
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.3fr_1fr]">
          <div
            className="flex h-[160px] items-center justify-center rounded-[14px] font-mono text-[11px]"
            style={{
              color: "#B7B0A0",
              background:
                "repeating-linear-gradient(45deg,#EDEAE0,#EDEAE0 10px,#F5F3EC 10px,#F5F3EC 20px)",
            }}
          >
            map preview
          </div>
          <div className="flex flex-col justify-center gap-2">
            {NEARBY.map(([n, d]) => (
              <div key={n} className="flex justify-between text-[12.5px]" style={{ color: "#3A455E" }}>
                <span>{n}</span>
                <span style={{ color: "#8A93AC" }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="px-12 pb-10">
        <div className="mb-3.5 text-12 uppercase tracking-wider" style={{ color: "#8A93AC" }}>
          Guest reviews
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {REVIEWS.map((t) => (
            <div key={t.author} className="rounded-[14px] p-[18px]" style={{ background: "#F7F5F0" }}>
              <div className="mb-2 text-13 leading-relaxed" style={{ color: "#3A455E" }}>
                {t.quote}
              </div>
              <div className="text-12" style={{ color: "#8A93AC" }}>
                {t.author}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="px-12 pb-10">
        <div className="mb-3.5 text-12 uppercase tracking-wider" style={{ color: "#8A93AC" }}>
          Frequently asked
        </div>
        {FAQS.map((f) => (
          <div key={f.q} className="py-3.5" style={{ borderBottom: "1px solid #E7E3D8" }}>
            <div className="text-13 font-semibold">{f.q}</div>
            <div className="mt-1 text-[12.5px] leading-relaxed" style={{ color: "#6B7590" }}>
              {f.a}
            </div>
          </div>
        ))}
      </div>

      <div
        className="flex justify-center gap-6 px-12 py-6 text-[11.5px]"
        style={{ borderTop: "1px solid #E7E3D8", color: "#8A93AC" }}
      >
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Secure checkout
        </span>
        <span className="flex items-center gap-1.5">
          <BadgeCheck className="h-3.5 w-3.5" /> Verified reviews
        </span>
        <span className="flex items-center gap-1.5">
          <Undo2 className="h-3.5 w-3.5" /> Free cancellation, 48h
        </span>
      </div>
      <div className="flex items-center justify-between px-12 pb-8 pt-5">
        <div className="text-13" style={{ color: "#6B7590" }}>
          © 2026 PT Arthavara Skala Kriya
        </div>
        <div className="text-13" style={{ color: "#5B3FD9" }}>
          Powered by upscale.
        </div>
      </div>

      <div
        className="sticky bottom-0 flex items-center justify-between bg-white px-12 py-3"
        style={{ borderTop: "1px solid #E7E3D8", boxShadow: "0 -8px 20px rgba(20,33,62,.08)" }}
      >
        <div className="text-13" style={{ color: "#4C5876" }}>
          From{" "}
          <span className="font-mono font-bold" style={{ color: "#14213E" }}>
            Rp 980,000
          </span>{" "}
          / night · free cancellation
        </div>
        <button
          onClick={previewNote}
          className="rounded-[10px] px-5 py-2.5 text-13 font-semibold text-white"
          style={{ background: "#5B3FD9" }}
        >
          Check availability
        </button>
      </div>
    </div>
  );
}
