"use client";

import React, { useState } from "react";
import { QrCode, Fingerprint, BedDouble, KeyRound, type LucideIcon } from "lucide-react";

interface Step {
  icon: LucideIcon;
  title: string;
  body: string;
  cta: string;
  summary?: boolean;
}

const STEPS: Step[] = [
  {
    icon: QrCode,
    title: "Scan your confirmation",
    body: "Hold the QR code from your booking email up to the reader below, or enter your confirmation number.",
    cta: "Continue",
  },
  {
    icon: Fingerprint,
    title: "Verify your identity",
    body: "Place your passport or national ID face-down on the scanner. We only keep what regulation requires.",
    cta: "Continue",
  },
  {
    icon: BedDouble,
    title: "Confirm your stay",
    body: "Check the details below. Tap continue to accept the registration terms and assign your room.",
    cta: "Confirm & assign room",
    summary: true,
  },
  {
    icon: KeyRound,
    title: "Take your key",
    body: "Your key card is printing now. Room 204 is on the second floor — lifts are to your left.",
    cta: "Done",
  },
];

export default function SelfCheckinKiosk() {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div
      className="flex min-h-screen w-screen items-center justify-center p-6"
      style={{ background: "var(--bg-ink)" }}
    >
      <div
        className="flex min-h-[560px] w-full max-w-[480px] flex-col gap-[18px] rounded-[28px] p-9 text-center"
        style={{
          background: "#FDFDFB",
          color: "#14213E",
          boxShadow: "0 20px 60px rgba(0,0,0,.35)",
        }}
      >
        <div
          className="font-brand text-16 font-bold"
          style={{ color: "#5B3FD9" }}
        >
          upscale. kiosk
        </div>

        <div className="flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="h-2 rounded-pill transition-all"
              style={{
                width: i === step ? 28 : 8,
                background: i <= step ? "#5B3FD9" : "#DAD5EC",
              }}
            />
          ))}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-3.5 py-5">
          <div
            className="flex h-[88px] w-[88px] items-center justify-center rounded-pill"
            style={{ background: "#EFE9FF" }}
          >
            <Icon className="h-[38px] w-[38px]" style={{ color: "#5B3FD9" }} />
          </div>
          <div className="font-display text-22 font-bold">{current.title}</div>
          <div
            className="max-w-[340px] text-14 leading-normal"
            style={{ color: "#5B6B8C" }}
          >
            {current.body}
          </div>

          {current.summary && (
            <div
              className="mt-2 flex w-full flex-col gap-2 rounded-[14px] p-4 text-left"
              style={{ background: "#F3F1EC" }}
            >
              {[
                ["Guest", "Amara Wijaya"],
                ["Room", "204 · Deluxe Twin"],
                ["Nights", "3"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-13">
                  <span style={{ color: "#7A88A6" }}>{k}</span>
                  <span className="font-semibold">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex-1 rounded-[14px] p-4 text-15 font-semibold disabled:opacity-40"
            style={{ background: "#F3F1EC", color: "#14213E" }}
          >
            Back
          </button>
          <button
            onClick={() => setStep((s) => (s + 1) % STEPS.length)}
            className="flex-[2] rounded-[14px] p-4 text-15 font-semibold text-white"
            style={{ background: "#5B3FD9" }}
          >
            {current.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
