-- ============================================================================
-- Little Trips — consolidated schema
-- ============================================================================
-- Single-file schema: every table, RLS policy, helper function, the
-- `avatars` Storage bucket, and the rate-limit cleanup cron job, as final
-- state — not an incremental history. This replaced 5 separate migration
-- files (0001_init.sql through 0005_restrict_anonymous_group_creation.sql)
-- after review; applied to a fresh Supabase project rather than the one the
-- 5-file history had been running against.
--
-- This file is treated as immutable once applied anywhere (including this
-- project's live database) — it reflects schema state as of that point in
-- time, not the current schema. Later changes get their own numbered
-- migration files (0002_*.sql, etc.) rather than rewriting this one; see
-- those files for anything that's changed since.
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_cron with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create index group_invites_group_id_idx on public.group_invites (group_id);

create table public.itineraries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index itineraries_group_id_idx on public.itineraries (group_id);

-- places: category + Google-sourced location + photos are final columns here
-- (address_or_link existed only transiently in 0001→0003 and never reaches
-- this consolidated state).
create table public.places (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  category text not null default 'other'
    check (category in ('restaurant', 'cafe_bar', 'museum_gallery', 'activity_experience', 'outdoor', 'other')),
  address text,
  latitude numeric check (latitude is null or (latitude between -90 and 90)),
  longitude numeric check (longitude is null or (longitude between -180 and 180)),
  google_place_id text,
  user_notes text,
  ai_summary jsonb,
  photo_refs jsonb not null default '[]'::jsonb,
  added_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index places_itinerary_id_idx on public.places (itinerary_id);

-- group_member_profiles: display-identity layer on top of group_members, for
-- anonymous ("no email") joiners and pre-added placeholder slots. See
-- CLAUDE.md's "Anonymous join + member identity" section for the full
-- claiming-flow rationale.
create table public.group_member_profiles (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) > 0),
  avatar_url text,
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index group_member_profiles_group_id_idx
  on public.group_member_profiles (group_id);

-- A given user can hold at most one claimed slot per group.
create unique index group_member_profiles_one_claim_per_group
  on public.group_member_profiles (group_id, claimed_by_user_id)
  where claimed_by_user_id is not null;

-- Server-side bookkeeping for rate-limiting the AI summarization endpoint
-- (and, going forward, any other rate-limited endpoint keyed by
-- (user_id, endpoint)). No RLS policies on purpose: only ever read/written
-- by the server using the service-role key, never by clients.
create table public.api_rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  created_at timestamptz not null default now()
);

