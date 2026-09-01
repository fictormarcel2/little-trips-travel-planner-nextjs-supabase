-- ============================================================================
-- Little Trips — flexible role claiming
-- ============================================================================
-- Two changes, bundled here because the second exists directly because of
-- the first:
--
-- 1. group_member_profiles claiming becomes freely reassignable by any
--    group member at any time (previously locked forever to whichever
--    auth.uid() claimed a slot first). This fixes a real dead end:
--    anonymous sessions don't persist across devices/browsers, so
--    reopening an invite link on a second device minted a new auth.uid()
--    that could never reclaim a name already locked to the first device's
--    session. It also lets email-authenticated users (e.g. the group
--    creator) claim a name for the first time — they had no path to do so
--    before this.
--
-- 2. places.added_by_profile_id is added so "who added this place" stays
--    pinned to the role active at creation time. Without it, once claiming
--    became reassignable, switching roles would silently rewrite the
--    attribution on every place you'd ever added, since the old lookup
--    resolved places.added_by (a raw, unchanging auth.uid()) against
--    whoever *currently* holds that user's claim.
--
-- See CLAUDE.md's "Claiming is intentionally not locked..." and
-- "Editable notes, and added by pinned to a role" sections for the full
-- rationale and the application-code side of this (lib/actions/
-- memberProfiles.ts's claimProfile(), lib/actions/places.ts's createPlace()).
-- ============================================================================

-- Any group member can claim (or re-claim) any slot at any time — including
-- one already claimed by someone else — and can release a slot back to
-- unclaimed. This is deliberately permissive, matching the same
-- equally-trusted-co-planners model this app already uses for
-- itineraries/places: any group member can already edit or delete any
-- place, so letting any group member reassign a name slot is consistent,
-- not a bigger trust jump. USING only checks group membership (any row is a
-- valid target); WITH CHECK still pins the *result* to either yourself or
-- unclaimed — nobody can assign a slot to a specific OTHER person, only
-- claim it for themselves or clear it. claimProfile() relies on the "or
-- null" half of this to release a user's previous claim in the same group
-- before granting the new one (a unique index allows at most one claimed
-- slot per user per group, so switching roles requires releasing the old
-- one first).
drop policy "group_member_profiles_update_claim_or_own" on public.group_member_profiles;
create policy "group_member_profiles_update_claim_or_own" on public.group_member_profiles
  for update using (
    public.is_group_member(group_id)
  )
  with check (
    public.is_group_member(group_id)
    and (claimed_by_user_id = auth.uid() or claimed_by_user_id is null)
  );

-- Fixed at insert time to whichever group_member_profiles row the adder
-- currently held (null if they had none). Deliberately NOT re-derived from
-- added_by + current claim state on every read — see the file header.
alter table public.places
  add column added_by_profile_id uuid references public.group_member_profiles(id) on delete set null;
