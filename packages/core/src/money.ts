/**
 * Money is micro-dollars (integer) everywhere. $1.00 = 1_000_000 mc.
 * These helpers are the ONLY place dollars <-> micro-dollars conversion happens.
 */
export const MICRO_PER_DOLLAR = 1_000_000;

/** Dollars (float, e.g. 29.0) -> micro-dollars (integer). Rounds to nearest mc. */
export function usdToMc(usd: number): number {
  return Math.round(usd * MICRO_PER_DOLLAR);
}

/** Micro-dollars -> dollars (float). For display/formatting only. */
export function mcToUsd(mc: number): number {
  return mc / MICRO_PER_DOLLAR;
}

/** Format micro-dollars as a $X.XX string. */
export function formatUsd(mc: number, opts: { cents?: boolean } = {}): string {
  const dollars = mcToUsd(mc);
  const digits = opts.cents === false ? 0 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(dollars);
}

/** Clamp to >= 0; balances and limits must never go negative. */
export function nonNegative(mc: number): number {
  return mc < 0 ? 0 : mc;
}
