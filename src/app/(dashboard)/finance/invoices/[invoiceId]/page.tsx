"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, Printer } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

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

export default function InvoicePage() {
  const params = useParams();
  const invoiceId = params.invoiceId as Id<"invoices">;
  const toast = useToast();
  const inv = useQuery(api.invoices.get, { invoiceId });
  const voidInvoice = useMutation(api.invoices.voidInvoice);
  const creditNote = useMutation(api.invoices.creditNote);

  if (inv === undefined) {
    return <div className="p-6 text-13 text-fg-3">Loading invoice…</div>;
  }
  if (inv === null) {
    return <div className="p-6 text-13 text-fg-3">Invoice not found.</div>;
  }

  return (
    <div className="mx-auto max-w-[820px]">
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link
          href="/finance/invoices"
          className="flex items-center gap-1.5 rounded-sm border border-line bg-fg-1/[0.06] px-3 py-2 text-12 hover:border-line-strong"
        >
          <ArrowLeft className="h-[13px] w-[13px]" /> All invoices
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-sm border border-line bg-fg-1/[0.06] px-3 py-2 text-12 hover:border-line-strong"
        >
          <Printer className="h-[13px] w-[13px]" /> Print
        </button>
        {inv.status === "issued" || inv.status === "paid" ? (
          <>
            <button
              onClick={async () => {
                await creditNote({ invoiceId, reason: "Credit note issued from invoice view" });
                toast("Credit note created", "success");
              }}
              className="ml-auto rounded-sm border border-line bg-fg-1/[0.06] px-3 py-2 text-12 hover:border-line-strong"
            >
              Issue credit note
            </button>
            <button
              onClick={async () => {
                await voidInvoice({ invoiceId, reason: "Voided from invoice view" });
                toast("Invoice voided");
              }}
              className="rounded-sm border border-room-ooo px-3 py-2 text-12 text-room-ooo hover:bg-room-ooo/10"
            >
              Void
            </button>
          </>
        ) : null}
      </div>

      <div className="rounded-lg border border-line bg-elevated p-8 text-fg-1">
        <div className="flex items-start justify-between border-b border-line pb-5">
          <div>
            <div className="font-display text-20 font-bold text-ice">
              {inv.property?.name ?? "Property"}
            </div>
            <div className="mt-1 max-w-[280px] text-[11.5px] leading-relaxed text-fg-3">
              {inv.property?.address}
              <br />
              {inv.property?.contactEmail} · Property ID {inv.property?.id}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-16 font-bold text-ice">{inv.number}</div>
            <div className="mt-1 text-12 text-fg-3">Issued {fmt(inv.issuedOn)}</div>
            <span
              className="mt-2 inline-block rounded-pill border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase"
              style={{
                borderColor: STATUS_COLOR[inv.status] ?? "var(--fg-3)",
                color: STATUS_COLOR[inv.status] ?? "var(--fg-3)",
              }}
            >
              {inv.status === "credit_note" ? "Credit note" : inv.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-5 text-12">
          <div>
            <div className="mb-1 text-[10.5px] uppercase tracking-[0.08em] text-fg-3">
              Billed to
            </div>
            <div className="text-13 font-semibold text-ice">{inv.guestName}</div>
          </div>
          {inv.stay && (
            <div>
              <div className="mb-1 text-[10.5px] uppercase tracking-[0.08em] text-fg-3">
                Stay
              </div>
              <div>
                {fmt(inv.stay.checkIn)} → {fmt(inv.stay.checkOut)}
              </div>
              <div className="text-fg-3">
                Room {inv.stay.room} · {inv.stay.roomType}
              </div>
            </div>
          )}
        </div>

        {inv.voidReason && (
          <div className="mb-4 rounded-md border border-room-ooo bg-room-ooo/[0.08] px-3 py-2 text-12 text-room-ooo">
            {inv.status === "credit_note" ? "Credit reason: " : "Void reason: "}
            {inv.voidReason}
          </div>
        )}

        <table className="w-full border-collapse text-12">
          <thead>
            <tr className="border-y border-line text-left text-[10.5px] uppercase tracking-[0.06em] text-fg-3">
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 font-medium">Code</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={i} className="border-b border-line-soft">
                <td className="py-2">{l.description}</td>
                <td className="py-2 font-mono text-fg-3">{l.code}</td>
                <td
                  className={`py-2 text-right font-mono ${
                    l.amount < 0 ? "text-accent-cyan" : ""
                  }`}
                >
                  {l.amountLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-4 w-[260px] text-12">
          <Row label="Charges" value={inv.chargesLabel} />
          <Row label="Paid" value={inv.paidLabel} />
          <div className="mt-1 border-t border-line pt-1">
            <Row label="Balance due" value={inv.balanceLabel} strong />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className={strong ? "font-semibold text-ice" : "text-fg-3"}>
        {label}
      </span>
      <span
        className={`font-mono ${strong ? "text-14 font-semibold text-ice" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
