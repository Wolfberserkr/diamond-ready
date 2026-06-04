import { createClient } from "@supabase/supabase-js";

// Server-side only. The service role key must never reach the client.
export function adminClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
