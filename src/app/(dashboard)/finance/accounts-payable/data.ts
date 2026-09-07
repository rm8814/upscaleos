export interface Bill {
  id: string;
  vendor: string;
  billNo: string;
  category: string;
  issued: string;
  due: string;
  amount: string;
  amountValue: number;
  status: "Pending approval" | "Approved" | "Paid" | "Overdue";
  notes?: string;
  lineItems: { desc: string; glAccount: string; amount: string }[];
}

export const BILLS: Bill[] = [
  {
    id: "b1",
    vendor: "PLN (electricity)",
    billNo: "PLN-2026-0904",
    category: "Utilities",
    issued: "01 Sep 2026",
    due: "15 Sep 2026",
    amount: "Rp 12.400.000",
    amountValue: 12_400_000,
    status: "Approved",
    lineItems: [
      { desc: "Main meter — August usage", glAccount: "6100 · Utilities", amount: "Rp 10.900.000" },
      { desc: "Staff housing sub-meter", glAccount: "6100 · Utilities", amount: "Rp 1.500.000" },
    ],
  },
  {
    id: "b2",
    vendor: "Bali Fresh Produce",
    billNo: "BFP-8842",
    category: "F&B supplies",
    issued: "28 Aug 2026",
    due: "11 Sep 2026",
    amount: "Rp 8.900.000",
    amountValue: 8_900_000,
    status: "Pending approval",
    notes: "Awaiting F&B manager sign-off on the seafood line.",
    lineItems: [
      { desc: "Seafood & fish — weekly", glAccount: "5200 · Food cost", amount: "Rp 5.100.000" },
      { desc: "Vegetables & fruit", glAccount: "5200 · Food cost", amount: "Rp 3.800.000" },
    ],
  },
  {
    id: "b3",
    vendor: "PT Sanitasi Jaya",
    billNo: "SJ-2026-341",
    category: "Maintenance",
    issued: "20 Aug 2026",
    due: "03 Sep 2026",
    amount: "Rp 21.600.000",
    amountValue: 21_600_000,
    status: "Overdue",
    notes: "Over Rp 20.000.000 — requires GM approval before payment run.",
    lineItems: [
      { desc: "Quarterly plumbing service contract", glAccount: "6300 · Repairs & maintenance", amount: "Rp 18.000.000" },
      { desc: "Emergency shower valve — Room 312", glAccount: "6300 · Repairs & maintenance", amount: "Rp 3.600.000" },
    ],
  },
  {
    id: "b4",
    vendor: "Expedia Group",
    billNo: "EXP-COMM-08",
    category: "OTA commission",
    issued: "01 Sep 2026",
    due: "20 Sep 2026",
    amount: "Rp 15.200.000",
    amountValue: 15_200_000,
    status: "Paid",
    lineItems: [
      { desc: "August commission — 18% of Rp 84.5jt", glAccount: "6500 · Distribution cost", amount: "Rp 15.200.000" },
    ],
  },
];

export const STATUS_COLOR: Record<Bill["status"], string> = {
  "Pending approval": "var(--res-tentative)",
  Approved: "var(--accent-cyan)",
  Paid: "var(--fg-3)",
  Overdue: "var(--room-ooo)",
};
