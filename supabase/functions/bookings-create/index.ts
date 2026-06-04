// POST /bookings-create
// Auth: vendor JWT required.
// Creates a booking + Stripe PaymentIntent + short link.
// Idempotency: retries on the same short_code unique constraint by regenerating.
// The pre-formatted WhatsApp message is built server-side so what the vendor
// previews in the app matches what the tourist receives byte-for-byte.

import { preflight } from "../_shared/cors.ts";
import { json, jsonError } from "../_shared/json.ts";
import { getCallerVendorId, serviceClient } from "../_shared/supabase.ts";
import { stripe } from "../_shared/stripe.ts";
import { computeDepositCents } from "../_shared/money.ts";
import { generateShortCode } from "../_shared/short-code.ts";
import {
  buildWhatsAppMessage,
  buildWhatsAppShareUrl,
  type Currency,
  type Lang,
} from "../_shared/whatsapp.ts";

interface CreateBookingInput {
  serviceId: string | null;
  serviceNameOverride?: string;
  touristName: string;
  touristPhoneE164?: string;
  scheduledAt: string;
  partySize: number;
  totalCents: number;
  depositPct: number;
  currency: Currency;
  lang: Lang;
  notes?: string;
}

function bookingUrl(shortCode: string): string {
  const base = Deno.env.get("BOOKING_WEB_BASE_URL") ?? "https://book.example.com";
  return `${base.replace(/\/$/, "")}/b/${shortCode}`;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  const origin = req.headers.get("origin");

  if (req.method !== "POST") return jsonError("method_not_allowed", 405, origin);

  const vendorId = await getCallerVendorId(req);
  if (!vendorId) return jsonError("unauthorized", 401, origin);

  let body: CreateBookingInput;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid_json", 400, origin);
  }

  // Surface-level validation. The vendor app validates with Zod; this is
  // a defense in depth — never trust the client.
  if (
    !body.touristName ||
    !body.scheduledAt ||
    typeof body.partySize !== "number" ||
    typeof body.totalCents !== "number" ||
    typeof body.depositPct !== "number" ||
    body.totalCents < 100 ||
    body.partySize < 1 ||
    body.depositPct < 0 ||
    body.depositPct > 100
  ) {
    return jsonError("invalid_input", 400, origin);
  }

  const supa = serviceClient();

  // Look up vendor (display name, fee rate, etc.).
  const { data: vendor, error: vendorErr } = await supa
    .from("vendors")
    .select("id, business_name, whatsapp_e164, fee_bps, is_active")
    .eq("id", vendorId)
    .single();
  if (vendorErr || !vendor) return jsonError("vendor_not_found", 404, origin);
  if (!vendor.is_active) return jsonError("vendor_inactive", 403, origin);

  // Resolve service name. Either snapshot from services row or use override.
  let serviceName = body.serviceNameOverride?.trim() ?? "";
  if (body.serviceId) {
    const { data: svc } = await supa
      .from("services")
      .select("name, vendor_id")
      .eq("id", body.serviceId)
      .single();
    if (!svc || svc.vendor_id !== vendorId) {
      return jsonError("service_not_found", 404, origin);
    }
    serviceName = svc.name;
  }
  if (!serviceName) return jsonError("service_required", 400, origin);

  const depositCents = computeDepositCents(body.totalCents, body.depositPct);
  if (depositCents < 100) {
    // Stripe minimum is around $0.50–$1 depending on currency. Reject sub-$1 charges.
    return jsonError("deposit_below_minimum", 400, origin);
  }

  // Insert with retry on short_code collision (~1-in-729M, but we still handle it).
  let shortCode = "";
  let bookingId = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    shortCode = generateShortCode();
    const { data, error } = await supa
      .from("bookings")
      .insert({
        vendor_id: vendorId,
        service_id: body.serviceId,
        service_name: serviceName,
        short_code: shortCode,
        tourist_name: body.touristName,
        tourist_phone_e164: body.touristPhoneE164 ?? null,
        scheduled_at: body.scheduledAt,
        party_size: body.partySize,
        total_cents: body.totalCents,
        deposit_cents: depositCents,
        currency: body.currency,
        language: body.lang,
        notes: body.notes ?? null,
      })
      .select("id")
      .single();
    if (data) {
      bookingId = data.id;
      break;
    }
    if (error?.code !== "23505") {
      // not a unique violation — propagate
      console.error("booking_insert_failed", error);
      return jsonError("insert_failed", 500, origin);
    }
  }
  if (!bookingId) return jsonError("short_code_exhausted", 500, origin);

  // Stripe PaymentIntent. We capture immediately on payment confirmation; the
  // platform fee is computed and locked at booking-complete time, not here.
  let paymentIntent;
  try {
    paymentIntent = await stripe().paymentIntents.create(
      {
        amount: depositCents,
        currency: body.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: {
          booking_id: bookingId,
          vendor_id: vendorId,
          short_code: shortCode,
        },
        description: `${vendor.business_name} — ${serviceName}`,
      },
      // Idempotency key prevents duplicate PIs if this function retries.
      { idempotencyKey: `booking_${bookingId}` },
    );
  } catch (e) {
    console.error("stripe_pi_create_failed", e);
    return jsonError("payment_init_failed", 502, origin);
  }

  await supa
    .from("bookings")
    .update({ payment_intent_id: paymentIntent.id })
    .eq("id", bookingId);

  await supa.from("event_log").insert({
    vendor_id: vendorId,
    booking_id: bookingId,
    kind: "booking.created",
    payload: { short_code: shortCode, deposit_cents: depositCents },
  });

  const url = bookingUrl(shortCode);
  const message = buildWhatsAppMessage({
    vendorName: vendor.business_name,
    serviceName,
    scheduledAt: new Date(body.scheduledAt),
    partySize: body.partySize,
    totalCents: body.totalCents,
    depositCents,
    currency: body.currency,
    bookingUrl: url,
    lang: body.lang,
  });
  const shareUrl = buildWhatsAppShareUrl(body.touristPhoneE164, message);

  return json(
    {
      bookingId,
      shortCode,
      bookingUrl: url,
      whatsappMessage: message,
      whatsappShareUrl: shareUrl,
      depositCents,
    },
    200,
    origin,
  );
});
