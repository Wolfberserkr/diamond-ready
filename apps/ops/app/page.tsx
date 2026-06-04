import { adminClient } from "@/lib/supabase";
import { formatMoney } from "@aruba/shared";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supa = adminClient();
  const [{ count: vendorCount }, { count: activeVendors }, { data: weekly }] =
    await Promise.all([
      supa.from("vendors").select("*", { count: "exact", head: true }),
      supa.from("vendors").select("*", { count: "exact", head: true }).eq("is_active", true),
      supa
        .from("bookings")
        .select("total_cents, platform_fee_cents, status")
        .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
    ]);

  const gmv = (weekly ?? []).reduce((s, b) => s + (b.total_cents ?? 0), 0);
  const fees = (weekly ?? []).reduce((s, b) => s + (b.platform_fee_cents ?? 0), 0);
  const paidCount = (weekly ?? []).filter((b) => b.status === "paid" || b.status === "completed").length;

  return (
    <div>
      <h1>Dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <Stat label="Vendors" value={vendorCount ?? 0} />
        <Stat label="Active vendors" value={activeVendors ?? 0} />
        <Stat label="7d GMV" value={formatMoney(gmv, "USD")} />
        <Stat label="7d fees" value={formatMoney(fees, "USD")} />
      </div>
      <p style={{ color: "#9ba6bf", marginTop: 16 }}>
        {paidCount} bookings paid in the last 7 days.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: "#161d2f", padding: 16, borderRadius: 12 }}>
      <div style={{ color: "#9ba6bf", fontSize: 12, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}
