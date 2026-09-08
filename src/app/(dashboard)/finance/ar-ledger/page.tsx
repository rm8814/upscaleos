"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, X, FileSpreadsheet } from "lucide-react";
import { Card, Eyebrow } from "@/components/upx/primitives";
import { useProperty } from "@/components/providers/PropertyProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { downloadCsv } from "@/lib/csv";

interface Account {
  account: string;
  type: string;
  balance: string;
  creditLimit: string;
  a030: string;
  a3160: string;
  a60: string;
  lastPayment: string;
  overdue: boolean;
  transactions: { desc: string; date: string; ref: string; amount: string; credit: boolean }[];
}

type AccountSpec = Omit<Account, "lastPayment" | "transactions"> & {
  lastPaymentOffset: number;
  transactions: { desc: string; dateOffset: number; ref: string; amount: string; credit: boolean }[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shiftDay = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};
const fullDate = (iso: string, n: number) => {
  const d = shiftDay(iso, n);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const shortDate = (iso: string, n: number) => {
  const d = shiftDay(iso, n);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]}`;
};
const monthLabel = (iso: string, n: number) => {
  const d = shiftDay(iso, n);
  return MONTHS[d.getUTCMonth()];
};

const ACCOUNT_SPECS: AccountSpec[] = [
  {
    account: "Accor Global",
    type: "Corporate",
    balance: "Rp 84,200,000",
    creditLimit: "Rp 150,000,000",
    a030: "Rp 62,000,000",
    a3160: "Rp 22,200,000",
    a60: "Rp 0",
    lastPaymentOffset: -27,
    overdue: false,
    transactions: [
      { desc: "Invoice INV-2026-0841 — group block", dateOffset: -38, ref: "INV-0841", amount: "Rp 62,000,000", credit: false },
      { desc: "Invoice INV-2026-0798 — corporate rate", dateOffset: -58, ref: "INV-0798", amount: "Rp 22,200,000", credit: false },
      { desc: "Payment received — bank transfer", dateOffset: -27, ref: "PMT-3391", amount: "− Rp 40,000,000", credit: true },
      { desc: "Invoice INV-2026-0712 — corporate rate", dateOffset: -90, ref: "INV-0712", amount: "Rp 40,000,000", credit: false },
    ],
  },
  {
    account: "TechCorp Inc",
    type: "Travel agent",
    balance: "Rp 41,900,000",
    creditLimit: "Rp 40,000,000",
    a030: "Rp 6,400,000",
    a3160: "Rp 12,500,000",
    a60: "Rp 23,000,000",
    lastPaymentOffset: -72,
    overdue: true,
    transactions: [
      { desc: "Invoice INV-2026-0655 — TA allotment", dateOffset: -126, ref: "INV-0655", amount: "Rp 23,000,000", credit: false },
      { desc: "Invoice INV-2026-0740 — TA allotment", dateOffset: -82, ref: "INV-0740", amount: "Rp 12,500,000", credit: false },
      { desc: "Invoice INV-2026-0820 — TA allotment", dateOffset: -48, ref: "INV-0820", amount: "Rp 6,400,000", credit: false },
      { desc: "Payment received — cheque", dateOffset: -72, ref: "PMT-3120", amount: "− Rp 18,000,000", credit: true },
    ],
  },
  {
    account: "Booking.com settlement",
    type: "OTA settlement",
    balance: "Rp 18,600,000",
    creditLimit: "—",
    a030: "Rp 18,600,000",
    a3160: "Rp 0",
    a60: "Rp 0",
    lastPaymentOffset: -3,
    overdue: false,
    transactions: [
      { desc: "Commission settlement (net)", dateOffset: -7, ref: "OTA-BK", amount: "Rp 18,600,000", credit: false },
      { desc: "Payout received", dateOffset: -3, ref: "PAYOUT-771", amount: "− Rp 41,200,000", credit: true },
    ],
  },
];

function buildAccounts(businessDate: string): Account[] {
  return ACCOUNT_SPECS.map((s) => {
    const { lastPaymentOffset, transactions, ...rest } = s;
    return {
      ...rest,
      lastPayment: fullDate(businessDate, lastPaymentOffset),
      transactions: transactions.map((t) => {
        const { dateOffset, desc, ...tr } = t;
        // append the invoice month back onto invoice descriptions
        const withMonth = /allotment$|rate$|block$/.test(desc)
          ? `${desc} ${monthLabel(businessDate, dateOffset)}`
          : desc;
        return { ...tr, desc: withMonth, date: shortDate(businessDate, dateOffset) };
      }),
    };
  });
}

const GRID =
  "grid grid-cols-[1.4fr_0.9fr_1fr_1fr_0.9fr_0.9fr_0.9fr_1fr] gap-2.5 px-4";

export default function ArLedgerPage() {
  const { activeProperty } = useProperty();
  const toast = useToast();
  const ACCOUNTS = useMemo(
    () => buildAccounts(activeProperty?.businessDate ?? "2026-09-08"),
    [activeProperty?.businessDate]
  );

  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const overdue = ACCOUNTS.filter((a) => a.overdue).length;
  const acc = openIdx !== null ? ACCOUNTS[openIdx] : null;

  return (
    <div className="mx-auto max-w-content">
      {overdue > 0 && (
        <div className="mb-3.5 flex items-center gap-2.5 rounded-lg border border-room-ooo bg-elevated p-3.5">
          <AlertTriangle className="h-[15px] w-[15px] flex-none text-room-ooo" />
          <span className="text-[12.5px]">
            {overdue} account{overdue > 1 ? "s have" : " has"} balances aged past 60 days or over the
            credit limit.
          </span>
        </div>
      )}

      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <select className="rounded-sm border border-line bg-elevated px-2.5 py-2 text-[12.5px] text-fg-2">
          <option>All aging</option>
          <option>0–30 days only</option>
          <option>31–60 days only</option>
          <option>60+ days only</option>
        </select>
        <select className="rounded-sm border border-line bg-elevated px-2.5 py-2 text-[12.5px] text-fg-2">
          <option>All account types</option>
          <option>Corporate</option>
          <option>Travel agent</option>
          <option>OTA settlement</option>
        </select>
        <button
          onClick={() =>
            downloadCsv(
              "ar-ledger.csv",
              ACCOUNTS.map((a) => ({
                account: a.account,
                type: a.type,
                balance: a.balance,
                creditLimit: a.creditLimit,
                aged_0_30: a.a030,
                aged_31_60: a.a3160,
                aged_60_plus: a.a60,
                lastPayment: a.lastPayment,
              }))
            )
          }
          className="ml-auto flex items-center gap-1.5 rounded-sm bg-accent-violet px-3.5 py-2 text-12 font-medium text-ice hover:bg-accent-violet-hi"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <Card className="overflow-x-auto p-0">
        <div className="min-w-[900px]">
          <div className={`${GRID} border-b border-line py-2.5 text-[11px] uppercase tracking-[0.06em] text-fg-3`}>
            <div>Account</div>
            <div>Type</div>
            <div>Balance</div>
            <div>Credit limit</div>
            <div>0–30d</div>
            <div>31–60d</div>
            <div>60d+</div>
            <div>Last payment</div>
          </div>
          {ACCOUNTS.map((a, i) => (
            <button
              key={a.account}
              onClick={() => {
                setOpenIdx(i);
                setPayOpen(false);
              }}
              className={`${GRID} w-full items-center border-b border-line-soft py-3 text-left text-13 transition-colors last:border-0 hover:bg-elevated`}
            >
              <div className="font-semibold">{a.account}</div>
              <div className="text-12 text-fg-3">{a.type}</div>
              <div className="font-mono">{a.balance}</div>
              <div className="font-mono text-fg-3">{a.creditLimit}</div>
              <div className="font-mono text-12">{a.a030}</div>
              <div className="font-mono text-12 text-res-tentative">{a.a3160}</div>
              <div className="font-mono text-12 text-room-ooo">{a.a60}</div>
              <div className="text-12 text-fg-3">{a.lastPayment}</div>
            </button>
          ))}
        </div>
      </Card>

      {acc && (
        <>
          <div onClick={() => setOpenIdx(null)} className="fixed inset-0 z-20 bg-deepest/70 backdrop-blur-[6px]" />
          <div className="upx-scroll fixed right-0 top-0 bottom-0 z-30 flex w-[440px] max-w-[92vw] flex-col gap-4 overflow-y-auto border-l border-line bg-deep p-[22px] shadow-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-17 font-bold text-ice">{acc.account}</div>
                <div className="mt-0.5 text-12 text-fg-3">{acc.type}</div>
              </div>
              <button onClick={() => setOpenIdx(null)} className="text-fg-3 hover:text-ice" aria-label="Close">
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Card className="p-3">
                <div className="text-[11px] text-fg-3">Outstanding balance</div>
                <div className="mt-0.5 font-mono text-16 font-bold">{acc.balance}</div>
              </Card>
              <Card className="p-3">
                <div className="text-[11px] text-fg-3">Credit limit</div>
                <div className="mt-0.5 font-mono text-16 font-bold">{acc.creditLimit}</div>
              </Card>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPayOpen((v) => !v)}
                className="flex-1 rounded-sm bg-accent-violet py-2 text-[12.5px] font-medium text-ice hover:bg-accent-violet-hi"
              >
                Record payment
              </button>
              <button
                onClick={() => toast(`Statement emailed to ${acc.account}`, "success")}
                className="flex-1 rounded-sm border border-line bg-fg-1/[0.06] py-2 text-[12.5px] hover:border-line-strong"
              >
                Send statement
              </button>
            </div>

            {payOpen && (
              <Card className="flex flex-col gap-2 p-3">
                <Eyebrow>Record payment</Eyebrow>
                <input
                  placeholder="Amount (IDR)"
                  className="rounded-sm border border-line bg-deep px-2.5 py-2 font-mono text-[12.5px] text-fg-1 outline-none"
                />
                <select className="rounded-sm border border-line bg-deep px-2.5 py-2 text-[12.5px] text-fg-2">
                  <option>Bank transfer</option>
                  <option>Cash</option>
                  <option>Credit card</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPayOpen(false);
                      toast("Payment recorded against the account", "success");
                    }}
                    className="flex-1 rounded-sm bg-accent-violet py-2 text-12 font-medium text-ice"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setPayOpen(false)}
                    className="flex-1 rounded-sm border border-line bg-fg-1/[0.06] py-2 text-12"
                  >
                    Cancel
                  </button>
                </div>
              </Card>
            )}

            <div className="text-[11px] text-fg-3">
              Credit limit changes require general manager approval before taking effect.
            </div>

            <div>
              <Eyebrow className="mb-2">Transaction history</Eyebrow>
              {acc.transactions.map((tx) => (
                <div
                  key={tx.ref}
                  className="flex justify-between gap-2.5 border-b border-line-soft py-2.5 text-[12.5px]"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="leading-snug">{tx.desc}</div>
                    <div className="text-[11px] text-fg-3">
                      {tx.date} · {tx.ref}
                    </div>
                  </div>
                  <div
                    className="whitespace-nowrap font-mono"
                    style={{ color: tx.credit ? "var(--accent-cyan)" : "var(--fg-1)" }}
                  >
                    {tx.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