create index api_rate_limits_user_endpoint_idx
  on public.api_rate_limits (user_id, endpoint, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer to safely short-circuit recursive RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_creator(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.groups
    where id = p_group_id and created_by = auth.uid()
  );
$$;

revoke all on function public.is_group_member(uuid) from public;
revoke all on function public.is_group_creator(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_creator(uuid) to authenticated;

-- Automatically add a group's creator as its first member.
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id)
  values (new.id, new.created_by)
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.itineraries enable row level security;
alter table public.places enable row level security;
alter table public.group_member_profiles enable row level security;
alter table public.api_rate_limits enable row level security;

-- groups: members can read; any *non-anonymous* authenticated user can
-- create (becomes a member via the trigger above); only the creator can
-- rename or delete. The is_anonymous check is the final (0005) version —
-- guests can fully participate in groups they're invited to, but can't
-- create their own.
create policy "groups_select_members" on public.groups
  for select using (public.is_group_member(id));

create policy "groups_insert_self" on public.groups
  for insert with check (
    created_by = auth.uid()
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

create policy "groups_update_creator" on public.groups
  for update using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "groups_delete_creator" on public.groups
  for delete using (created_by = auth.uid());

-- group_members: members can see their fellow members. No client-facing
-- insert policy at all — rows only appear via the on_group_created trigger
-- or the server-side redeemInvite() (service-role client, bypasses RLS).
create policy "group_members_select_members" on public.group_members
  for select using (public.is_group_member(group_id));

-- group_invites: only the group's creator can view or manage its invites.
-- Token lookups during the join flow happen server-side with the
-- service-role key, so they're intentionally not covered by any select
-- policy here. (Anonymous users transitively can't reach this insert path
-- either, since they can never be a group's created_by / creator.)
create policy "group_invites_select_creator" on public.group_invites
  for select using (public.is_group_creator(group_id));

create policy "group_invites_insert_creator" on public.group_invites
  for insert with check (
    public.is_group_creator(group_id) and created_by = auth.uid()
  );

create policy "group_invites_update_creator" on public.group_invites
  for update using (public.is_group_creator(group_id))
  with check (public.is_group_creator(group_id));

-- itineraries: any group member (including guests) can create/view/edit/
-- delete — shared planning tool, equally-trusted collaborators.
create policy "itineraries_select_members" on public.itineraries
  for select using (public.is_group_member(group_id));

create policy "itineraries_insert_members" on public.itineraries
  for insert with check (
    public.is_group_member(group_id) and created_by = auth.uid()
  );

create policy "itineraries_update_members" on public.itineraries
  for update using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

create policy "itineraries_delete_members" on public.itineraries
  for delete using (public.is_group_member(group_id));

-- places: scoped through the parent itinerary's group.
create policy "places_select_members" on public.places
  for select using (
    exists (
      select 1 from public.itineraries i
      where i.id = places.itinerary_id
        and public.is_group_member(i.group_id)
    )
  );

create policy "places_insert_members" on public.places
  for insert with check (
    added_by = auth.uid()
    and exists (
      select 1 from public.itineraries i
      where i.id = places.itinerary_id
        and public.is_group_member(i.group_id)
    )
  );

create policy "places_update_members" on public.places
  for update using (
    exists (
      select 1 from public.itineraries i
      where i.id = places.itinerary_id
        and public.is_group_member(i.group_id)
    )
  )
  with check (
    exists (
      select 1 from public.itineraries i
      where i.id = places.itinerary_id
        and public.is_group_member(i.group_id)
    )
  );

create policy "places_delete_members" on public.places
  for delete using (
    exists (
      select 1 from public.itineraries i
      where i.id = places.itinerary_id
        and public.is_group_member(i.group_id)
    )
  );

-- group_member_profiles: any group member can see all slots (claimed and
-- unclaimed) — needed for the "who are you" picker and to render claimed
-- members' names/avatars throughout the app.
create policy "group_member_profiles_select_members" on public.group_member_profiles
  for select using (public.is_group_member(group_id));

-- Insert either an unclaimed placeholder slot, or a new slot claimed by
-- yourself in the same step — never a slot pre-claimed as someone else.
create policy "group_member_profiles_insert_members" on public.group_member_profiles
  for insert with check (
    public.is_group_member(group_id)
    and (claimed_by_user_id is null or claimed_by_user_id = auth.uid())
  );

-- Claim an unclaimed slot, or update a slot you already claimed (avatar,
-- display name). USING gates which existing rows you may even target: a
-- slot already claimed by someone else never matches, so there's no path to
-- steal or overwrite another person's claim. WITH CHECK pins the result to
-- yourself, so a claim can't be handed off or cleared either.
--
-- Superseded by 0002_flexible_role_claiming.sql — kept here unmodified
-- since this file reflects schema state as of when it was applied, not
-- current state.
create policy "group_member_profiles_update_claim_or_own" on public.group_member_profiles
  for update using (
    public.is_group_member(group_id)
    and (claimed_by_user_id is null or claimed_by_user_id = auth.uid())
  )
  with check (
    public.is_group_member(group_id)
    and claimed_by_user_id = auth.uid()
  );

-- Only unclaimed placeholder slots can be deleted (cleanup) — a claimed
-- identity can't be removed out from under whoever claimed it.
create policy "group_member_profiles_delete_unclaimed" on public.group_member_profiles
  for delete using (
    public.is_group_member(group_id) and claimed_by_user_id is null
  );

-- ---------------------------------------------------------------------------
-- Storage: avatars bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_upload_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Scheduled cleanup
-- ---------------------------------------------------------------------------

-- api_rate_limits grows one row per allowed request and is never pruned on
-- the hot path (lib/ai/rateLimit.ts) — a daily job keeps it bounded instead.
select cron.schedule(
  'cleanup_api_rate_limits',
  '0 3 * * *', -- daily at 03:00 UTC
  $$ delete from public.api_rate_limits where created_at < now() - interval '1 day'; $$
);
