/**
 * The rack-rate primitive. This is the ONLY place base rates, day-of-week and
 * season factors live. It has no dependencies on other Convex modules so both
 * `rates.ts` (which layers dynamic / manual adjustments on top) and every
 * caller can import it without an import cycle.
 *
 * Never re-implement this math anywhere else — call `nightlyRateFor`, or
 * `rates.effectiveNightlyRate` / `rates.quoteStay` for the adjusted / taxed
 * figures.
 */

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
const DEFAULT_BASE = 1_850_000;

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

/** The rack nightly rate for a room type on a given date. */
export function nightlyRateFor(roomType: string, iso: string): number {
  const base = BASE_RATE[roomType] ?? DEFAULT_BASE;
  const dow = new Date(iso + "T00:00:00Z").getUTCDay();
  return Math.round(base * (DOW_MULT[dow] ?? 1) * seasonMult(iso));
}

export const addDaysIso = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const money = (n: number) =>
  `Rp ${Math.round(n).toLocaleString("en-US")}`;
