"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, Eyebrow } from "@/components/upx/primitives";
import { useProperty } from "@/components/providers/PropertyProvider";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const STATUS_COLOR: Record<string, string> = {
  issued: "var(--res-tentative)",
  paid: "var(--accent-cyan)",
  void: "var(--room-ooo)",
  credit_note: "var(--accent-violet-hi)",
};

const GRID = "grid grid-cols-[1fr_1.4fr_0.9fr_1fr_1fr_0.9fr] gap-2.5 px-4";

export default function InvoicesPage() {
  const { activeProperty } = useProperty();
  const invoices = useQuery(
    api.invoices.list,
    activeProperty ? { propertyId: activeProperty._id, limit: 100 } : "skip"
  );

  return (
    <div className="mx-auto max-w-content">
      <Eyebrow className="mb-2.5">Invoices</Eyebrow>
      <Card className="overflow-x-auto p-0">
        <div className="min-w-[760px]">
          <div className={`${GRID} border-b border-line py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3`}>
            <div>Number</div>
            <div>Guest</div>
            <div>Issued</div>
            <div>Total</div>
            <div>Balance</div>
            <div>Status</div>
          </div>
          {invoices === undefined && (
            <div className="px-4 py-6 text-13 text-fg-3">Loading…</div>
          )}
          {invoices && invoices.length === 0 && (
            <div className="px-4 py-6 text-13 text-fg-3">
              No invoices yet — one is issued automatically at check-out.
            </div>
          )}
          {(invoices ?? []).map((inv) => (
            <Link
              key={inv._id}
              href={`/finance/invoices/${inv._id}`}
              className={`${GRID} items-center border-b border-line-soft py-3 text-13 last:border-0 hover:bg-elevated`}
            >
              <div className="font-mono">{inv.number}</div>
              <div className="font-medium">{inv.guestName}</div>
              <div className="text-12 text-fg-3">{fmt(inv.issuedOn)}</div>
              <div className="font-mono">{inv.totalLabel}</div>
              <div className="font-mono">{inv.balanceLabel}</div>
              <div
                className="text-[11.5px] capitalize"
                style={{ color: STATUS_COLOR[inv.status] ?? "var(--fg-3)" }}
              >
                {inv.status === "credit_note" ? "Credit note" : inv.status}
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
