// Server-only env access. Client-side keys must use NEXT_PUBLIC_*.

export const env = {
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey:
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
};

export function functionsUrl(path: string): string {
  const base = env.supabaseUrl.replace(/\/$/, "");
  return `${base}/functions/v1/${path}`;
}
