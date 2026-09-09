/**
 * Transaction codes map every folio line to a revenue category and a GL
 * account, so the night-audit revenue journal and the accounting export can
 * group postings the way finance expects.
 */

export type CodeType = "revenue" | "tax" | "payment" | "adjustment";

export interface TxCode {
  label: string;
  category: string;
  gl: string; // GL account number
  type: CodeType;
}

export const TRANSACTION_CODES: Record<string, TxCode> = {
  RM: { label: "Room revenue", category: "Room", gl: "4000", type: "revenue" },
  FB: { label: "Food & beverage", category: "Food & Beverage", gl: "4100", type: "revenue" },
  SV: { label: "Service / other", category: "Other revenue", gl: "4200", type: "revenue" },

  "TX-GOV": { label: "Government tax", category: "Government tax", gl: "2100", type: "tax" },
  "TX-SVC": { label: "Service charge", category: "Service charge", gl: "2110", type: "tax" },
  "TX-CITY": { label: "City / tourism levy", category: "City levy", gl: "2120", type: "tax" },
  "TX-OTH": { label: "Other tax", category: "Other tax", gl: "2190", type: "tax" },

  "PAY-CASH": { label: "Cash", category: "Cash", gl: "1000", type: "payment" },
  "PAY-CARD": { label: "Card", category: "Card", gl: "1010", type: "payment" },
  "PAY-QRIS": { label: "QRIS / e-wallet", category: "QRIS / e-wallet", gl: "1020", type: "payment" },
  "PAY-XFER": { label: "Bank transfer", category: "Bank transfer", gl: "1030", type: "payment" },
  "PAY-LEDGER": { label: "City ledger", category: "City ledger", gl: "1200", type: "payment" },
  "PAY-VOUCHER": { label: "Voucher / gift card", category: "Voucher", gl: "1040", type: "payment" },
  "PAY-OTH": { label: "Other payment", category: "Other payment", gl: "1090", type: "payment" },

  ADJ: { label: "Adjustment", category: "Adjustment", gl: "4900", type: "adjustment" },
};

const FALLBACK: TxCode = {
  label: "Unclassified",
  category: "Unclassified",
  gl: "9999",
  type: "adjustment",
};

export function lookupCode(code: string | undefined): TxCode {
  if (!code) return FALLBACK;
  return TRANSACTION_CODES[code] ?? FALLBACK;
}

/** Stable code for a configured tax, from its name. */
export function codeForTax(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("government") || n.includes("gov") || n.includes("ppn") || n.includes("vat"))
    return "TX-GOV";
  if (n.includes("service")) return "TX-SVC";
  if (n.includes("city") || n.includes("tourism") || n.includes("levy") || n.includes("occupancy"))
    return "TX-CITY";
  return "TX-OTH";
}

/** Stable code for a payment method label. */
export function codeForPayment(method: string): string {
  const m = method.toLowerCase();
  if (m.includes("cash")) return "PAY-CASH";
  if (m.includes("card") || m.includes("credit") || m.includes("debit")) return "PAY-CARD";
  if (m.includes("qris") || m.includes("wallet") || m.includes("e-wal")) return "PAY-QRIS";
  if (m.includes("transfer") || m.includes("bank")) return "PAY-XFER";
  if (m.includes("ledger")) return "PAY-LEDGER";
  if (m.includes("voucher") || m.includes("gift")) return "PAY-VOUCHER";
  return "PAY-OTH";
}

/** Default code for a line that predates transaction codes, from its kind. */
export function codeForKind(kind: string): string {
  switch (kind) {
    case "room":
      return "RM";
    case "fnb":
      return "FB";
    case "service":
      return "SV";
    case "tax":
      return "TX-OTH";
    case "payment":
      return "PAY-OTH";
    default:
      return "ADJ";
  }
}
