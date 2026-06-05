import { env } from '@/lib/env';

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

export interface PlaceReview {
  rating: number;
  text: string;
  time: number;
  author_name?: string;
}

interface FindPlaceResponse {
  candidates: { place_id: string }[];
  status: string;
}

interface PlaceDetailsResponse {
  result: { reviews?: PlaceReview[] };
  status: string;
}

export async function findPlaceId(
  businessName: string,
  websiteUrl: string,
): Promise<string | null> {
  const host = new URL(websiteUrl).host;
  const query = `${businessName} ${host}`;
  const params = new URLSearchParams({
    input: query,
    inputtype: 'textquery',
    fields: 'place_id',
    key: env.GOOGLE_PLACES_API_KEY,
  });
  const res = await fetch(`${PLACES_BASE}/findplacefromtext/json?${params}`);
  if (!res.ok) return null;
  const data = (await res.json()) as FindPlaceResponse;
  return data.candidates[0]?.place_id ?? null;
}

export async function fetchPlaceReviews(placeId: string): Promise<PlaceReview[]> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'reviews',
    key: env.GOOGLE_PLACES_API_KEY,
  });
  const res = await fetch(`${PLACES_BASE}/details/json?${params}`);
  if (!res.ok) return [];
  const data = (await res.json()) as PlaceDetailsResponse;
  return data.result?.reviews ?? [];
}
