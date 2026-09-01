-- ============================================================================
-- Little Trips — itinerary planned date, location, and cached weather
-- ============================================================================
-- Adds an optional planned_date + location to itineraries (set explicitly by
-- a group member, independent of whatever places get added) and a jsonb
-- weather column that caches the last-fetched Open-Meteo result.
--
-- `weather` gets no CHECK constraint, matching the existing ai_summary/
-- photo_refs precedent on `places` — shape is validated at the application
-- layer (types/weather.ts's isValidWeatherSnapshot), not in the DB. The
-- cached snapshot embeds which location/date it was fetched for
-- (forLocation/forDate), so staleness can be detected by comparing against
-- the row's *current* location/planned_date at render time without a
-- separate tracking column.
--
-- No RLS changes needed: itineraries_update_members (0001_consolidated_
-- schema.sql) already lets any group member update any column on an
-- itinerary row — there is no column-level restriction to extend.
-- ============================================================================

alter table public.itineraries
  add column planned_date date,
  add column location text,
  add column weather jsonb;

alter table public.itineraries
  add constraint itineraries_location_length check (location is null or char_length(location) <= 200);
