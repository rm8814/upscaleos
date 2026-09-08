"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

export default function LoginPage() {
  const { authenticate } = useAuth();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("anin@upscale.asia");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await authenticate(email, password, flow, name.trim() || undefined);
    } catch (err) {
      setError(
        err instanceof Error
          ? flow === "signIn"
            ? "Wrong email or password."
            : err.message
          : "Could not sign in."
      );
      setSubmitting(false);
    }
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
            {flow === "signIn" ? "Sign in to UpscaleOS" : "Create your login"}
          </div>
          <div className="text-13 text-fg-3">
            Your account&rsquo;s properties load after sign-in.
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          {flow === "signUp" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wide text-fg-3">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-sm border border-line bg-deep px-3 py-2.5 font-body text-14 text-ice outline-none focus:border-accent-violet"
              />
            </label>
          )}
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
            <span className="text-[11px] uppercase tracking-wide text-fg-3">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-sm border border-line bg-deep px-3 py-2.5 font-body text-14 text-ice outline-none focus:border-accent-violet"
            />
          </label>
        </div>

        {error && <div className="text-12 text-room-ooo">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-accent-violet px-3 py-3.5 font-body text-14 font-semibold text-ice transition-colors duration-fast ease-out hover:bg-accent-violet-hi disabled:opacity-40"
        >
          {submitting
            ? "Working…"
            : flow === "signIn"
              ? "Sign in"
              : "Create login"}
        </button>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setFlow((f) => (f === "signIn" ? "signUp" : "signIn"));
          }}
          className="text-center text-12 text-fg-3 hover:text-ice"
        >
          {flow === "signIn"
            ? "First time here? Create a login for your invited email"
            : "Already have a login? Sign in"}
        </button>
      </form>
    </div>
  );
}
