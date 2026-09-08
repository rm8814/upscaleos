"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useProperty } from "@/components/providers/PropertyProvider";
import { Plus, Trash2, Rocket } from "lucide-react";
import { Card, Eyebrow } from "@/components/upx/primitives";

type Tab = "property" | "team" | "taxes" | "integrations";

const CURRENCIES = ["IDR", "USD", "SGD", "MYR", "AUD"];
const TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
];
const ROLES = [
  "General Manager",
  "Front office",
  "Housekeeping lead",
  "Engineering",
  "Night auditor",
  "Revenue manager",
  "Reservations",
];
const BASES = ["Room + F&B", "Room only", "F&B only", "Per room-night", "Per stay"];

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

  if (!activeProperty) {
    return <div className="p-1 text-13 text-fg-3">Loading…</div>;
  }

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

      {tab === "property" && <PropertyTab property={activeProperty} />}
      {tab === "team" && <TeamTab propertyId={activeProperty._id} />}
      {tab === "taxes" && <TaxesTab propertyId={activeProperty._id} />}
      {tab === "integrations" && <IntegrationsTab />}
    </div>
  );
}

/* ------------------------------------------------------------------ Property */

type PropertyDoc = ReturnType<typeof useProperty>["activeProperty"];

function PropertyTab({ property }: { property: NonNullable<PropertyDoc> }) {
  const update = useMutation(api.properties.update);

  const initial = useMemo(
    () => ({
      name: property.name,
      externalId: property.id,
      initials: property.initials,
      location: property.location,
      address: property.address ?? "",
      contactEmail: property.contactEmail ?? "",
      currency: property.currency ?? "IDR",
      timezone: property.timezone ?? "Asia/Makassar",
      checkInTime: property.checkInTime ?? "14:00",
      checkOutTime: property.checkOutTime ?? "12:00",
      autoAssignRooms: property.autoAssignRooms ?? false,
      autoNightAudit: property.autoNightAudit ?? false,
      nightAuditTime: property.nightAuditTime ?? "03:00",
      cancellation: property.policies?.cancellation ?? "",
      deposit: property.policies?.deposit ?? "",
      children: property.policies?.children ?? "",
      pets: property.policies?.pets ?? "",
      smoking: property.policies?.smoking ?? "",
    }),
    [property]
  );

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => setForm(initial), [initial]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const save = async () => {
    setSaving(true);
    await update({
      id: property._id,
      patch: {
        name: form.name,
        externalId: form.externalId,
        initials: form.initials,
        location: form.location,
        address: form.address,
        contactEmail: form.contactEmail,
        currency: form.currency,
        timezone: form.timezone,
        checkInTime: form.checkInTime,
        checkOutTime: form.checkOutTime,
        autoAssignRooms: form.autoAssignRooms,
        autoNightAudit: form.autoNightAudit,
        nightAuditTime: form.nightAuditTime,
        policies: {
          cancellation: form.cancellation,
          deposit: form.deposit,
          children: form.children,
          pets: form.pets,
          smoking: form.smoking,
        },
      },
    });
    setSaving(false);
    setSaved(true);
  };

  const activate = () =>
    update({ id: property._id, patch: { status: "active" } });

  return (
    <div className="flex flex-col gap-4">
      {property.status === "onboarding" && (
        <div className="flex items-center gap-3 rounded-lg border border-ai-edge bg-ai-tint p-3.5">
          <Rocket className="h-[18px] w-[18px] flex-none text-ai-fg" />
          <div className="flex-1 text-13 text-ice">
            <strong>{property.name}</strong> is in setup. Fill in the details below, then
            activate it to start taking bookings.
          </div>
          <button
            onClick={activate}
            className="flex-none rounded-sm bg-accent-violet px-3.5 py-2 text-12 font-medium text-ice hover:bg-accent-violet-hi"
          >
            Activate property
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 p-5">
          <Eyebrow>Property details</Eyebrow>
          <TextRow label="Name" value={form.name} onChange={(v) => set("name", v)} />
          <div className="grid grid-cols-2 gap-3">
            <TextRow
              label="External property ID"
              value={form.externalId}
              onChange={(v) => set("externalId", v)}
              mono
            />
            <TextRow
              label="Initials"
              value={form.initials}
              onChange={(v) => set("initials", v.toUpperCase().slice(0, 4))}
            />
          </div>
          <TextRow label="Location" value={form.location} onChange={(v) => set("location", v)} />
          <TextRow label="Address" value={form.address} onChange={(v) => set("address", v)} />
          <TextRow
            label="Contact email"
            value={form.contactEmail}
            onChange={(v) => set("contactEmail", v)}
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectRow
              label="Currency"
              value={form.currency}
              options={CURRENCIES}
              onChange={(v) => set("currency", v)}
            />
            <SelectRow
              label="Timezone"
              value={form.timezone}
              options={TIMEZONES}
              onChange={(v) => set("timezone", v)}
            />
            <TimeRow
              label="Check-in"
              value={form.checkInTime}
              onChange={(v) => set("checkInTime", v)}
            />
            <TimeRow
              label="Check-out"
              value={form.checkOutTime}
              onChange={(v) => set("checkOutTime", v)}
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <Eyebrow>Policies</Eyebrow>
          <TextRow
            label="Default cancellation"
            value={form.cancellation}
            onChange={(v) => set("cancellation", v)}
          />
          <TextRow label="Deposit" value={form.deposit} onChange={(v) => set("deposit", v)} />
          <TextRow
            label="Child policy"
            value={form.children}
            onChange={(v) => set("children", v)}
          />
          <TextRow label="Pets" value={form.pets} onChange={(v) => set("pets", v)} />
          <TextRow label="Smoking" value={form.smoking} onChange={(v) => set("smoking", v)} />
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <Eyebrow>Operations</Eyebrow>
          <ToggleRow
            label="Auto-assign rooms"
            hint="When a reservation is created without a room, pick the first free room of the booked type."
            checked={form.autoAssignRooms}
            onChange={(v) => set("autoAssignRooms", v)}
          />
          <div className="h-px bg-line-soft" />
          <ToggleRow
            label="Automatic night audit"
            hint="Roll the business date and post departures on a schedule, with no manual run."
            checked={form.autoNightAudit}
            onChange={(v) => set("autoNightAudit", v)}
          />
          {form.autoNightAudit && (
            <div className="pl-1">
              <TimeRow
                label={`Run time (${form.timezone})`}
                value={form.nightAuditTime}
                onChange={(v) => set("nightAuditTime", v)}
              />
            </div>
          )}
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-sm bg-accent-violet px-4 py-2.5 text-13 font-semibold text-ice transition-colors hover:bg-accent-violet-hi disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && !dirty && <span className="text-12 text-accent-cyan">Saved.</span>}
        {dirty && <span className="text-12 text-fg-3">Unsaved changes</span>}
      </div>
    </div>
  );
}

function TextRow({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-fg-3">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-ice outline-none focus:border-accent-violet ${
          mono ? "font-mono" : ""
        }`}
      />
    </label>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-fg-3">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-sm border border-line bg-ink px-2.5 py-2 text-13 text-ice"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function TimeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-fg-3">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-sm border border-line bg-ink px-2.5 py-2 font-mono text-13 text-ice outline-none focus:border-accent-violet"
      />
    </label>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="text-13 text-ice">{label}</div>
        <div className="mt-0.5 text-[11.5px] text-fg-3">{hint}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-[22px] w-[38px] flex-none rounded-pill border transition-colors ${
          checked
            ? "border-accent-violet bg-accent-violet"
            : "border-line bg-elevated"
        }`}
      >
        <span
          className={`absolute top-[2px] h-[16px] w-[16px] rounded-pill bg-ice transition-all ${
            checked ? "left-[18px]" : "left-[2px]"
          }`}
        />
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------- Team */

function TeamTab({ propertyId }: { propertyId: Id<"properties"> }) {
  const members = useQuery(api.team.listMembers, { propertyId });
  const addMember = useMutation(api.team.addMember);
  const updateRole = useMutation(api.team.updateMemberRole);
  const removeMember = useMutation(api.team.removeMember);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ name: "", email: "", role: ROLES[1] });
  const [error, setError] = useState<string | null>(null);

  const submitInvite = async () => {
    if (!invite.email.trim()) return;
    setError(null);
    try {
      await addMember({
        propertyId,
        email: invite.email.trim(),
        name: invite.name.trim(),
        role: invite.role,
      });
      setInvite({ name: "", email: "", role: ROLES[1] });
      setInviteOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not invite.");
    }
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <Eyebrow>Team members</Eyebrow>
        <button
          onClick={() => setInviteOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-sm bg-accent-violet px-3 py-1.5 text-12 font-medium text-ice hover:bg-accent-violet-hi"
        >
          <Plus className="h-3.5 w-3.5" /> Invite
        </button>
      </div>

      {inviteOpen && (
        <div className="flex flex-wrap items-end gap-2 border-b border-line bg-deep px-4 py-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-fg-3">Name</span>
            <input
              value={invite.name}
              onChange={(e) => setInvite((i) => ({ ...i, name: e.target.value }))}
              className="w-40 rounded-sm border border-line bg-ink px-2.5 py-1.5 text-12 text-ice outline-none focus:border-accent-violet"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-fg-3">Email</span>
            <input
              value={invite.email}
              onChange={(e) => setInvite((i) => ({ ...i, email: e.target.value }))}
              className="w-56 rounded-sm border border-line bg-ink px-2.5 py-1.5 text-12 text-ice outline-none focus:border-accent-violet"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-fg-3">Role</span>
            <select
              value={invite.role}
              onChange={(e) => setInvite((i) => ({ ...i, role: e.target.value }))}
              className="rounded-sm border border-line bg-ink px-2.5 py-1.5 text-12 text-fg-2"
            >
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <button
            onClick={submitInvite}
            className="rounded-sm bg-accent-violet px-3 py-1.5 text-12 font-medium text-ice hover:bg-accent-violet-hi"
          >
            Send invite
          </button>
          {error && <span className="text-12 text-room-ooo">{error}</span>}
        </div>
      )}

      <div className="grid grid-cols-[1.4fr_1fr_0.7fr_40px] border-b border-line px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3">
        <div>Member</div>
        <div>Role</div>
        <div>Status</div>
        <div />
      </div>

      {!members && <div className="px-4 py-4 text-13 text-fg-3">Loading team…</div>}
      {members?.length === 0 && (
        <div className="px-4 py-4 text-13 text-fg-3">No members yet.</div>
      )}
      {members?.map((m) => (
        <div
          key={m._id}
          className="grid grid-cols-[1.4fr_1fr_0.7fr_40px] items-center border-b border-line-soft px-4 py-3 text-13 last:border-0"
        >
          <div>
            <div className="font-semibold">{m.name}</div>
            <div className="text-[11px] text-fg-3">{m.email}</div>
          </div>
          <select
            value={m.role}
            onChange={(e) => updateRole({ id: m._id, role: e.target.value })}
            className="w-full max-w-[180px] rounded-sm border border-line bg-ink px-2 py-1.5 text-12 text-fg-2"
          >
            {[...new Set([m.role, ...ROLES])].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <div
            className="text-[11.5px]"
            style={{
              color: m.status === "active" ? "var(--accent-cyan)" : "var(--res-tentative)",
            }}
          >
            {m.status === "active" ? "Active" : "Invited"}
          </div>
          <button
            onClick={() => removeMember({ id: m._id })}
            className="justify-self-end text-fg-3 hover:text-room-ooo"
            aria-label={`Remove ${m.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </Card>
  );
}

/* --------------------------------------------------------------------- Taxes */

function TaxesTab({ propertyId }: { propertyId: Id<"properties"> }) {
  const taxes = useQuery(api.taxes.listTaxes, { propertyId });
  const addTax = useMutation(api.taxes.addTax);
  const updateTax = useMutation(api.taxes.updateTax);
  const deleteTax = useMutation(api.taxes.deleteTax);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <Eyebrow>Taxes &amp; fees</Eyebrow>
        <button
          onClick={() =>
            addTax({
              propertyId,
              name: "New charge",
              rate: "0%",
              basis: "Room + F&B",
              inclusive: "Exclusive",
            })
          }
          className="flex items-center gap-1.5 rounded-sm bg-accent-violet px-3 py-1.5 text-12 font-medium text-ice hover:bg-accent-violet-hi"
        >
          <Plus className="h-3.5 w-3.5" /> Add charge
        </button>
      </div>

      <div className="grid grid-cols-[1.4fr_0.7fr_1fr_0.9fr_40px] border-b border-line px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3">
        <div>Name</div>
        <div>Rate</div>
        <div>Basis</div>
        <div>Inclusive</div>
        <div />
      </div>

      {!taxes && <div className="px-4 py-4 text-13 text-fg-3">Loading…</div>}
      {taxes?.length === 0 && (
        <div className="px-4 py-4 text-13 text-fg-3">No taxes configured.</div>
      )}
      {taxes?.map((t) => (
        <div
          key={t._id}
          className="grid grid-cols-[1.4fr_0.7fr_1fr_0.9fr_40px] items-center gap-2 border-b border-line-soft px-4 py-2.5 last:border-0"
        >
          <input
            defaultValue={t.name}
            onBlur={(e) =>
              e.target.value !== t.name &&
              updateTax({ id: t._id, patch: { name: e.target.value } })
            }
            className="rounded-sm border border-line bg-ink px-2 py-1.5 text-13 text-ice outline-none focus:border-accent-violet"
          />
          <input
            defaultValue={t.rate}
            onBlur={(e) =>
              e.target.value !== t.rate &&
              updateTax({ id: t._id, patch: { rate: e.target.value } })
            }
            className="rounded-sm border border-line bg-ink px-2 py-1.5 font-mono text-12 text-ice outline-none focus:border-accent-violet"
          />
          <select
            defaultValue={t.basis}
            onChange={(e) => updateTax({ id: t._id, patch: { basis: e.target.value } })}
            className="rounded-sm border border-line bg-ink px-2 py-1.5 text-12 text-fg-2"
          >
            {[...new Set([t.basis, ...BASES])].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <select
            defaultValue={t.inclusive}
            onChange={(e) => updateTax({ id: t._id, patch: { inclusive: e.target.value } })}
            className="rounded-sm border border-line bg-ink px-2 py-1.5 text-12 text-fg-2"
          >
            <option>Exclusive</option>
            <option>Inclusive</option>
          </select>
          <button
            onClick={() => deleteTax({ id: t._id })}
            className="justify-self-end text-fg-3 hover:text-room-ooo"
            aria-label={`Delete ${t.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </Card>
  );
}

/* -------------------------------------------------------------- Integrations */

function IntegrationsTab() {
  return (
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
  );
}
