// Single source of truth for the six allowed place categories — imported by
// the DB-facing action for server-side validation, the add-place form for
// the dropdown, and PlaceCard/AI route for display and prompting. Never
// hardcode this list a second time.
export const PLACE_CATEGORIES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe_bar", label: "Cafe / Bar" },
  { value: "museum_gallery", label: "Museum / Gallery" },
  { value: "activity_experience", label: "Activity / Experience" },
  { value: "outdoor", label: "Outdoor" },
  { value: "other", label: "Other" },
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number]["value"];

export function isPlaceCategory(value: string): value is PlaceCategory {
  return PLACE_CATEGORIES.some((c) => c.value === value);
}

export function placeCategoryLabel(value: string): string {
  return PLACE_CATEGORIES.find((c) => c.value === value)?.label ?? "Other";
}

// Heading for AiDetails.whatToOrder, which is a list of "things worth seeking
// out here" for every category — not just food. The AI route already handles
// this correctly on the data side (its prompt tells the model to return an
// empty array where the notion doesn't apply, e.g. a museum), but the heading
// above that list used to be the hardcoded string "What to order", which read
// as a bug on any non-food place. Lives here rather than in the component for
// the same reason placeCategoryLabel does: the category list has exactly one
// source of truth, and anything that switches on it belongs beside it.
export function placeRecommendationsHeading(value: string): string {
  switch (value) {
    case "restaurant":
    case "cafe_bar":
      return "What to order";
    case "museum_gallery":
      return "What to see";
    case "activity_experience":
    case "outdoor":
      return "What to do";
    default:
      return "Worth seeking out";
  }
}

export interface PlacePhotoRef {
  url: string;
  attributionText: string;
  attributionUri: string | null;
}

// Provider-agnostic rating storage — "google" is the only source wired up
// today, but rating/rating_count/rating_source are independent columns
// specifically so a second provider (e.g. TripAdvisor, once its own API
// access is set up) can be added later without a schema rework.
export const RATING_SOURCES = ["google"] as const;
export type RatingSource = (typeof RATING_SOURCES)[number];

export interface PlaceRecord {
  id: string;
  name: string;
  category: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  user_notes: string | null;
  // The `places.ai_summary` jsonb column still exists in the database (it
  // predates ai_details and dropping a column is not worth a migration), but
  // nothing reads or writes it any more — see the note on AiDetails in
  // types/ai.ts. It is deliberately absent from this type so a stray read
  // fails to compile rather than silently returning stale AI output.
  ai_details: unknown;
  photo_refs: PlacePhotoRef[];
  rating: number | null;
  rating_count: number | null;
  rating_source: string | null;
  added_by: string;
  added_by_profile_id: string | null;
  created_at: string;
}
