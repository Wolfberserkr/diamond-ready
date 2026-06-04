// Money math. All amounts are integer cents to avoid float drift.
// The platform fee is the single source of truth — vendor app preview,
// Edge Function computation, and ops payout CSV all import from here.

export type Currency = "USD" | "AWG";

export const SUPPORTED_CURRENCIES: readonly Currency[] = ["USD", "AWG"] as const;

// Per-vendor fee rate. Default 2.5%, bounded 2.0–3.0% to match the pricing brief.
export const DEFAULT_FEE_RATE = 0.025;
export const MIN_FEE_RATE = 0.02;
export const MAX_FEE_RATE = 0.03;

export function clampFeeRate(rate: number): number {
  if (!Number.isFinite(rate)) return DEFAULT_FEE_RATE;
  return Math.min(MAX_FEE_RATE, Math.max(MIN_FEE_RATE, rate));
}

// Round-half-away-from-zero, the convention Stripe applies.
export function roundCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value >= 0 ? Math.floor(value + 0.5) : -Math.floor(-value + 0.5);
}

export interface DepositInput {
  totalCents: number;
  depositPct: number; // 0..100, inclusive
}

// Compute the up-front charge the tourist pays. depositPct=100 means full payment.
export function computeDepositCents({ totalCents, depositPct }: DepositInput): number {
  if (totalCents < 0) throw new RangeError("totalCents must be >= 0");
  if (depositPct < 0 || depositPct > 100) {
    throw new RangeError("depositPct must be between 0 and 100");
  }
  if (depositPct === 100) return totalCents;
  return roundCents((totalCents * depositPct) / 100);
}

export interface FeeInput {
  amountPaidCents: number; // what the tourist actually paid (deposit or full)
  feeRate: number; // per-vendor fee rate
}

export interface FeeResult {
  platformFeeCents: number;
  vendorOwedCents: number;
}

export function computeFee({ amountPaidCents, feeRate }: FeeInput): FeeResult {
  if (amountPaidCents < 0) throw new RangeError("amountPaidCents must be >= 0");
  const rate = clampFeeRate(feeRate);
  const platformFeeCents = roundCents(amountPaidCents * rate);
  return {
    platformFeeCents,
    vendorOwedCents: amountPaidCents - platformFeeCents,
  };
}

// Display formatting. Currency conversion is display-only — we always charge in USD,
// and the AWG number shown to the vendor at payout time uses the rate captured on the run.
const FORMAT_LOCALE: Record<string, string> = {
  en: "en-US",
  es: "es-419",
  nl: "nl-NL",
};

export function formatMoney(cents: number, currency: Currency, lang = "en"): string {
  const locale = FORMAT_LOCALE[lang] ?? "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

// Apply a captured FX rate at payout time. rate = AWG per 1 USD (e.g. 1.79).
export function convertUsdCentsToAwgCents(usdCents: number, awgPerUsd: number): number {
  if (awgPerUsd <= 0) throw new RangeError("awgPerUsd must be > 0");
  return roundCents(usdCents * awgPerUsd);
}
