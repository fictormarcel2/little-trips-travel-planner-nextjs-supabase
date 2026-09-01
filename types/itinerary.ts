// Canonical row shape for itineraries (supabase/migrations/0001_consolidated_schema.sql,
// extended by 0004_itinerary_date_location_weather.sql and 0008_chosen_place.sql).
// Pages typically select a subset of these columns — use
// Pick<Itinerary, ...> at the call site rather than redefining a narrower
// inline shape per page.
export interface Itinerary {
  id: string;
  group_id: string;
  title: string;
  planned_date: string | null;
  location: string | null;
  weather: unknown;
  // The place the group settled on, or null while they're still deciding.
  // FK to places(id) on delete set null, so removing the chosen stop
  // un-chooses it rather than leaving a dangling id here.
  chosen_place_id: string | null;
  created_by: string;
  created_at: string;
}
