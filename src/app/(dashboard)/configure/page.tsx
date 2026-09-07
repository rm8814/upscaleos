"use client";

import React, { useState } from "react";
import { useProperty } from "@/components/providers/PropertyProvider";
import { Plus } from "lucide-react";
import { Card, Eyebrow } from "@/components/upx/primitives";

type Tab = "property" | "team" | "taxes" | "integrations";

const TEAM = [
  { name: "Amira K.", email: "gm@grandsamudra.upscale.id", role: "General Manager", status: "Active" },
  { name: "Rangga Putra", email: "fo@grandsamudra.upscale.id", role: "Front office", status: "Active" },
  { name: "Wayan Sari", email: "hk@grandsamudra.upscale.id", role: "Housekeeping lead", status: "Active" },
  { name: "Budi Santoso", email: "eng@grandsamudra.upscale.id", role: "Engineering", status: "Active" },
  { name: "Sri Wahyuni", email: "night@grandsamudra.upscale.id", role: "Night auditor", status: "Invited" },
];

const TAXES = [
  { name: "Government tax", rate: "11%", basis: "Room + F&B", inclusive: "Exclusive" },
  { name: "Service charge", rate: "10%", basis: "Room + F&B", inclusive: "Exclusive" },
  { name: "City / tourism levy", rate: "Rp 20.000", basis: "Per room-night", inclusive: "Exclusive" },
];

const INTEGRATIONS = [
  { name: "SiteMinder (channel manager)", status: "Connected", detail: "Syncing every 5 min" },
  { name: "Xendit (payments)", status: "Connected", detail: "QRIS, cards, e-wallets" },
  { name: "Accurate Online (accounting)", status: "Connected", detail: "Nightly revenue journal export" },
  { name: "WhatsApp Business API", status: "Connected", detail: "Front-desk messaging agent" },
  { name: "Mailchimp (marketing)", status: "Not connected", detail: "Guest segments + campaigns" },
];

export default function ConfigurePage() {
  const { activeProperty } = useProperty();
  const [tab, setTab] = useState<Tab>("property");

  return (
    <div className="mx-auto max-w-content">
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["property", "Property"],
            ["team", "Team & roles"],
            ["taxes", "Taxes & fees"],
            ["integrations", "Integrations"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-sm border px-3 py-1.5 text-[12.5px] transition-colors ${
              tab === id
                ? "border-accent-violet bg-violet-wash text-ice"
                : "border-line bg-elevated text-fg-2 hover:border-line-strong"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "property" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="flex flex-col gap-3 p-5">
            <Eyebrow>Property details</Eyebrow>
            <Field label="Name" value={activeProperty?.name ?? "—"} />
            <Field label="Location" value={activeProperty?.location ?? "—"} />
            <Field label="External property ID" value={activeProperty?.id ?? "—"} mono />
            <Field label="Rooms" value="30 · 4 room types" />
            <Field label="Check-in / check-out" value="14:00 / 12:00" />
            <Field label="Currency" value="IDR (Rp)" />
            <Field label="Timezone" value="Asia/Makassar (GMT+8)" />
          </Card>
          <Card className="flex flex-col gap-3 p-5">
            <Eyebrow>Policies</Eyebrow>
            <Field label="Default cancellation" value="Free up to 48h before arrival" />
            <Field label="Deposit" value="Card guarantee, no prepayment" />
            <Field label="Child policy" value="Under 6 stay free with an adult" />
            <Field label="Pets" value="Not permitted" />
            <Field label="Smoking" value="Designated areas only" />
          </Card>
        </div>
      )}

      {tab === "team" && (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <Eyebrow>Team members</Eyebrow>
            <button className="flex items-center gap-1.5 rounded-sm bg-accent-violet px-3 py-1.5 text-12 font-medium text-ice hover:bg-accent-violet-hi">
              <Plus className="h-3.5 w-3.5" /> Invite
            </button>
          </div>
          <div className="grid grid-cols-[1.4fr_1fr_0.7fr] border-b border-line px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3">
            <div>Member</div>
            <div>Role</div>
            <div>Status</div>
          </div>
          {TEAM.map((m) => (
            <div
              key={m.email}
              className="grid grid-cols-[1.4fr_1fr_0.7fr] items-center border-b border-line-soft px-4 py-3 text-13 last:border-0"
            >
              <div>
                <div className="font-semibold">{m.name}</div>
                <div className="text-[11px] text-fg-3">{m.email}</div>
              </div>
              <div className="text-12">{m.role}</div>
              <div
                className="text-[11.5px]"
                style={{ color: m.status === "Active" ? "var(--accent-cyan)" : "var(--res-tentative)" }}
              >
                {m.status}
              </div>
            </div>
          ))}
        </Card>
      )}

      {tab === "taxes" && (
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-[1.2fr_0.7fr_1fr_0.9fr] border-b border-line px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3">
            <div>Name</div>
            <div>Rate</div>
            <div>Basis</div>
            <div>Inclusive</div>
          </div>
          {TAXES.map((t) => (
            <div
              key={t.name}
              className="grid grid-cols-[1.2fr_0.7fr_1fr_0.9fr] items-center border-b border-line-soft px-4 py-3 text-13 last:border-0"
            >
              <div className="font-semibold">{t.name}</div>
              <div className="font-mono">{t.rate}</div>
              <div className="text-12 text-fg-3">{t.basis}</div>
              <div className="text-12">{t.inclusive}</div>
            </div>
          ))}
        </Card>
      )}

      {tab === "integrations" && (
        <div className="flex flex-col gap-2.5">
          {INTEGRATIONS.map((it) => (
            <Card key={it.name} className="flex items-center gap-3 p-4">
              <div className="flex-1">
                <div className="text-13 font-semibold">{it.name}</div>
                <div className="text-[11.5px] text-fg-3">{it.detail}</div>
              </div>
              <span
                className="rounded-pill border px-2.5 py-0.5 text-[11px] font-semibold"
                style={{
                  borderColor: it.status === "Connected" ? "var(--accent-cyan)" : "var(--fg-3)",
                  color: it.status === "Connected" ? "var(--accent-cyan)" : "var(--fg-3)",
                }}
              >
                {it.status}
              </span>
              <button className="rounded-sm border border-line bg-fg-1/[0.06] px-3 py-1.5 text-12 hover:border-line-strong">
                {it.status === "Connected" ? "Manage" : "Connect"}
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-13">
      <span className="text-fg-3">{label}</span>
      <span className={mono ? "font-mono" : ""}>{value}</span>
    </div>
  );
}
