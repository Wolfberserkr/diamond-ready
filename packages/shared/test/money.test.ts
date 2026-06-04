import { describe, expect, it } from "vitest";
import {
  clampFeeRate,
  computeDepositCents,
  computeFee,
  convertUsdCentsToAwgCents,
  DEFAULT_FEE_RATE,
  formatMoney,
  MAX_FEE_RATE,
  MIN_FEE_RATE,
  roundCents,
} from "../src/money.js";

describe("roundCents", () => {
  it("rounds half away from zero", () => {
    expect(roundCents(0.5)).toBe(1);
    expect(roundCents(1.5)).toBe(2);
    expect(roundCents(-0.5)).toBe(-1);
    expect(roundCents(2.49)).toBe(2);
    expect(roundCents(2.5)).toBe(3);
  });

  it("handles non-finite input", () => {
    expect(roundCents(NaN)).toBe(0);
    expect(roundCents(Infinity)).toBe(0);
  });
});

describe("clampFeeRate", () => {
  it("clamps inside the 2–3% band", () => {
    expect(clampFeeRate(0.01)).toBe(MIN_FEE_RATE);
    expect(clampFeeRate(0.05)).toBe(MAX_FEE_RATE);
    expect(clampFeeRate(0.025)).toBe(0.025);
  });

  it("falls back to default on garbage input", () => {
    expect(clampFeeRate(NaN)).toBe(DEFAULT_FEE_RATE);
  });
});

describe("computeDepositCents", () => {
  it("returns the full amount at 100%", () => {
    expect(computeDepositCents({ totalCents: 12_345, depositPct: 100 })).toBe(12_345);
  });

  it("returns zero at 0%", () => {
    expect(computeDepositCents({ totalCents: 12_345, depositPct: 0 })).toBe(0);
  });

  it("rounds the percentage to nearest cent", () => {
    // 33% of $100.00 = $33.00 exactly
    expect(computeDepositCents({ totalCents: 10_000, depositPct: 33 })).toBe(3_300);
    // 33% of $99.99 = 32.9967 -> 33 cents... wait, 0.99 * 33 = 32.67, careful
    // 9999 * 33 / 100 = 3299.67 -> 3300
    expect(computeDepositCents({ totalCents: 9_999, depositPct: 33 })).toBe(3_300);
  });

  it("rejects invalid inputs", () => {
    expect(() => computeDepositCents({ totalCents: -1, depositPct: 50 })).toThrow();
    expect(() => computeDepositCents({ totalCents: 100, depositPct: 101 })).toThrow();
    expect(() => computeDepositCents({ totalCents: 100, depositPct: -1 })).toThrow();
  });
});

describe("computeFee", () => {
  it("computes 2.5% on $100 as $2.50", () => {
    const result = computeFee({ amountPaidCents: 10_000, feeRate: 0.025 });
    expect(result.platformFeeCents).toBe(250);
    expect(result.vendorOwedCents).toBe(9_750);
  });

  it("clamps below-band rates to the 2% floor", () => {
    const result = computeFee({ amountPaidCents: 10_000, feeRate: 0.005 });
    expect(result.platformFeeCents).toBe(200);
    expect(result.vendorOwedCents).toBe(9_800);
  });

  it("clamps above-band rates to the 3% ceiling", () => {
    const result = computeFee({ amountPaidCents: 10_000, feeRate: 0.5 });
    expect(result.platformFeeCents).toBe(300);
    expect(result.vendorOwedCents).toBe(9_700);
  });

  it("conserves total: fee + vendor = paid (no fractional cents lost)", () => {
    // Spot-check a range of awkward amounts.
    const cases = [1_234, 9_999, 17, 4_201, 88_877];
    for (const amount of cases) {
      const { platformFeeCents, vendorOwedCents } = computeFee({
        amountPaidCents: amount,
        feeRate: 0.025,
      });
      expect(platformFeeCents + vendorOwedCents).toBe(amount);
    }
  });

  it("handles zero gracefully", () => {
    expect(computeFee({ amountPaidCents: 0, feeRate: 0.025 })).toEqual({
      platformFeeCents: 0,
      vendorOwedCents: 0,
    });
  });

  it("rejects negative amounts", () => {
    expect(() => computeFee({ amountPaidCents: -1, feeRate: 0.025 })).toThrow();
  });
});

describe("formatMoney", () => {
  it("formats USD in English", () => {
    expect(formatMoney(12_345, "USD", "en")).toMatch(/\$123\.45/);
  });

  it("formats AWG", () => {
    // AWG sign varies by locale, but the digits should appear.
    expect(formatMoney(12_345, "AWG", "en")).toMatch(/123\.45/);
  });

  it("supports Spanish and Dutch", () => {
    expect(formatMoney(12_345, "USD", "es")).toMatch(/123/);
    expect(formatMoney(12_345, "USD", "nl")).toMatch(/123/);
  });
});

describe("convertUsdCentsToAwgCents", () => {
  it("applies the rate", () => {
    // $100.00 at 1.79 = AWG 179.00
    expect(convertUsdCentsToAwgCents(10_000, 1.79)).toBe(17_900);
  });

  it("rejects non-positive rates", () => {
    expect(() => convertUsdCentsToAwgCents(10_000, 0)).toThrow();
    expect(() => convertUsdCentsToAwgCents(10_000, -1)).toThrow();
  });
});
