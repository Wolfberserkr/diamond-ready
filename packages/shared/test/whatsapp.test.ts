import { describe, expect, it } from "vitest";
import {
  buildVendorChatUrl,
  buildWhatsAppMessage,
  buildWhatsAppShareUrl,
} from "../src/whatsapp.js";

const baseInput = {
  vendorName: "Pelican Sails",
  serviceName: "Sunset Snorkel",
  scheduledAt: new Date("2026-11-15T22:00:00Z"),
  partySize: 4,
  totalCents: 24_000,
  depositCents: 6_000,
  currency: "USD" as const,
  bookingUrl: "https://book.example.com/b/ABCDEF",
};

describe("buildWhatsAppMessage", () => {
  it("renders an English message with all fields", () => {
    const msg = buildWhatsAppMessage({ ...baseInput, lang: "en" });
    expect(msg).toContain("Pelican Sails");
    expect(msg).toContain("Sunset Snorkel");
    expect(msg).toContain("https://book.example.com/b/ABCDEF");
    expect(msg).toContain("$240.00");
    expect(msg).toContain("$60.00");
    expect(msg).toContain("Party size: 4");
  });

  it("renders Spanish with es-419 currency and date", () => {
    const msg = buildWhatsAppMessage({ ...baseInput, lang: "es" });
    expect(msg).toContain("¡Hola!");
    expect(msg).toContain("Personas: 4");
  });

  it("renders Dutch", () => {
    const msg = buildWhatsAppMessage({ ...baseInput, lang: "nl" });
    expect(msg).toContain("Hoi!");
    expect(msg).toContain("Aantal personen: 4");
  });

  it("omits the deposit line when deposit equals total", () => {
    const msg = buildWhatsAppMessage({
      ...baseInput,
      depositCents: baseInput.totalCents,
      lang: "en",
    });
    expect(msg).not.toMatch(/Deposit due now/i);
  });

  it("omits the deposit line when deposit is zero", () => {
    const msg = buildWhatsAppMessage({ ...baseInput, depositCents: 0, lang: "en" });
    expect(msg).not.toMatch(/Deposit due now/i);
  });
});

describe("buildWhatsAppShareUrl", () => {
  it("URL-encodes the message and strips non-digits from the phone", () => {
    const url = buildWhatsAppShareUrl({
      toPhoneE164: "+297 555 1234",
      message: "Hi 👋 here is your link",
    });
    expect(url).toBe(
      "https://wa.me/2975551234?text=Hi%20%F0%9F%91%8B%20here%20is%20your%20link",
    );
  });

  it("falls back to the chooser when no phone given", () => {
    const url = buildWhatsAppShareUrl({ message: "test" });
    expect(url).toBe("https://wa.me/?text=test");
  });
});

describe("buildVendorChatUrl", () => {
  it("returns a wa.me link with digits only", () => {
    expect(buildVendorChatUrl("+297-555-1234")).toBe("https://wa.me/2975551234");
  });
});
