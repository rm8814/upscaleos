"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

const PROPERTY_ID = "04812";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("gm@grandsamudra.upscale.id");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    await login(email, PROPERTY_ID);
  };

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-ink font-body text-ice">
      <div
        className="pointer-events-none absolute left-1/2 top-[-160px] h-[560px] w-[560px] -translate-x-1/2 rounded-pill opacity-[0.14] blur-[20px]"
        style={{
          background:
            "radial-gradient(circle, var(--accent-violet) 0%, transparent 70%)",
        }}
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex w-[400px] flex-col gap-6 rounded-xl border border-line bg-elevated p-10 shadow-3"
      >
        <div className="font-brand text-[24px] font-bold text-ice">
          upscale<span className="text-accent-violet-hi">.</span>
        </div>

        <div>
          <div className="mb-1.5 font-display text-[22px] font-bold tracking-display">
            Sign in to your property
          </div>
          <div className="text-13 text-fg-3">
            Grand Samudra Bali &middot; Property ID {PROPERTY_ID}
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-fg-3">Work email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-sm border border-line bg-deep px-3 py-2.5 font-body text-14 text-ice outline-none focus:border-accent-violet"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-fg-3">6-digit code</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="• • • • • •"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="rounded-sm border border-line bg-deep px-3 py-2.5 font-mono text-16 tracking-[0.3em] text-ice outline-none placeholder:text-fg-4 focus:border-accent-violet"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-accent-violet px-3 py-3.5 font-body text-14 font-semibold text-ice transition-colors duration-fast ease-out hover:bg-accent-violet-hi disabled:opacity-40"
        >
          {submitting ? "Signing in…" : "Continue"}
        </button>

        <div className="text-center text-12 text-fg-3">
          Protected by property-level 2FA &middot; SOC2-aligned
        </div>
      </form>
    </div>
  );
}
