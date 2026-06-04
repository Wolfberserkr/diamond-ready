import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ops — Aruba Bookings" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "#0e1320", color: "#f4f6fb", margin: 0,
      }}>
        <nav style={{
          padding: "12px 20px", background: "#161d2f",
          borderBottom: "1px solid #232c44", display: "flex", gap: 16,
        }}>
          <a href="/" style={navLink}>Dashboard</a>
          <a href="/vendors" style={navLink}>Vendors</a>
          <a href="/payouts" style={navLink}>Payouts</a>
        </nav>
        <main style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>{children}</main>
      </body>
    </html>
  );
}

const navLink = {
  color: "#9ba6bf",
  textDecoration: "none",
  fontWeight: 600,
} as const;
