import { loadPlacesLibrary } from "@/lib/google/loadGoogleMaps";

export interface FetchedReview {
  text: string;
  rating: number | null;
  relativeTime: string | null;
}

const MAX_REVIEWS = 5;

// Fetched on-demand, client-side, the first time a user opens the Details
// drawer for a given place — deliberately NOT at add-time like
// fetchPlacePhotos.ts, and never written back into the `places` table
// (only the AI's derived ai_details output is persisted). Reviews are a
// bigger per-call cost than the always-fetched rating scalar, so this stays
// strictly proportional to actual feature usage — see CLAUDE.md's Google
// Places cost-abuse note. Uses the current Place class (Place.fetchFields),
// same "Places API (New)" surface as fetchPlacePhotos.ts and
// PlaceRecommendationSearch's searchByText() — no new API enablement.
export async function fetchPlaceReviews(placeId: string): Promise<FetchedReview[]> {
  const places = await loadPlacesLibrary();
  const place = new places.Place({ id: placeId });
  const { place: fetched } = await place.fetchFields({ fields: ["reviews"] });

  const reviews = fetched.reviews ?? [];
  return reviews
    .slice(0, MAX_REVIEWS)
    .map((review) => ({
      text: review.text ?? "",
      rating: review.rating ?? null,
      relativeTime: review.relativePublishTimeDescription ?? null,
    }))
    .filter((r) => r.text.trim().length > 0);
}
