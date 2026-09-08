export interface Bill {
  id: string;
  vendor: string;
  billNo: string;
  category: string;
  issued: string;
  due: string;
  dueIso: string;
  amount: string;
  amountValue: number;
  status: "Pending approval" | "Approved" | "Paid" | "Overdue";
  notes?: string;
  lineItems: { desc: string; glAccount: string; amount: string }[];
}

type BillSpec = Omit<Bill, "issued" | "due" | "dueIso" | "status"> & {
  issuedOffset: number;
  dueOffset: number;
  baseStatus: Bill["status"];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shiftDay = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};
const fmtDate = (iso: string, n: number) => {
  const d = shiftDay(iso, n);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const isoOf = (iso: string, n: number) => shiftDay(iso, n).toISOString().slice(0, 10);

const BILL_SPECS: BillSpec[] = [
  {
    id: "b1",
    vendor: "PLN (electricity)",
    billNo: "PLN-2026-0904",
    category: "Utilities",
    issuedOffset: -7,
    dueOffset: 7,
    amount: "Rp 12,400,000",
    amountValue: 12_400_000,
    baseStatus: "Approved",
    lineItems: [
      { desc: "Main meter — last month's usage", glAccount: "6100 · Utilities", amount: "Rp 10,900,000" },
      { desc: "Staff housing sub-meter", glAccount: "6100 · Utilities", amount: "Rp 1,500,000" },
    ],
  },
  {
    id: "b2",
    vendor: "Bali Fresh Produce",
    billNo: "BFP-8842",
    category: "F&B supplies",
    issuedOffset: -11,
    dueOffset: 3,
    amount: "Rp 8,900,000",
    amountValue: 8_900_000,
    baseStatus: "Pending approval",
    notes: "Awaiting F&B manager sign-off on the seafood line.",
    lineItems: [
      { desc: "Seafood & fish — weekly", glAccount: "5200 · Food cost", amount: "Rp 5,100,000" },
      { desc: "Vegetables & fruit", glAccount: "5200 · Food cost", amount: "Rp 3,800,000" },
    ],
  },
  {
    id: "b3",
    vendor: "PT Sanitasi Jaya",
    billNo: "SJ-2026-341",
    category: "Maintenance",
    issuedOffset: -19,
    dueOffset: -5,
    amount: "Rp 21,600,000",
    amountValue: 21_600_000,
    baseStatus: "Overdue",
    notes: "Over Rp 20,000,000 — requires GM approval before payment run.",
    lineItems: [
      { desc: "Quarterly plumbing service contract", glAccount: "6300 · Repairs & maintenance", amount: "Rp 18,000,000" },
      { desc: "Emergency shower valve — Room 312", glAccount: "6300 · Repairs & maintenance", amount: "Rp 3,600,000" },
    ],
  },
  {
    id: "b4",
    vendor: "Expedia Group",
    billNo: "EXP-COMM-08",
    category: "OTA commission",
    issuedOffset: -7,
    dueOffset: 12,
    amount: "Rp 15,200,000",
    amountValue: 15_200_000,
    baseStatus: "Paid",
    lineItems: [
      { desc: "Last month's commission — 18% of Rp 84,500,000", glAccount: "6500 · Distribution cost", amount: "Rp 15,200,000" },
    ],
  },
];

/** Bills with issued / due dates and an overdue flag relative to the PMS date. */
export function buildBills(businessDate: string): Bill[] {
  return BILL_SPECS.map((s) => {
    const { issuedOffset, dueOffset, baseStatus, ...rest } = s;
    const dueIso = isoOf(businessDate, dueOffset);
    const status: Bill["status"] =
      baseStatus !== "Paid" && dueIso < businessDate ? "Overdue" : baseStatus;
    return {
      ...rest,
      issued: fmtDate(businessDate, issuedOffset),
      due: fmtDate(businessDate, dueOffset),
      dueIso,
      status,
    };
  });
}

export const STATUS_COLOR: Record<Bill["status"], string> = {
  "Pending approval": "var(--res-tentative)",
  Approved: "var(--accent-cyan)",
  Paid: "var(--fg-3)",
  Overdue: "var(--room-ooo)",
};
