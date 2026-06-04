// Zod schemas — the shared contract between vendor app, Edge Functions, and ops app.
// Anything that crosses a process boundary gets validated through here.

import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "./money.js";
import { SUPPORTED_LANGS } from "./i18n.js";
import { SHORT_CODE_REGEX } from "./short-code.js";

export const CurrencySchema = z.enum(
  SUPPORTED_CURRENCIES as unknown as [string, ...string[]],
);
export const LangSchema = z.enum(SUPPORTED_LANGS as unknown as [string, ...string[]]);

export const VendorCategorySchema = z.enum([
  "boat",
  "jeep",
  "dive",
  "guide",
  "snorkel",
  "other",
]);

export const ShortCodeSchema = z.string().regex(SHORT_CODE_REGEX);

// E.164: leading +, 8–15 digits. Strict enough to catch typos at the form boundary.
export const PhoneE164Schema = z.string().regex(/^\+[1-9]\d{7,14}$/);

export const BookingStatusSchema = z.enum([
  "pending",
  "paid",
  "completed",
  "canceled",
  "refunded",
  "expired",
]);

export const CreateBookingRequestSchema = z.object({
  serviceId: z.string().uuid().nullable(),
  // Used when serviceId is null (ad-hoc booking) — the vendor types a name on the fly.
  serviceNameOverride: z.string().min(1).max(120).optional(),
  touristName: z.string().min(1).max(120),
  touristPhoneE164: PhoneE164Schema.optional(),
  scheduledAt: z.string().datetime(), // ISO 8601
  partySize: z.number().int().min(1).max(50),
  totalCents: z.number().int().min(100).max(10_000_000), // $1 floor, $100k ceiling
  depositPct: z.number().int().min(0).max(100),
  currency: CurrencySchema,
  lang: LangSchema,
  notes: z.string().max(500).optional(),
});
export type CreateBookingRequest = z.infer<typeof CreateBookingRequestSchema>;

export const CreateBookingResponseSchema = z.object({
  bookingId: z.string().uuid(),
  shortCode: ShortCodeSchema,
  bookingUrl: z.string().url(),
  whatsappMessage: z.string(),
  whatsappShareUrl: z.string().url(),
  depositCents: z.number().int().min(0),
});
export type CreateBookingResponse = z.infer<typeof CreateBookingResponseSchema>;

// Public projection — what the tourist's booking page sees. Deliberately
// excludes vendor financial details, internal IDs, fee math.
export const PublicBookingSchema = z.object({
  shortCode: ShortCodeSchema,
  status: BookingStatusSchema,
  vendor: z.object({
    businessName: z.string(),
    whatsappE164: PhoneE164Schema,
    logoUrl: z.string().url().nullable(),
  }),
  serviceName: z.string(),
  scheduledAt: z.string().datetime(),
  partySize: z.number().int(),
  totalCents: z.number().int(),
  depositCents: z.number().int(),
  currency: CurrencySchema,
  lang: LangSchema,
  // Provided only when the booking is still payable. Null otherwise.
  stripeClientSecret: z.string().nullable(),
});
export type PublicBooking = z.infer<typeof PublicBookingSchema>;

export const CancelBookingRequestSchema = z.object({
  bookingId: z.string().uuid(),
  refund: z.enum(["none", "full", "partial"]).default("none"),
  partialRefundCents: z.number().int().min(0).optional(),
});
export type CancelBookingRequest = z.infer<typeof CancelBookingRequestSchema>;
