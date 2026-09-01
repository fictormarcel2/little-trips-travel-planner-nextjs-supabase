-- ============================================================================
-- Little Trips — pre-launch hardening
-- ============================================================================
-- Two independent changes, bundled here because both came out of the same
-- full-codebase review pass before going public:
--
-- 1. group_members gets a DELETE policy — previously there was no way for
--    anyone (a member leaving, or the creator removing someone) to remove a
--    membership row at all; the only path was direct database access.
--
-- 2. Explicit upper bounds on user-supplied text fields that previously had
--    only a non-empty check, no maximum — group/itinerary/place names,
--    member display names, and notes.
--
-- See CLAUDE.md's pre-launch-review notes for the full rationale.
-- ============================================================================

-- Any member can remove their own membership (leave a group); the group's
-- creator can remove anyone's. Deliberately does NOT special-case "the
-- creator can't remove themselves" here — that's enforced at the
-- application level (lib/actions/groups.ts's leaveGroup()), which gives a
-- clear explanatory message ("delete the group instead") rather than a
-- silent RLS rejection, same pattern used elsewhere in this schema for
-- checks that are also independently enforced in app code.
create policy "group_members_delete_self_or_creator" on public.group_members
  for delete using (
    user_id = auth.uid()
    or public.is_group_creator(group_id)
  );

alter table public.groups
  add constraint groups_name_length check (char_length(name) <= 100);

alter table public.itineraries
  add constraint itineraries_title_length check (char_length(title) <= 100);

alter table public.places
  add constraint places_name_length check (char_length(name) <= 200),
  add constraint places_address_length check (address is null or char_length(address) <= 500),
  add constraint places_user_notes_length check (user_notes is null or char_length(user_notes) <= 2000);

alter table public.group_member_profiles
  add constraint group_member_profiles_display_name_length check (char_length(display_name) <= 100);
