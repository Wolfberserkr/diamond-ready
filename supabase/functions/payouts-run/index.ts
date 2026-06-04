// POST /payouts-run  { periodStart, periodEnd, awgPerUsd? }
// Ops-only. Aggregates all `completed` bookings with no payout_id, per vendor,
// into a payouts row. Returns the rows; the ops app turns this into a CSV
// for the bank file upload. Re-running with the same period is idempotent
// because bookings with payout_id set are excluded.
//
// We hard-gate on email being in OPS_ALLOWED_EMAILS. The vendor JWT is not
// enough — this function rejects vendor tokens.

import { preflight } from "../_shared/cors.ts";
import { json, jsonError } from "../_shared/json.ts";
import { serviceClient, userClient } from "../_shared/supabase.ts";

interface RunInput {
  periodStart: string; // ISO
  periodEnd: string; // ISO
  awgPerUsd?: number;
}

async function callerIsOps(req: Request): Promise<boolean> {
  const allow = (Deno.env.get("OPS_ALLOWED_EMAILS") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allow.length === 0) return false;
  const u = userClient(req);
  const { data } = await u.auth.getUser();
  const email = data?.user?.email?.toLowerCase();
  return !!email && allow.includes(email);
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  const origin = req.headers.get("origin");

  if (req.method !== "POST") return jsonError("method_not_allowed", 405, origin);
  if (!(await callerIsOps(req))) return jsonError("forbidden", 403, origin);

  let body: RunInput;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid_json", 400, origin);
  }
  if (!body.periodStart || !body.periodEnd) {
    return jsonError("missing_period", 400, origin);
  }

  const supa = serviceClient();

  // Pull all eligible completed bookings in the window.
  const { data: bookings, error } = await supa
    .from("bookings")
    .select(
      "id, vendor_id, vendor_owed_cents, platform_fee_cents, currency, completed_at, vendors:vendors!inner(payout_currency)",
    )
    .eq("status", "completed")
    .is("payout_id", null)
    .gte("completed_at", body.periodStart)
    .lt("completed_at", body.periodEnd);

  if (error) {
    console.error("payout_fetch_failed", error);
    return jsonError("fetch_failed", 500, origin);
  }
  if (!bookings || bookings.length === 0) {
    return json({ created: [], totalBookings: 0 }, 200, origin);
  }

  // Group by vendor.
  const byVendor = new Map<
    string,
    {
      vendorId: string;
      payoutCurrency: string;
      gross: number;
      fee: number;
      net: number;
      bookingIds: string[];
    }
  >();
  for (const b of bookings) {
    const v = Array.isArray(b.vendors) ? b.vendors[0] : b.vendors;
    const key = b.vendor_id;
    const existing = byVendor.get(key) ?? {
      vendorId: b.vendor_id,
      payoutCurrency: v.payout_currency,
      gross: 0,
      fee: 0,
      net: 0,
      bookingIds: [],
    };
    existing.gross += b.vendor_owed_cents + b.platform_fee_cents;
    existing.fee += b.platform_fee_cents;
    existing.net += b.vendor_owed_cents;
    existing.bookingIds.push(b.id);
    byVendor.set(key, existing);
  }

  const created: Array<Record<string, unknown>> = [];
  for (const group of byVendor.values()) {
    const { data: payout, error: insErr } = await supa
      .from("payouts")
      .insert({
        vendor_id: group.vendorId,
        period_start: body.periodStart,
        period_end: body.periodEnd,
        gross_cents: group.gross,
        fee_cents: group.fee,
        net_cents: group.net,
        currency: group.payoutCurrency,
        fx_rate_awg_per_usd:
          group.payoutCurrency === "AWG" ? body.awgPerUsd ?? null : null,
        status: "pending",
      })
      .select("id")
      .single();

    if (insErr || !payout) {
      console.error("payout_insert_failed", insErr);
      continue;
    }

    await supa
      .from("bookings")
      .update({ payout_id: payout.id })
      .in("id", group.bookingIds);

    created.push({
      payoutId: payout.id,
      vendorId: group.vendorId,
      currency: group.payoutCurrency,
      netCents: group.net,
      bookingCount: group.bookingIds.length,
    });
  }

  return json({ created, totalBookings: bookings.length }, 200, origin);
});
