// POST /stripe-webhook
// No auth. Verified by signature.
// Idempotent on stripe_event_id. State transitions are guarded by current
// booking.status so out-of-order or replayed events can't corrupt the row.

import { serviceClient } from "../_shared/supabase.ts";
import { stripe } from "../_shared/stripe.ts";
import { computeFeeCents } from "../_shared/money.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });

  const sig = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!sig || !secret) return new Response("missing_signature", { status: 400 });

  const raw = await req.text();
  let event;
  try {
    event = await stripe().webhooks.constructEventAsync(raw, sig, secret);
  } catch (e) {
    console.error("webhook_signature_invalid", e);
    return new Response("invalid_signature", { status: 400 });
  }

  const supa = serviceClient();

  // Idempotency: if we've already seen this event id, return 200 immediately.
  const { data: existing } = await supa
    .from("payments")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();
  if (existing) return new Response("ok_dup", { status: 200 });

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handleSucceeded(supa, event);
        break;
      case "charge.refunded":
        await handleRefunded(supa, event);
        break;
      case "payment_intent.payment_failed":
        await handleFailed(supa, event);
        break;
      default:
        // Not interesting — record and acknowledge.
        await supa.from("event_log").insert({
          kind: `stripe.${event.type}`,
          payload: { event_id: event.id },
        });
    }
  } catch (e) {
    console.error("webhook_handler_failed", event.type, e);
    return new Response("handler_failed", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});

// deno-lint-ignore no-explicit-any
async function handleSucceeded(supa: any, event: any) {
  const pi = event.data.object;
  const bookingId = pi.metadata?.booking_id;
  if (!bookingId) return;

  const { data: booking } = await supa
    .from("bookings")
    .select("id, status, deposit_cents, vendor_id, vendors:vendors!inner(fee_bps)")
    .eq("id", bookingId)
    .single();
  if (!booking) return;

  // Idempotent state guard — only transition pending -> paid.
  if (booking.status !== "pending") {
    await supa.from("payments").insert({
      booking_id: bookingId,
      stripe_event_id: event.id,
      stripe_pi_id: pi.id,
      stripe_charge_id: pi.latest_charge,
      amount_cents: pi.amount_received,
      currency: pi.currency.toUpperCase(),
      status: "succeeded",
      raw_event: event,
    });
    return;
  }

  const feeBps = booking.vendors?.fee_bps ?? 250;
  const feeCents = computeFeeCents(pi.amount_received, feeBps / 10000);
  const vendorOwedCents = pi.amount_received - feeCents;

  await supa
    .from("bookings")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      platform_fee_cents: feeCents,
      vendor_owed_cents: vendorOwedCents,
    })
    .eq("id", bookingId)
    .eq("status", "pending"); // optimistic guard

  await supa.from("payments").insert({
    booking_id: bookingId,
    stripe_event_id: event.id,
    stripe_pi_id: pi.id,
    stripe_charge_id: pi.latest_charge,
    amount_cents: pi.amount_received,
    currency: pi.currency.toUpperCase(),
    status: "succeeded",
    raw_event: event,
  });

  await supa.from("event_log").insert({
    vendor_id: booking.vendor_id,
    booking_id: bookingId,
    kind: "booking.paid",
    payload: { amount_cents: pi.amount_received },
  });
}

// deno-lint-ignore no-explicit-any
async function handleRefunded(supa: any, event: any) {
  const charge = event.data.object;
  const piId = charge.payment_intent;
  if (!piId) return;

  const { data: booking } = await supa
    .from("bookings")
    .select("id, status, vendor_id, deposit_cents")
    .eq("payment_intent_id", piId)
    .single();
  if (!booking) return;

  const fullyRefunded = charge.amount_refunded >= charge.amount;
  const newStatus = fullyRefunded ? "refunded" : booking.status;

  await supa
    .from("bookings")
    .update({
      status: newStatus,
      vendor_owed_cents: fullyRefunded ? 0 : undefined,
      platform_fee_cents: fullyRefunded ? 0 : undefined,
    })
    .eq("id", booking.id);

  await supa.from("payments").insert({
    booking_id: booking.id,
    stripe_event_id: event.id,
    stripe_pi_id: piId,
    stripe_charge_id: charge.id,
    amount_cents: charge.amount,
    refunded_cents: charge.amount_refunded,
    currency: charge.currency.toUpperCase(),
    status: fullyRefunded ? "refunded" : "partial_refund",
    raw_event: event,
  });

  await supa.from("event_log").insert({
    vendor_id: booking.vendor_id,
    booking_id: booking.id,
    kind: "booking.refunded",
    payload: { amount_cents: charge.amount_refunded, full: fullyRefunded },
  });
}

// deno-lint-ignore no-explicit-any
async function handleFailed(supa: any, event: any) {
  const pi = event.data.object;
  const bookingId = pi.metadata?.booking_id;
  await supa.from("payments").insert({
    booking_id: bookingId,
    stripe_event_id: event.id,
    stripe_pi_id: pi.id,
    amount_cents: pi.amount,
    currency: pi.currency.toUpperCase(),
    status: "failed",
    raw_event: event,
  });
}
