// POST /bookings-complete  { bookingId }
// Vendor JWT required. Vendor marks a paid booking as completed; this is the
// signal that locks the platform fee and makes the row eligible for the next
// weekly payout run.

import { preflight } from "../_shared/cors.ts";
import { json, jsonError } from "../_shared/json.ts";
import { getCallerVendorId, serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  const origin = req.headers.get("origin");

  if (req.method !== "POST") return jsonError("method_not_allowed", 405, origin);

  const vendorId = await getCallerVendorId(req);
  if (!vendorId) return jsonError("unauthorized", 401, origin);

  let body: { bookingId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid_json", 400, origin);
  }
  if (!body.bookingId) return jsonError("missing_booking_id", 400, origin);

  const supa = serviceClient();
  const { data: updated, error } = await supa
    .from("bookings")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", body.bookingId)
    .eq("vendor_id", vendorId)
    .eq("status", "paid")
    .select("id")
    .maybeSingle();

  if (error) return jsonError("update_failed", 500, origin);
  if (!updated) return jsonError("not_eligible", 409, origin);

  await supa.from("event_log").insert({
    vendor_id: vendorId,
    booking_id: body.bookingId,
    kind: "booking.completed",
  });

  return json({ ok: true }, 200, origin);
});
