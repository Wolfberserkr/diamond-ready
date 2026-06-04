// POST /bookings-cancel  { bookingId, refund: "none"|"full"|"partial", partialRefundCents? }
// Vendor JWT required. Cancels a booking; if it's already paid, optionally
// refunds. Refund decision rules (24-hour window etc.) are enforced in the
// vendor app UI; this endpoint trusts the caller's directive but still
// validates ownership and current state.

import { preflight } from "../_shared/cors.ts";
import { json, jsonError } from "../_shared/json.ts";
import { getCallerVendorId, serviceClient } from "../_shared/supabase.ts";
import { stripe } from "../_shared/stripe.ts";

interface CancelInput {
  bookingId: string;
  refund?: "none" | "full" | "partial";
  partialRefundCents?: number;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  const origin = req.headers.get("origin");

  if (req.method !== "POST") return jsonError("method_not_allowed", 405, origin);

  const vendorId = await getCallerVendorId(req);
  if (!vendorId) return jsonError("unauthorized", 401, origin);

  let body: CancelInput;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid_json", 400, origin);
  }
  if (!body.bookingId) return jsonError("missing_booking_id", 400, origin);

  const supa = serviceClient();
  const { data: booking } = await supa
    .from("bookings")
    .select("id, vendor_id, status, payment_intent_id, deposit_cents")
    .eq("id", body.bookingId)
    .single();
  if (!booking || booking.vendor_id !== vendorId) {
    return jsonError("not_found", 404, origin);
  }
  if (booking.status === "canceled" || booking.status === "refunded") {
    return json({ ok: true, already: true }, 200, origin);
  }

  // If the booking has been paid and the vendor wants a refund, issue it.
  // The webhook will flip the booking row to refunded on charge.refunded —
  // we don't double-write the status here, the webhook is authoritative.
  const refundMode = body.refund ?? "none";
  if (booking.status === "paid" && refundMode !== "none" && booking.payment_intent_id) {
    try {
      await stripe().refunds.create({
        payment_intent: booking.payment_intent_id,
        amount: refundMode === "partial" ? body.partialRefundCents : undefined,
        reason: "requested_by_customer",
      });
    } catch (e) {
      console.error("refund_failed", e);
      return jsonError("refund_failed", 502, origin);
    }
  }

  // For non-paid bookings, mark canceled directly. For paid+refund cases the
  // webhook will handle the status; we still mark canceled_at so it disappears
  // from the vendor's active list immediately.
  await supa
    .from("bookings")
    .update({
      status: booking.status === "pending" ? "canceled" : booking.status,
      canceled_at: new Date().toISOString(),
    })
    .eq("id", body.bookingId);

  await supa.from("event_log").insert({
    vendor_id: vendorId,
    booking_id: body.bookingId,
    kind: "booking.canceled",
    payload: { refund: refundMode },
  });

  return json({ ok: true }, 200, origin);
});
