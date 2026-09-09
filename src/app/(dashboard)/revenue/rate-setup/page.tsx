"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, Eyebrow } from "@/components/upx/primitives";
import { useProperty } from "@/components/providers/PropertyProvider";
import { useToast } from "@/components/providers/ToastProvider";

const KIND_LABEL: Record<string, string> = {
  bar: "Best available",
  corporate: "Corporate",
  package: "Package",
  promo: "Promotion",
};
const PRICING_LABEL: Record<string, string> = {
  engine: "= dynamic engine rate",
  flat: "= flat nightly amount",
  percent_off: "= engine − %",
  amount_off: "= engine − amount",
};

function formula(p: {
  pricing: string;
  amount: number | null;
  percent: number | null;
}) {
  if (p.pricing === "flat" && p.amount)
    return `= flat Rp ${p.amount.toLocaleString("en-US")}`;
  if (p.pricing === "percent_off" && p.percent)
    return `= engine − ${Math.round(p.percent * 100)}%`;
  if (p.pricing === "amount_off" && p.amount)
    return `= engine − Rp ${p.amount.toLocaleString("en-US")}`;
  return PRICING_LABEL[p.pricing] ?? p.pricing;
}

export default function RateSetupPage() {
  const toast = useToast();
  const { activeProperty } = useProperty();
  const arg = activeProperty ? { propertyId: activeProperty._id } : "skip";

  const plans = useQuery(api.rates.getRatePlans, arg);
  const channels = useQuery(api.commissions.getChannelTerms, arg);
  const upsertPlan = useMutation(api.rates.upsertRatePlan);
  const setPlanActive = useMutation(api.rates.setRatePlanActive);
  const upsertChannel = useMutation(api.commissions.upsertChannelTerm);

  const [selected, setSelected] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    kind: "promo",
    pricing: "percent_off",
    percent: "10",
    amount: "",
    minLos: "",
    advanceDays: "",
  });
  const [saving, setSaving] = useState(false);

  const list = plans ?? [];
  const active = list.find((p) => p._id === selected) ?? list[0] ?? null;

  const submit = async () => {
    if (!activeProperty || !form.code.trim() || !form.name.trim() || saving)
      return;
    setSaving(true);
    try {
      await upsertPlan({
        propertyId: activeProperty._id,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        kind: form.kind,
        pricing: form.pricing,
        percent:
          form.pricing === "percent_off"
            ? Number(form.percent) / 100
            : undefined,
        amount:
          form.pricing === "flat" || form.pricing === "amount_off"
            ? Number(form.amount.replace(/[^\d]/g, "")) || 0
            : undefined,
        minLos: form.minLos ? Number(form.minLos) : undefined,
        advanceDays: form.advanceDays ? Number(form.advanceDays) : undefined,
        active: true,
      });
      toast("Rate plan saved", "success");
      setNewOpen(false);
      setForm({
        code: "",
        name: "",
        kind: "promo",
        pricing: "percent_off",
        percent: "10",
        amount: "",
        minLos: "",
        advanceDays: "",
      });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save plan", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-content">
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <Eyebrow>Rate plans</Eyebrow>
        <button
          onClick={() => setNewOpen(true)}
          disabled={!activeProperty}
          className="ml-auto flex items-center gap-1.5 rounded-sm bg-accent-violet px-3.5 py-2 text-12 font-medium text-ice hover:bg-accent-violet-hi disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" /> New rate plan
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-[380px_1fr]">
        <Card className="overflow-hidden p-0">
          {!plans && (
            <div className="p-3.5 text-12 text-fg-3">Loading rate plans…</div>
          )}
          {plans && list.length === 0 && (
            <div className="p-3.5 text-12 text-fg-3">
              No rate plans yet. Create one to start selling on it.
            </div>
          )}
          {list.map((p) => (
            <button
              key={p._id}
              onClick={() => setSelected(p._id)}
              className={`flex w-full flex-col gap-1.5 border-b border-line-soft p-3.5 text-left last:border-0 transition-colors ${
                (active?._id ?? "") === p._id
                  ? "bg-violet-wash"
                  : "hover:bg-elevated"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-12 font-semibold">{p.code}</span>
                <span className="min-w-0 flex-1 truncate text-13">{p.name}</span>
                <span
                  className="whitespace-nowrap rounded-pill border px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    borderColor: p.active
                      ? "var(--accent-cyan)"
                      : "var(--fg-3)",
                    color: p.active ? "var(--accent-cyan)" : "var(--fg-3)",
                  }}
                >
                  {p.active ? "Active" : "Off"}
                </span>
              </div>
              <div className="pl-1 font-mono text-[11px] text-fg-3">
                {formula(p)}
              </div>
            </button>
          ))}
        </Card>

        {active && (
          <Card className="flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-18 font-bold">
                  {active.name}
                </div>
                <div className="mt-0.5 text-12 text-fg-3">
                  {active.code} · {KIND_LABEL[active.kind] ?? active.kind} ·{" "}
                  {formula(active)}
                </div>
              </div>
              <button
                onClick={async () => {
                  await setPlanActive({
                    id: active._id as Id<"rate_plans">,
                    active: !active.active,
                  });
                  toast(
                    active.active ? "Plan taken off sale" : "Plan opened for sale",
                    "success"
                  );
                }}
                className="rounded-sm border border-line px-2.5 py-1 text-[11px] font-semibold text-fg-1 hover:border-line-strong"
              >
                {active.active ? "Take off sale" : "Open for sale"}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ["Linked reservations", String(active.reservations)],
                [
                  "Agreement",
                  active.agreementId ? "Linked corporate" : "—",
                ],
                [
                  "Breakfast",
                  active.includesBreakfast ? "Included" : "Not included",
                ],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-md border border-line-soft bg-deep px-3 py-2.5"
                >
                  <div className="text-[10.5px] uppercase tracking-wide text-fg-3">
                    {k}
                  </div>
                  <div className="mt-0.5 font-mono text-[13px]">{v}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Eyebrow className="mb-2">Booking conditions</Eyebrow>
                <div className="flex flex-col gap-1.5 text-[12.5px]">
                  <Row
                    k="Minimum stay"
                    v={active.minLos ? `${active.minLos} nights` : "None"}
                    mono
                  />
                  <Row
                    k="Advance booking"
                    v={
                      active.advanceDays
                        ? `${active.advanceDays} days ahead`
                        : "None"
                    }
                    mono
                  />
                </div>
              </div>
              {active.components.length > 0 && (
                <div>
                  <Eyebrow className="mb-2">Package components</Eyebrow>
                  <div className="flex flex-col gap-1.5 text-[12.5px]">
                    {active.components.map((c) => (
                      <div key={c.code} className="flex justify-between">
                        <span className="text-fg-2">{c.label}</span>
                        <span className="font-mono text-fg-3">
                          Rp {c.amount.toLocaleString("en-US")}/night
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      <Eyebrow className="mb-2.5">Channel terms &amp; commission</Eyebrow>
      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-[1.2fr_0.8fr_1fr_0.8fr] gap-2 border-b border-line px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3">
          <div>Channel</div>
          <div>Commission</div>
          <div>Collection</div>
          <div>Status</div>
        </div>
        {!channels && (
          <div className="px-4 py-4 text-13 text-fg-3">Loading channels…</div>
        )}
        {(channels ?? []).map((c) => (
          <div
            key={c._id}
            className="grid grid-cols-[1.2fr_0.8fr_1fr_0.8fr] items-center gap-2 border-b border-line-soft px-4 py-3 text-13 last:border-0"
          >
            <div className="font-semibold text-ice">{c.channel}</div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                defaultValue={Math.round(c.commissionPct * 100)}
                onBlur={async (e) => {
                  const next = Number(e.target.value) / 100;
                  if (
                    !activeProperty ||
                    Number.isNaN(next) ||
                    next === c.commissionPct
                  )
                    return;
                  await upsertChannel({
                    propertyId: activeProperty._id,
                    channel: c.channel,
                    commissionPct: next,
                    collection: c.collection,
                    active: c.active,
                  });
                  toast(`${c.channel} commission updated`, "success");
                }}
                className="w-14 rounded-sm border border-line bg-ink px-2 py-1 font-mono text-12 text-ice outline-none focus:border-accent-violet"
              />
              <span className="text-fg-3">%</span>
            </div>
            <div className="text-12 capitalize text-fg-2">
              {c.collection === "merchant"
                ? "OTA bills guest (net remit)"
                : "Hotel bills guest"}
            </div>
            <div
              className="text-[11.5px]"
              style={{
                color: c.active ? "var(--accent-cyan)" : "var(--fg-3)",
              }}
            >
              {c.active ? "Active" : "Off"}
            </div>
          </div>
        ))}
        {channels && channels.length === 0 && (
          <div className="px-4 py-4 text-13 text-fg-3">
            No channel terms configured — OTA bookings carry no commission.
          </div>
        )}
      </Card>

      {newOpen && (
        <>
          <div
            onClick={() => setNewOpen(false)}
            className="fixed inset-0 z-40 bg-deepest/70 backdrop-blur-[6px]"
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[440px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-elevated p-5 shadow-3">
            <div className="mb-3 font-display text-16 font-bold text-ice">
              New rate plan
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="grid grid-cols-[120px_1fr] gap-2.5">
                <input
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code: e.target.value }))
                  }
                  placeholder="CODE"
                  className="rounded-sm border border-line bg-ink px-2.5 py-2 font-mono text-13 text-ice outline-none focus:border-accent-violet"
                />
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Plan name"
                  className="rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-ice outline-none focus:border-accent-violet"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <select
                  value={form.kind}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, kind: e.target.value }))
                  }
                  className="rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-fg-2"
                >
                  <option value="promo">Promotion</option>
                  <option value="package">Package</option>
                  <option value="corporate">Corporate</option>
                  <option value="bar">Best available</option>
                </select>
                <select
                  value={form.pricing}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pricing: e.target.value }))
                  }
                  className="rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-fg-2"
                >
                  <option value="percent_off">Engine − %</option>
                  <option value="amount_off">Engine − amount</option>
                  <option value="flat">Flat nightly</option>
                  <option value="engine">Engine (no change)</option>
                </select>
              </div>
              {form.pricing === "percent_off" && (
                <input
                  value={form.percent}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, percent: e.target.value }))
                  }
                  placeholder="Discount %"
                  className="rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-ice outline-none focus:border-accent-violet"
                />
              )}
              {(form.pricing === "flat" || form.pricing === "amount_off") && (
                <input
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  placeholder={
                    form.pricing === "flat"
                      ? "Flat nightly rate (Rp)"
                      : "Amount off per night (Rp)"
                  }
                  className="rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-ice outline-none focus:border-accent-violet"
                />
              )}
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  value={form.minLos}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minLos: e.target.value }))
                  }
                  placeholder="Min nights (opt.)"
                  className="rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-ice outline-none focus:border-accent-violet"
                />
                <input
                  value={form.advanceDays}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, advanceDays: e.target.value }))
                  }
                  placeholder="Advance days (opt.)"
                  className="rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-ice outline-none focus:border-accent-violet"
                />
              </div>
              <div className="mt-1 flex gap-2">
                <button
                  onClick={() => setNewOpen(false)}
                  className="flex-1 rounded-sm border border-line px-3 py-2.5 text-13 text-fg-1 hover:border-line-strong"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={!form.code.trim() || !form.name.trim() || saving}
                  className="flex-1 rounded-sm bg-accent-violet px-3 py-2.5 text-13 font-semibold text-ice hover:bg-accent-violet-hi disabled:opacity-40"
                >
                  {saving ? "Saving…" : "Create plan"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
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
