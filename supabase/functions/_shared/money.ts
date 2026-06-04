// Money math for Edge Functions (Deno runtime).
// Mirrors packages/shared/src/money.ts — keep in sync.
// Unit tests for the canonical version live in packages/shared/test/money.test.ts.

export type Currency = "USD" | "AWG";

export const DEFAULT_FEE_RATE = 0.025;
export const MIN_FEE_RATE = 0.02;
export const MAX_FEE_RATE = 0.03;

export function clampFeeRate(rate: number): number {
  if (!Number.isFinite(rate)) return DEFAULT_FEE_RATE;
  return Math.min(MAX_FEE_RATE, Math.max(MIN_FEE_RATE, rate));
}

export function roundCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value >= 0 ? Math.floor(value + 0.5) : -Math.floor(-value + 0.5);
}

export function computeDepositCents(totalCents: number, depositPct: number): number {
  if (depositPct === 100) return totalCents;
  return roundCents((totalCents * depositPct) / 100);
}

export function computeFeeCents(amountPaidCents: number, feeRate: number): number {
  return roundCents(amountPaidCents * clampFeeRate(feeRate));
}
