-- ============================================================================
-- Little Trips — real Google ratings + AI-generated place details
-- ============================================================================
-- Two related additions to `places`, bundled here for the same reason 0003
-- bundled its two independent changes: both came out of the same review
-- pass — replacing the AI-invented Duo/Group/Quality ratings with a real,
-- provider-sourced rating, and adding a review-grounded "Details" drawer.
--
-- 1. rating / rating_count / rating_source: provider-agnostic rating
--    storage. `rating_source` is free-standing text (not a two-value enum)
--    specifically so a second provider (TripAdvisor) can be added later —
--    by widening the CHECK constraint — without a schema rework. All three
--    columns are independently nullable, no cross-column CHECK tying them
--    together, matching the existing latitude/longitude precedent in
--    0001_consolidated_schema.sql (each validated on its own; the app layer
--    keeps them in sync — rating_source is only ever set alongside a
--    non-null rating, see lib/actions/places.ts). Deliberately no DEFAULT:
--    existing rows predate rating data entirely and should read as fully
--    unrated (all three NULL), not "rating_source = 'google', rating = NULL".
--
-- 2. ai_details: a second jsonb column alongside the existing ai_summary,
--    for the new "Details" drawer's AI output. No CHECK constraint,
--    matching ai_summary's own precedent — shape is validated at the
--    application layer (types/ai.ts's isValidAiDetails), not in the DB.
-- ============================================================================

alter table public.places
  add column rating numeric,
  add column rating_count integer,
  add column rating_source text,
  add column ai_details jsonb;

alter table public.places
  add constraint places_rating_range check (rating is null or (rating between 0 and 5)),
  add constraint places_rating_count_nonnegative check (rating_count is null or rating_count >= 0),
  add constraint places_rating_source_known check (rating_source is null or rating_source in ('google'));
