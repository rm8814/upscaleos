"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { X } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useProperty } from "@/components/providers/PropertyProvider";

const CURRENCIES = ["IDR", "USD", "SGD", "MYR", "AUD"];
const TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
];

function initialsFrom(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function AddPropertyButton({
  className = "",
  children = "Add property",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && <AddPropertyDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function AddPropertyDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const { setActivePropertyId } = useProperty();
  const createProperty = useMutation(api.properties.create);

  // Portal to <body> — the sidebar (a common trigger) is a transformed
  // ancestor, which would otherwise re-anchor our position:fixed overlay.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [name, setName] = useState("");
  const [initialsTouched, setInitialsTouched] = useState(false);
  const [form, setForm] = useState({
    externalId: "",
    initials: "",
    location: "",
    currency: "IDR",
    timezone: "Asia/Makassar",
    checkInTime: "14:00",
    checkOutTime: "12:00",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onNameChange = (v: string) => {
    setName(v);
    if (!initialsTouched) set("initials", initialsFrom(v));
  };

  const canSubmit =
    name.trim() && form.externalId.trim() && form.location.trim() && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      const id = await createProperty({
        name: name.trim(),
        externalId: form.externalId.trim(),
        initials: form.initials.trim() || initialsFrom(name),
        location: form.location.trim(),
        currency: form.currency,
        timezone: form.timezone,
        checkInTime: form.checkInTime,
        checkOutTime: form.checkOutTime,
        creatorEmail: user.email,
        creatorName: user.name,
      });
      setActivePropertyId(id);
      onClose();
      router.push("/configure");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the property.");
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-deepest/70 backdrop-blur-[6px]"
      />
      <div className="fixed left-1/2 top-1/2 z-[61] w-[480px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-deep p-6 shadow-3">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-display text-18 font-bold text-ice">Add a property</div>
              <div className="mt-0.5 text-12 text-fg-3">
                The essentials — you can finish the rest in Settings.
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-fg-3 hover:text-ice"
              aria-label="Close"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-fg-3">Name</span>
            <input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Grand Samudra Ubud"
              className="rounded-sm border border-line bg-ink px-3 py-2.5 text-13 text-ice outline-none focus:border-accent-violet"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wide text-fg-3">
                External property ID
              </span>
              <input
                value={form.externalId}
                onChange={(e) => set("externalId", e.target.value)}
                placeholder="04813"
                className="rounded-sm border border-line bg-ink px-3 py-2.5 font-mono text-13 text-ice outline-none focus:border-accent-violet"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wide text-fg-3">Initials</span>
              <input
                value={form.initials}
                onChange={(e) => {
                  setInitialsTouched(true);
                  set("initials", e.target.value.toUpperCase().slice(0, 4));
                }}
                placeholder="GSU"
                className="rounded-sm border border-line bg-ink px-3 py-2.5 text-13 text-ice outline-none focus:border-accent-violet"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-fg-3">Location</span>
            <input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Ubud, Bali"
              className="rounded-sm border border-line bg-ink px-3 py-2.5 text-13 text-ice outline-none focus:border-accent-violet"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wide text-fg-3">Currency</span>
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                className="rounded-sm border border-line bg-ink px-3 py-2.5 text-13 text-ice"
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wide text-fg-3">Timezone</span>
              <select
                value={form.timezone}
                onChange={(e) => set("timezone", e.target.value)}
                className="rounded-sm border border-line bg-ink px-3 py-2.5 text-13 text-ice"
              >
                {TIMEZONES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wide text-fg-3">Check-in</span>
              <input
                type="time"
                value={form.checkInTime}
                onChange={(e) => set("checkInTime", e.target.value)}
                className="rounded-sm border border-line bg-ink px-3 py-2.5 font-mono text-13 text-ice outline-none focus:border-accent-violet"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wide text-fg-3">Check-out</span>
              <input
                type="time"
                value={form.checkOutTime}
                onChange={(e) => set("checkOutTime", e.target.value)}
                className="rounded-sm border border-line bg-ink px-3 py-2.5 font-mono text-13 text-ice outline-none focus:border-accent-violet"
              />
            </label>
          </div>

          {error && <div className="text-12 text-room-ooo">{error}</div>}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-line bg-fg-1/[0.06] px-4 py-2.5 text-13 text-fg-1 hover:border-line-strong"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-sm bg-accent-violet px-4 py-2.5 text-13 font-semibold text-ice transition-colors hover:bg-accent-violet-hi disabled:opacity-40"
            >
              {submitting ? "Creating…" : "Create property"}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}
