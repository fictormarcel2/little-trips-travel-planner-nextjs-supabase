-- ============================================================================
-- Little Trips — chosen stop
-- ============================================================================
-- One nullable pointer from a trip to the place the group settled on. This is
-- deliberately NOT a voting system: ranked ballots, per-member votes and
-- tie-breaking would need their own table, tally and RLS, and a group of three
-- uses them once before someone says "let's do the ramen place." What a group
-- actually needs is a record of the call somebody already made, and that is
-- one uuid.
--
-- `on delete set null`: removing the chosen stop un-chooses it rather than
-- blocking the delete or leaving the header pointing at a row that is gone.
--
-- No RLS changes needed, same as 0004: an RLS UPDATE policy is row-level and
-- has no column granularity, and itineraries_update_members
-- (0001_consolidated_schema.sql) gates on is_group_member(group_id) in both
-- USING and WITH CHECK. There are no column-level GRANTs on this table, so
-- any member who may update the row may update this column.
--
-- The FK guarantees the target is *a* place; it cannot guarantee the place
-- belongs to *this* itinerary. Enforcing that in the database would mean a
-- composite FK on (chosen_place_id, id) -> places(id, itinerary_id), whose
-- ON DELETE SET NULL nulls every referencing column — including itineraries.id,
-- the primary key. Not worth the trap. setChosenPlace() re-selects the place
-- scoped by itinerary_id instead; RLS would not catch a cross-itinerary id on
-- its own, since both rows can be visible to the same member.
-- ============================================================================

alter table public.itineraries
  add column chosen_place_id uuid references public.places(id) on delete set null;
