-- ============================================================================
-- Little Trips — member preference onboarding
-- ============================================================================
-- One preferences row per claimed group_member_profiles row (1:1, enforced
-- by the unique index below). food_preference/activity_preference are
-- native Postgres text[] arrays (multi-select — see the app-level decision
-- notes for why food/activity are multi-select while environment is single)
-- validated with `<@` array-containment CHECKs against a fixed allow-list,
-- the same enum-CHECK convention already used for places.category in
-- 0001_consolidated_schema.sql.
--
-- RLS mirrors group_member_profiles' own "equally-trusted co-planners"
-- shape: any group member can view/edit any member's preferences, not just
-- their own — consistent with how display_name/avatar_url are already
-- editable by any group member today (see group_member_profiles_update_
-- claim_or_own in 0002_flexible_role_claiming.sql), not a new looser rule
-- invented for this table.
-- ============================================================================

create table public.member_preferences (
  id uuid primary key default gen_random_uuid(),
  group_member_profile_id uuid not null references public.group_member_profiles(id) on delete cascade,
  food_preference text[] not null default '{}',
  activity_preference text[] not null default '{}',
  environment_preference text,
  other_preferences text,
  created_at timestamptz not null default now()
);

create unique index member_preferences_profile_id_key
  on public.member_preferences (group_member_profile_id);

alter table public.member_preferences
  add constraint member_preferences_food_valid check (
    food_preference <@ array['asian','japanese','korean','western','something_new']::text[]
  ),
  add constraint member_preferences_activity_valid check (
    activity_preference <@ array['fun_lively','chill_relaxed','explorative_adventurous']::text[]
  ),
  add constraint member_preferences_environment_valid check (
    environment_preference is null or environment_preference in ('indoor','outdoor','mix')
  ),
  add constraint member_preferences_other_length check (
    other_preferences is null or char_length(other_preferences) <= 500
  );

alter table public.member_preferences enable row level security;

create policy "member_preferences_select_members" on public.member_preferences
  for select using (
    exists (
      select 1 from public.group_member_profiles gmp
      where gmp.id = member_preferences.group_member_profile_id
        and public.is_group_member(gmp.group_id)
    )
  );

create policy "member_preferences_insert_members" on public.member_preferences
  for insert with check (
    exists (
      select 1 from public.group_member_profiles gmp
      where gmp.id = member_preferences.group_member_profile_id
        and public.is_group_member(gmp.group_id)
    )
  );

create policy "member_preferences_update_members" on public.member_preferences
  for update using (
    exists (
      select 1 from public.group_member_profiles gmp
      where gmp.id = member_preferences.group_member_profile_id
        and public.is_group_member(gmp.group_id)
    )
  ) with check (
    exists (
      select 1 from public.group_member_profiles gmp
      where gmp.id = member_preferences.group_member_profile_id
        and public.is_group_member(gmp.group_id)
    )
  );
