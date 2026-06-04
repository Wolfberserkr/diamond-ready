import { adminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const supa = adminClient();
  const { data: vendors } = await supa
    .from("vendors")
    .select("id, business_name, owner_name, whatsapp_e164, category, kyc_status, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1>Vendors</h1>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={th}>Business</th>
            <th style={th}>Owner</th>
            <th style={th}>WhatsApp</th>
            <th style={th}>Category</th>
            <th style={th}>KYC</th>
            <th style={th}>Active</th>
          </tr>
        </thead>
        <tbody>
          {(vendors ?? []).map((v) => (
            <tr key={v.id}>
              <td style={td}>{v.business_name}</td>
              <td style={td}>{v.owner_name}</td>
              <td style={td}>{v.whatsapp_e164}</td>
              <td style={td}>{v.category}</td>
              <td style={td}>{v.kyc_status}</td>
              <td style={td}>{v.is_active ? "yes" : "no"}</td>
            </tr>
          ))}
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
