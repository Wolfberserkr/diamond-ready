import { fetchPlaceReviews } from './places';
import { clusterComplaints } from '@/lib/llm/extract';
import type { ComplaintTheme } from '@/lib/supabase/types';

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

export async function fetchComplaints(
  competitorName: string,
  placeId: string,
): Promise<ComplaintTheme[]> {
  const all = await fetchPlaceReviews(placeId);
  const cutoff = Math.floor(Date.now() / 1000) - THIRTY_DAYS_SECONDS;
  const recent = all
    .filter((r) => r.rating <= 3 && r.time >= cutoff)
    .map((r) => ({ rating: r.rating, text: r.text }));
  return clusterComplaints(competitorName, recent);
}
