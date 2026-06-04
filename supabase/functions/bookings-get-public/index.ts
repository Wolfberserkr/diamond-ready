// GET /bookings-get-public?code=ABCDEF
// No auth. Tourists don't sign in. Returns a sanitized projection plus the
// Stripe client secret (only if the booking is still payable). Vendor financial
// details, fee math, and internal IDs are never exposed.

import { preflight } from "../_shared/cors.ts";
import { json, jsonError } from "../_shared/json.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { stripe } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  const origin = req.headers.get("origin");

  if (req.method !== "GET") return jsonError("method_not_allowed", 405, origin);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code || !/^[2-9A-HJ-NP-TV-Z]{6}$/.test(code)) {
    return jsonError("invalid_code", 400, origin);
  }

  const supa = serviceClient();
  const { data: booking, error } = await supa
    .from("bookings")
    .select(
      `
      short_code,
      status,
      service_name,
      scheduled_at,
      party_size,
      total_cents,
      deposit_cents,
      currency,
      language,
      payment_intent_id,
      vendor:vendors!inner(business_name, whatsapp_e164, logo_url)
    `,
    )
    .eq("short_code", code)
    .maybeSingle();

  if (error) {
    console.error("public_booking_lookup_failed", error);
    return jsonError("lookup_failed", 500, origin);
  }
  if (!booking) return jsonError("not_found", 404, origin);

  let clientSecret: string | null = null;
  if (booking.status === "pending" && booking.payment_intent_id) {
    try {
      const pi = await stripe().paymentIntents.retrieve(booking.payment_intent_id);
      // Only hand back a secret if the PI is still in a payable state.
      if (["requires_payment_method", "requires_confirmation", "requires_action"].includes(pi.status)) {
        clientSecret = pi.client_secret;
      }
    } catch (e) {
      console.error("stripe_pi_retrieve_failed", e);
    }
  }

  const vendor = Array.isArray(booking.vendor) ? booking.vendor[0] : booking.vendor;
  return json(
    {
      shortCode: booking.short_code,
      status: booking.status,
      vendor: {
        businessName: vendor.business_name,
        whatsappE164: vendor.whatsapp_e164,
        logoUrl: vendor.logo_url ?? null,
      },
      serviceName: booking.service_name,
      scheduledAt: booking.scheduled_at,
      partySize: booking.party_size,
      totalCents: booking.total_cents,
      depositCents: booking.deposit_cents,
      currency: booking.currency,
      lang: booking.language,
      stripeClientSecret: clientSecret,
    },
    200,
    origin,
  );
});
