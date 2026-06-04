import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

// Build a client that runs as the calling vendor so RLS applies. The vendor app
// sends its access token in the Authorization header; we pass it through.
export function userClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

export async function getCallerVendorId(req: Request): Promise<string | null> {
  const client = userClient(req);
  const { data: userData } = await client.auth.getUser();
  if (!userData?.user) return null;
  const { data, error } = await client
    .from("vendors")
    .select("id")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data.id as string;
}
