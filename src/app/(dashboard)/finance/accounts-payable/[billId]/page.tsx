"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, Eyebrow } from "@/components/upx/primitives";
import { useProperty } from "@/components/providers/PropertyProvider";
import { buildBills, STATUS_COLOR } from "../data";

export default function BillDetailPage() {
  const { billId } = useParams<{ billId: string }>();
  const { activeProperty } = useProperty();
  const bill = buildBills(activeProperty?.businessDate ?? "2026-09-08").find(
    (b) => b.id === billId
  );

  if (!bill)
    return (
      <div className="p-1 text-13 text-fg-3">
        Bill not found.{" "}
        <Link href="/finance/accounts-payable" className="text-accent-violet-hi">
          Back to accounts payable
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-content">
      <div className="mb-4 flex items-center">
        <Link
          href="/finance/accounts-payable"
          className="flex items-center gap-1.5 text-12 text-fg-3 hover:text-fg-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Accounts payable
        </Link>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="font-display text-19 font-bold">{bill.vendor}</div>
              <div className="mt-0.5 font-mono text-12 text-fg-3">
                {bill.billNo} · {bill.category}
              </div>
            </div>
            <div
              className="text-12 font-semibold"
              style={{ color: STATUS_COLOR[bill.status] }}
            >
              {bill.status}
            </div>
          </div>

          <div className="mb-[18px] grid grid-cols-3 gap-2.5">
            {[
              ["Issued", bill.issued],
              ["Due", bill.due],
              ["Amount", bill.amount],
            ].map(([k, v], i) => (
              <div key={k} className="rounded-md border border-line bg-deep p-3">
                <div className="text-[11px] text-fg-3">{k}</div>
                <div className={`mt-0.5 text-13 ${i === 2 ? "font-mono font-bold" : ""}`}>{v}</div>
              </div>
            ))}
          </div>

          <Eyebrow className="mb-2">Line items</Eyebrow>
          {bill.lineItems.map((li) => (
            <div
              key={li.desc}
              className="flex justify-between border-b border-line-soft py-2.5 text-13 last:border-0"
            >
              <div>
                <div>{li.desc}</div>
                <div className="mt-px font-mono text-[11px] text-fg-3">{li.glAccount}</div>
              </div>
              <div className="font-mono">{li.amount}</div>
            </div>
          ))}

          {bill.notes && (
            <div className="mt-3.5 rounded-md border border-line bg-deep px-3 py-2.5 text-[12.5px] text-fg-2">
              {bill.notes}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-2.5">
          <Card className="flex flex-col gap-2 p-4">
            <button className="rounded-sm bg-accent-violet py-2.5 text-[12.5px] font-medium text-ice hover:bg-accent-violet-hi">
              Approve bill
            </button>
            <button className="rounded-sm border border-line bg-fg-1/[0.06] py-2.5 text-[12.5px] hover:border-line-strong">
              Mark as paid
            </button>
            <button className="rounded-sm border border-line bg-fg-1/[0.06] py-2.5 text-[12.5px] hover:border-line-strong">
              Dispute / hold
            </button>
          </Card>
          <div className="px-1 text-11 text-fg-3">
            Bills over Rp 20,000,000 require GM approval before payment-run inclusion.
          </div>
        </div>
      </div>
    </div>
  );
}
