import { describe, expect, it } from "vitest";
import {
  CreateBookingRequestSchema,
  PhoneE164Schema,
  ShortCodeSchema,
} from "../src/schemas.js";

describe("PhoneE164Schema", () => {
  it("accepts well-formed E.164", () => {
    expect(PhoneE164Schema.safeParse("+2975551234").success).toBe(true);
    expect(PhoneE164Schema.safeParse("+15555550123").success).toBe(true);
  });

  it("rejects missing + or non-digits", () => {
    expect(PhoneE164Schema.safeParse("2975551234").success).toBe(false);
    expect(PhoneE164Schema.safeParse("+297 555 1234").success).toBe(false);
    expect(PhoneE164Schema.safeParse("+0975551234").success).toBe(false); // leading 0
  });
});

describe("ShortCodeSchema", () => {
  it("accepts a Crockford-base32 6-char code", () => {
    expect(ShortCodeSchema.safeParse("ABCDEF").success).toBe(true);
  });

  it("rejects lowercase and forbidden chars", () => {
    expect(ShortCodeSchema.safeParse("abcdef").success).toBe(false);
    expect(ShortCodeSchema.safeParse("ABCDE0").success).toBe(false);
  });
});

describe("CreateBookingRequestSchema", () => {
  const valid = {
    serviceId: "11111111-1111-1111-1111-111111111111",
    touristName: "Maria",
    touristPhoneE164: "+15555550123",
    scheduledAt: "2026-11-15T22:00:00.000Z",
    partySize: 4,
    totalCents: 24_000,
    depositCents: 6_000,
    depositPct: 25,
    currency: "USD",
    lang: "en",
  };

  it("accepts a valid request", () => {
    expect(CreateBookingRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects deposit pct outside 0..100", () => {
    expect(
      CreateBookingRequestSchema.safeParse({ ...valid, depositPct: 101 }).success,
    ).toBe(false);
    expect(
      CreateBookingRequestSchema.safeParse({ ...valid, depositPct: -1 }).success,
    ).toBe(false);
  });

  it("rejects sub-$1 totals", () => {
    expect(
      CreateBookingRequestSchema.safeParse({ ...valid, totalCents: 99 }).success,
    ).toBe(false);
  });

  it("rejects oversized party", () => {
    expect(
      CreateBookingRequestSchema.safeParse({ ...valid, partySize: 51 }).success,
    ).toBe(false);
  });

  it("allows ad-hoc bookings with no serviceId", () => {
    const result = CreateBookingRequestSchema.safeParse({
      ...valid,
      serviceId: null,
      serviceNameOverride: "Sunset Charter",
    });
    expect(result.success).toBe(true);
  });
});
