-- ============================================================================
-- Little Trips — chosen group covers
-- ============================================================================
-- Until now a group's card photo came from coverFor(id) in
-- components/ui/images.ts: a char-code hash into COVERS, so the cover was
-- stable but never *chosen*. This adds the chosen source. It does not replace
-- the old one — a group with no row here still falls back to coverFor(id),
-- which is the reason this is a table of choices rather than a column that is
-- null most of the time.
--
-- WHY A 1:1 TABLE AND NOT A COLUMN ON `groups`
--
-- docs/proposals/group-covers.md specified `alter table groups add column
-- cover text`, on the stated grounds that "RLS: covered by the existing group
-- policies — any member may set it". That is not what the policies say.
-- groups_update_creator in 0001_consolidated_schema.sql is:
--
--     for update using (created_by = auth.uid())
--
-- i.e. creator-only. Every other member is barred from updating the groups
-- row at all. Putting `cover` there while letting any member set it would
-- need either column-level GRANTs — which are not evaluated per-policy, so
-- they cannot express "this policy may write only this column" — or a BEFORE
-- UPDATE trigger allow-listing columns, which silently becomes wrong the next
-- time someone adds a column to `groups` and does not think about the
-- trigger.
--
-- The permission scope genuinely differs. A group is creator-owned: only they
-- rename or delete it. Its cover is collaborative, on the same premise that
-- makes itineraries and places editable by any member. Two different scopes
-- over the same row is exactly when a separate table is the honest model
-- rather than a workaround. The cost is one embedded select on the groups
-- list, which PostgREST resolves in the same round trip.
--
-- WHY ONE PREFIXED TEXT COLUMN AND NOT TWO NULLABLE ONES
--
-- A cover is one of exactly two things and never both: an entry in the image
-- registry, or a file the group uploaded. Two nullable columns would make
-- "both set" and "neither set" representable, leaving the app to rule them
-- out by hand forever. One prefixed string cannot express either state.
--
--     registry:<id>                      e.g. registry:cover-04-dusk-peaks
--     upload:<userId>/<groupId>.<ext>
--
-- The CHECK below is what makes that a guarantee rather than a convention.
-- The upload shape is pinned to the exact path the server action writes, so a
-- malformed or hand-crafted path is refused by the database and not only by
-- the action that was supposed to have validated it. Note this is the same
-- class of check as parsePhotoRefs()'s isSafeHttpUrl(): a value that ends up
-- in an image src is never trusted because something upstream ought to have
-- checked it.
-- ============================================================================

create table public.group_covers (
  group_id uuid primary key references public.groups(id) on delete cascade,
  cover text not null
);

alter table public.group_covers
  add constraint group_covers_cover_shape check (
    cover ~ '^registry:[a-z0-9-]{1,64}$'
    or cover ~ '^upload:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$'
  );

alter table public.group_covers enable row level security;

-- Fully collaborative, matching itineraries and places: any member may set,
-- change or clear their group's cover. Access resolves through
-- is_group_member() rather than an inline subquery on group_members, for the
-- reason 0001 gives — an inline subquery recurses through that table's own
-- policies.
create policy "group_covers_select_members" on public.group_covers
  for select using (public.is_group_member(group_id));

create policy "group_covers_insert_members" on public.group_covers
  for insert with check (public.is_group_member(group_id));

create policy "group_covers_update_members" on public.group_covers
  for update using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

-- Deleting the row is how a group returns to the coverFor(id) fallback.
create policy "group_covers_delete_members" on public.group_covers
  for delete using (public.is_group_member(group_id));

-- ---------------------------------------------------------------------------
-- Storage: group-covers bucket
-- ---------------------------------------------------------------------------
-- A separate bucket from `avatars`, and this is not a stylistic preference.
-- uploadAvatar() in lib/actions/memberProfiles.ts finishes by listing the
-- caller's folder and deleting every object in it that is not the avatar it
-- just wrote. Sharing the bucket would mean that changing your profile
-- picture silently destroys your group's cover photo.
--
-- file_size_limit and allowed_mime_types are enforced by Storage itself,
-- behind the allow-list the server action already applies — the same
-- defence-in-depth reasoning as ALLOWED_AVATAR_TYPES, which exists because
-- `startsWith("image/")` admits scriptable SVG into a public-read bucket.
-- SVG is absent here for that documented reason. GIF is absent too, which is
-- tighter than the avatar list: an animated 16:9 card background is not
-- something worth inviting.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'group-covers',
  'group-covers',
  true,
  2097152, -- 2 MiB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "group_covers_public_read" on storage.objects
  for select using (bucket_id = 'group-covers');

-- Folder-per-uploader keyed on auth.uid(), identical in shape to
-- avatars_upload_own — a policy already proven here, and one that needs no
-- cast of a client-supplied path segment to uuid. The group id is the
-- *filename*, so one uploader holds at most one object per group and
-- re-uploading overwrites in place rather than accumulating.
--
-- The is_anonymous clause is what makes "guests cannot upload" true rather
-- than merely intended. Anonymous users carry the same `authenticated` role
-- as permanent ones, so it has to be asserted explicitly, exactly as
-- groups_insert_self does for group creation. Guests may still *choose* a
-- registry cover — that writes no file and costs nothing.
create policy "group_covers_upload_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'group-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

create policy "group_covers_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'group-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'group-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

create policy "group_covers_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'group-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
