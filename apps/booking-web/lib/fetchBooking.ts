import type { PublicBooking } from "@aruba/shared";
import { env, functionsUrl } from "./env";

export async function fetchBooking(code: string): Promise<PublicBooking | null> {
  const res = await fetch(`${functionsUrl("bookings-get-public")}?code=${code}`, {
    headers: { apikey: env.supabaseAnonKey },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`booking lookup failed: ${res.status}`);
  return (await res.json()) as PublicBooking;
}
