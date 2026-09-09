import type { Doc } from "./_generated/dataModel";

/**
 * Property tax engine. Drives folio tax postings from the `taxes` rows a
 * property configures (Settings → Taxes & fees) instead of a hard-coded rate.
 *
 * Each tax row: { name, rate ("11%" | "Rp 20,000"), basis, inclusive }.
 *   basis:     "Room + F&B" | "Room only" | "F&B only" | "Per room-night" | "Per stay"
 *   inclusive: "Inclusive"  (rate already baked into the charge)
 *              "Exclusive"  (rate added on top)
 */

export type TaxRow = Pick<
  Doc<"taxes">,
  "name" | "rate" | "basis" | "inclusive"
>;

export interface TaxLine {
  name: string;
  code: string;
  amount: number;
}

const slug = (s: string) =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 12);

function parseRate(rate: string): { kind: "pct" | "fixed"; value: number } {
  const t = rate.trim();
  if (t.endsWith("%")) {
    return { kind: "pct", value: Number(t.replace(/[^\d.]/g, "")) / 100 };
  }
  return { kind: "fixed", value: Number(t.replace(/[^\d.]/g, "")) };
}

function appliesToRoom(basis: string) {
  return basis === "Room + F&B" || basis === "Room only";
}
function appliesToFnb(basis: string) {
  return basis === "Room + F&B" || basis === "F&B only";
}

/**
 * Tax on one night's room charge. `gross` is what the rate model returned.
 * Returns the net room amount to post plus a tax line per applicable tax, so
 * `roomNet + Σ taxLines == ` the guest-facing total for the night.
 */
export function roomNightTaxes(
  taxes: TaxRow[],
  gross: number,
  opts: { firstNight: boolean }
): { roomNet: number; taxLines: TaxLine[] } {
  let roomNet = gross;
  const taxLines: TaxLine[] = [];

  for (const t of taxes) {
    const { kind, value } = parseRate(t.rate);
    const inclusive = t.inclusive.toLowerCase().startsWith("inc");
    let amount = 0;

    if (kind === "pct" && appliesToRoom(t.basis)) {
      amount = inclusive
        ? gross - gross / (1 + value)
        : Math.round(gross * value);
      if (inclusive) roomNet -= amount;
    } else if (kind === "fixed" && t.basis === "Per room-night") {
      amount = value;
    } else if (kind === "fixed" && t.basis === "Per stay" && opts.firstNight) {
      amount = value;
    }

    if (amount > 0) {
      taxLines.push({
        name: t.name,
        code: `TX-${slug(t.name)}`,
        amount: Math.round(amount),
      });
    }
  }

  return { roomNet: Math.round(roomNet), taxLines };
}

/** Tax on an ancillary charge (POS F&B, spa, minibar…). */
export function chargeTaxes(
  taxes: TaxRow[],
  gross: number,
  kind: "fnb" | "service"
): { net: number; taxLines: TaxLine[] } {
  let net = gross;
  const taxLines: TaxLine[] = [];
  for (const t of taxes) {
    if (!appliesToFnb(t.basis)) continue;
    const { kind: rk, value } = parseRate(t.rate);
    if (rk !== "pct") continue;
    const inclusive = t.inclusive.toLowerCase().startsWith("inc");
    const amount = inclusive
      ? gross - gross / (1 + value)
      : Math.round(gross * value);
    if (inclusive) net -= amount;
    if (amount > 0) {
      taxLines.push({
        name: t.name,
        code: `TX-${slug(t.name)}`,
        amount: Math.round(amount),
      });
    }
  }
  void kind;
  return { net: Math.round(net), taxLines };
}

/** Total tax rate on the room base — for quotes / rate display. */
export function roomTaxRate(taxes: TaxRow[]): number {
  return taxes
    .filter((t) => {
      const { kind } = parseRate(t.rate);
      return kind === "pct" && appliesToRoom(t.basis);
    })
    .reduce((s, t) => s + parseRate(t.rate).value, 0);
}
