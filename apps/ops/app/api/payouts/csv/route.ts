import { adminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Pending payouts → CSV that maps to the local bank's bulk upload format.
// Columns: vendor, bank_name, bank_account_ref, currency, amount_local, payout_id

export async function GET() {
  const supa = adminClient();
  const { data: payouts, error } = await supa
    .from("payouts")
    .select(
      `id, net_cents, currency, fx_rate_awg_per_usd, status,
       vendors:vendors!inner(business_name, bank_name, bank_account_ref, payout_currency)`,
    )
    .eq("status", "pending");

  if (error) {
    return new Response(`error: ${error.message}`, { status: 500 });
  }

  const lines: string[] = ["vendor,bank_name,bank_account_ref,currency,amount,payout_id"];
  for (const p of payouts ?? []) {
    const v = Array.isArray(p.vendors) ? p.vendors[0] : p.vendors;
    // For AWG payouts, the net was computed at run time using fx_rate_awg_per_usd.
    const amount = (p.net_cents / 100).toFixed(2);
    lines.push(
      [
        csvCell(v.business_name),
        csvCell(v.bank_name ?? ""),
        csvCell(v.bank_account_ref ?? ""),
        p.currency,
        amount,
        p.id,
      ].join(","),
    );
  }

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="payouts.csv"',
    },
  });
}

function csvCell(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
