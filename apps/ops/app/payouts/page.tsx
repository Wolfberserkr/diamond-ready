import { adminClient } from "@/lib/supabase";
import { formatMoney } from "@aruba/shared";

export const dynamic = "force-dynamic";

export default async function PayoutsPage() {
  const supa = adminClient();
  const { data: payouts } = await supa
    .from("payouts")
    .select("id, vendor_id, period_start, period_end, gross_cents, fee_cents, net_cents, currency, status, sent_at, vendors:vendors!inner(business_name, payout_currency, bank_name)")
    .order("period_end", { ascending: false })
    .limit(50);

  const csvHref = "/api/payouts/csv";

  return (
    <div>
      <h1>Payouts</h1>
      <p>
        <a href={csvHref} style={{ color: "#1fd28c" }}>Download pending payouts CSV</a>
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={th}>Vendor</th>
            <th style={th}>Period</th>
            <th style={th}>Net</th>
            <th style={th}>Fee</th>
            <th style={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {(payouts ?? []).map((p) => {
            const vendor = Array.isArray(p.vendors) ? p.vendors[0] : p.vendors;
            return (
              <tr key={p.id}>
                <td style={td}>{vendor?.business_name}</td>
                <td style={td}>
                  {new Date(p.period_start).toLocaleDateString()} —{" "}
                  {new Date(p.period_end).toLocaleDateString()}
                </td>
                <td style={td}>{formatMoney(p.net_cents, p.currency as "USD" | "AWG")}</td>
                <td style={td}>{formatMoney(p.fee_cents, p.currency as "USD" | "AWG")}</td>
                <td style={td}>{p.status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const tableStyle: React.CSSProperties = {
  width: "100%", borderCollapse: "collapse", background: "#161d2f", borderRadius: 12, overflow: "hidden",
};
const th: React.CSSProperties = {
  textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #232c44",
  color: "#9ba6bf", fontSize: 12, textTransform: "uppercase",
};
const td: React.CSSProperties = { padding: "10px 12px", borderBottom: "1px solid #232c44" };
