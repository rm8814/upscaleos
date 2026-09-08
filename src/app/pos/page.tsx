"use client";

import React, { useMemo, useState } from "react";
import { Printer, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

const CATS = ["Mains", "Small plates", "Drinks", "Desserts"] as const;
type Cat = (typeof CATS)[number];

const MENU: Record<Cat, { name: string; price: number }[]> = {
  Mains: [
    { name: "Nasi Goreng Samudra", price: 70_000 },
    { name: "Grilled snapper", price: 180_000 },
    { name: "Beef rendang", price: 145_000 },
    { name: "Vegetable curry", price: 95_000 },
  ],
  "Small plates": [
    { name: "Lumpia (4 pc)", price: 45_000 },
    { name: "Satay ayam (5 pc)", price: 60_000 },
    { name: "Gado-gado", price: 55_000 },
    { name: "Prawn crackers", price: 25_000 },
  ],
  Drinks: [
    { name: "Fresh coconut", price: 30_000 },
    { name: "Es teh manis", price: 20_000 },
    { name: "Bintang (bottle)", price: 55_000 },
    { name: "Espresso", price: 35_000 },
  ],
  Desserts: [
    { name: "Pisang goreng", price: 40_000 },
    { name: "Black rice pudding", price: 45_000 },
    { name: "Coconut ice cream", price: 38_000 },
  ],
};

const fmt = (n: number) => `Rp ${n.toLocaleString("en-US")}`;

export default function GuestPosPage() {
  const toast = useToast();
  const [cat, setCat] = useState<Cat>("Mains");
  const [cart, setCart] = useState<Record<string, { price: number; qty: number }>>({});
  const [sent, setSent] = useState(false);

  const add = (name: string, price: number) => {
    setSent(false);
    setCart((c) => ({
      ...c,
      [name]: { price, qty: (c[name]?.qty ?? 0) + 1 },
    }));
  };

  const total = useMemo(
    () => Object.values(cart).reduce((s, i) => s + i.price * i.qty, 0),
    [cart]
  );
  const items = Object.entries(cart);

  return (
    <div
      className="flex min-h-screen w-screen items-start justify-center p-6"
      style={{ background: "var(--bg-ink)" }}
    >
      <div
        className="w-full max-w-[960px] overflow-hidden rounded-[20px]"
        style={{ background: "#FDFDFB", color: "#14213E", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}
      >
        <div
          className="flex items-center gap-3 px-5 py-3.5"
          style={{ background: "#F7F5F0", borderBottom: "1px solid #E7E3D8" }}
        >
          <div className="font-brand text-15 font-bold" style={{ color: "#5B3FD9" }}>
            Ombak Restaurant
          </div>
          <span
            className="flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11.5px] font-semibold"
            style={{ background: "#E3FBEE", color: "#1F8A56" }}
          >
            <span className="h-1.5 w-1.5 rounded-pill bg-current" /> Shift open
          </span>
          <button
            onClick={() => toast("Last receipt sent to the printer")}
            className="ml-auto flex items-center gap-1.5 rounded-[8px] bg-white px-3 py-1.5 text-[11.5px]"
            style={{ border: "1px solid #D8D2C4" }}
          >
            <Printer className="h-[13px] w-[13px]" /> Reprint receipt
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr]">
          {/* Menu */}
          <div className="flex flex-col gap-3.5 p-5">
            <div className="flex flex-wrap gap-2">
              {CATS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className="rounded-pill px-3 py-1.5 text-12 font-medium"
                  style={{
                    background: cat === c ? "#5B3FD9" : "#F3F1EC",
                    color: cat === c ? "#fff" : "#5B6B8C",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MENU[cat].map((m) => (
                <div
                  key={m.name}
                  className="flex flex-col overflow-hidden rounded-[14px]"
                  style={{ border: "1px solid #E7E3D8" }}
                >
                  <div
                    className="flex h-[74px] items-center justify-center font-mono text-[10px]"
                    style={{
                      color: "#B7B0A0",
                      background:
                        "repeating-linear-gradient(45deg,#EDEAE0,#EDEAE0 10px,#F5F3EC 10px,#F5F3EC 20px)",
                    }}
                  >
                    dish photo
                  </div>
                  <div className="flex flex-col gap-1.5 p-2.5">
                    <div className="text-13 font-semibold">{m.name}</div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-13">{fmt(m.price)}</span>
                      <button
                        onClick={() => add(m.name, m.price)}
                        className="h-[26px] w-[26px] rounded-[8px] text-15 leading-none text-white"
                        style={{ background: "#5B3FD9" }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div
            className="flex flex-col gap-3 p-5"
            style={{ background: "#F7F5F0", borderLeft: "1px solid #E7E3D8" }}
          >
            <div className="text-14 font-semibold">Table 12 · 2 guests</div>
            {items.length === 0 && (
              <div className="text-13" style={{ color: "#7A88A6" }}>
                No items yet — tap + to add.
              </div>
            )}
            {items.map(([name, i]) => (
              <div key={name} className="flex justify-between text-13">
                <span>
                  {i.qty}× {name}
                </span>
                <span className="font-mono">{fmt(i.price * i.qty)}</span>
              </div>
            ))}

            <textarea
              placeholder="Order notes (e.g. no peanuts, extra spicy)"
              className="h-11 resize-none rounded-[8px] bg-white px-2.5 py-2 text-12"
              style={{ border: "1px solid #E7E3D8" }}
            />

            <div className="flex gap-2">
              <button
                onClick={() => toast("Discount / comp applied to the bill")}
                className="flex-1 rounded-[8px] bg-white p-2 text-12"
                style={{ border: "1px solid #E7E3D8" }}
              >
                Discount / comp
              </button>
              <button
                onClick={() => toast("Split-bill isn’t wired in this preview")}
                className="flex-1 rounded-[8px] bg-white p-2 text-12"
                style={{ border: "1px solid #E7E3D8" }}
              >
                Split bill
              </button>
            </div>

            <div
              className="mt-auto flex justify-between pt-2.5 text-14 font-semibold"
              style={{ borderTop: "1px solid #E7E3D8" }}
            >
              <span>Total</span>
              <span className="font-mono">{fmt(total)}</span>
            </div>

            <select
              className="rounded-[8px] bg-white p-2.5 text-[12.5px]"
              style={{ border: "1px solid #E7E3D8" }}
            >
              <option>Charge to room</option>
              <option>Cash</option>
              <option>Card</option>
              <option>QRIS / e-wallet</option>
            </select>

            <button
              onClick={() => items.length && setSent(true)}
              className="rounded-[12px] p-3.5 text-14 font-semibold text-white"
              style={{ background: "#14213E" }}
            >
              Send order
            </button>

            {sent && (
              <div
                className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-2 text-12"
                style={{ background: "#E3FBEE", color: "#1F8A56" }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Sent to kitchen printer · ticket #4471
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
