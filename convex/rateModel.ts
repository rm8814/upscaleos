/**
 * The rack-rate primitive: day-of-week and season factors applied to a base
 * rate. The pricing *curve* (DOW / season) lives here; per-type base rates
 * now live in the `room_types` table and are loaded via
 * `rates.loadBaseRates`. This module still has no Convex-module deps so it
 * stays import-cycle-safe.
 *
 * Never re-implement this math anywhere else — call `nightlyRateForBase`
 * (with a base from loadBaseRates), or `rates.effectiveNightlyRate` /
 * `rates.quoteStay` for the adjusted / taxed figures.
 */

// Fallback list + base rates, used only when a property has no room_types
// rows yet (fresh install before Room setup is used).
export const ROOM_TYPES = [
  "Deluxe Twin",
  "Double Queen",
  "King Suite",
  "Presidential Suite",
] as const;

export const BASE_RATE: Record<string, number> = {
  "Deluxe Twin": 1_450_000,
  "Double Queen": 1_850_000,
  "King Suite": 2_600_000,
  "Presidential Suite": 6_900_000,
};
export const DEFAULT_BASE = 1_850_000;

// Sun..Sat multipliers.
export const DOW_MULT = [0.9, 0.92, 0.95, 1.0, 1.08, 1.25, 1.3];

/** Season factor for a stay date. */
export function seasonMult(iso: string): number {
  const [, mStr, dStr] = iso.split("-");
  const m = Number(mStr);
  const d = Number(dStr);
  if ((m === 12 && d >= 20) || (m === 1 && d <= 5)) return 1.35; // peak
  if (m >= 7 && m <= 9) return 1.15; // high
  if (m === 2 || m === 3) return 0.85; // low
  if (m >= 4 && m <= 6) return 1.0; // shoulder
  return 1.05; // shoulder+
}

/** Rack nightly rate from an explicit base rate. */
export function nightlyRateForBase(base: number, iso: string): number {
  const dow = new Date(iso + "T00:00:00Z").getUTCDay();
  return Math.round(base * (DOW_MULT[dow] ?? 1) * seasonMult(iso));
}

/** Back-compat: rack rate keyed by the fallback BASE_RATE table. */
export function nightlyRateFor(roomType: string, iso: string): number {
  return nightlyRateForBase(BASE_RATE[roomType] ?? DEFAULT_BASE, iso);
}

export const addDaysIso = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const money = (n: number) =>
  `Rp ${Math.round(n).toLocaleString("en-US")}`;
