import type {
  CreateBookingRequest,
  CreateBookingResponse,
  CancelBookingRequest,
} from "@aruba/shared";
import { CreateBookingRequestSchema } from "@aruba/shared";
import { supabase, functionsUrl } from "./supabase";

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

export async function createBooking(
  input: CreateBookingRequest,
): Promise<CreateBookingResponse> {
  CreateBookingRequestSchema.parse(input);
  const res = await fetch(functionsUrl("bookings-create"), {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`create_booking_failed:${res.status}`);
  return (await res.json()) as CreateBookingResponse;
}

export async function completeBooking(bookingId: string): Promise<void> {
  const res = await fetch(functionsUrl("bookings-complete"), {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ bookingId }),
  });
  if (!res.ok) throw new Error(`complete_booking_failed:${res.status}`);
}

export async function cancelBooking(input: CancelBookingRequest): Promise<void> {
  const res = await fetch(functionsUrl("bookings-cancel"), {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`cancel_booking_failed:${res.status}`);
}
