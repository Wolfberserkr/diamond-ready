// Permissive CORS — the booking page and vendor app both call from origins
// that vary in dev. Tighten in production via SUPABASE_ALLOWED_ORIGINS.

const ALLOWED = (Deno.env.get("SUPABASE_ALLOWED_ORIGINS") ?? "*")
  .split(",")
  .map((s) => s.trim());

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow = ALLOWED.includes("*")
    ? "*"
    : origin && ALLOWED.includes(origin)
      ? origin
      : ALLOWED[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Access-Control-Max-Age": "86400",
  };
}

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req.headers.get("origin")) });
  }
  return null;
}
