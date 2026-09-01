import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { leaveGroup } from "@/lib/actions/groups";
import { createItinerary } from "@/lib/actions/itineraries";
import { AppShell } from "@/components/ui/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { TrailSpot } from "@/components/ui/SpotIllustration";
import { Reveal } from "@/components/ui/Reveal";
import { revealDelay } from "@/lib/motion";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Field } from "@/components/ui/Field";
import { Surface } from "@/components/ui/Surface";
import { MembersSection } from "@/components/groups/MembersSection";
import { InvitesSection, type InviteSummary } from "@/components/groups/InvitesSection";
import { PeopleSheet } from "@/components/groups/PeopleSheet";
import { CoverSheet } from "@/components/groups/CoverSheet";
import { coverImageFor } from "@/lib/covers";
import { formatDate, formatTimestamp, parsePlannedDate } from "@/lib/format";
import { ITINERARY_TITLE_MAX_LENGTH } from "@/lib/constraints";
import type { MemberProfile, MemberPreferences } from "@/types/member";
import type { Group } from "@/types/group";
import type { Itinerary } from "@/types/itinerary";

export default async function GroupPage({
  params,
}: {
  params: { groupId: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/groups/${params.groupId}`)}`);
  }

  // RLS scopes this to groups the user is a member of — a non-member (or a
  // client-supplied id for a group they don't belong to) simply gets no row
  // back, which we turn into a 404 rather than ever exposing group data.
  // group_covers is embedded rather than queried separately: its group_id is
  // both primary key and foreign key here, so PostgREST resolves it as a
  // to-one relation in this same round trip. This page already makes more
  // sequential round trips than it needs to; adding a seventh for one text
  // column would have made that worse for no reason.
  const { data: groupData } = await supabase
    .from("groups")
    .select("id, name, created_by, created_at, group_covers(cover)")
    .eq("id", params.groupId)
    .maybeSingle();

  if (!groupData) {
    notFound();
  }
  const group = groupData as Group & {
    group_covers: { cover: string } | { cover: string }[] | null;
  };
  // Defensive on the embed's shape for the reason given in app/groups/page.tsx:
  // a to-one embed returns an object, but getting that wrong would silently
  // show every group the fallback cover with nothing to explain why.
  const coverEmbed = group.group_covers;
  const chosenCover = !coverEmbed
    ? null
    : Array.isArray(coverEmbed)
      ? coverEmbed[0]?.cover ?? null
      : coverEmbed.cover;
  const cover = coverImageFor(group.id, chosenCover);

  const isCreator = group.created_by === user.id;

  // Only member_preferences is genuinely dependent on another query (it needs
  // profileIds, which profiles hasn't returned yet). The rest — memberCount,
  // itineraries, and invites — only need group.id and isCreator, both already
  // in hand, so they run alongside profiles instead of after it.
  const [
    { data: profiles },
    { count: memberCount },
    { data: itinerariesData },
    { data: invitesData },
  ] = await Promise.all([
    supabase
      .from("group_member_profiles")
      .select("id, group_id, display_name, avatar_url, claimed_by_user_id")
      .eq("group_id", group.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", group.id),
    supabase
      .from("itineraries")
      .select("id, title, planned_date, location, created_at")
      .eq("group_id", group.id)
      .order("created_at", { ascending: false }),
    isCreator
      ? supabase
          .from("group_invites")
          .select("id, token, expires_at, revoked, created_at")
          .eq("group_id", group.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null as InviteSummary[] | null }),
  ]);
  const itineraries = itinerariesData as Pick<
    Itinerary,
    "id" | "title" | "planned_date" | "location" | "created_at"
  >[] | null;
  const invites: InviteSummary[] = invitesData ?? [];

  const profileIds = (profiles ?? []).map((p) => p.id);
  const { data: preferencesData } =
    profileIds.length > 0
      ? await supabase
          .from("member_preferences")
          .select("id, group_member_profile_id, food_preference, activity_preference, environment_preference, other_preferences")
          .in("group_member_profile_id", profileIds)
      : { data: [] as MemberPreferences[] };
  const preferencesByProfileId = new Map<string, MemberPreferences>(
    ((preferencesData ?? []) as MemberPreferences[]).map((p) => [p.group_member_profile_id, p])
  );

  // This page's job is the trips. At rest it offers the back link, one
  // "Manage people" button, one trip field, one submit and the trips
  // themselves — administration (roster, claims, avatars, preferences,
  // invites) all lives one tap away inside PeopleSheet (§5.1).
  //
  // Up-navigation is PageHeader's `backHref` and nothing else.
  return (
    <AppShell
      email={user.email}
      pageHeader={
        <PageHeader
          backHref="/groups"
          backLabel="All groups"
          title={group.name}
          subtitle={`${memberCount ?? 0} member${memberCount === 1 ? "" : "s"}`}
          actions={
            // Wraps rather than replacing the leave form: the cover is
            // editable by any member, matching how itineraries and places
            // work, so this cannot hang off the !isCreator branch the way a
            // creator-only control would. For a creator this slot held
            // nothing before, so the page gains one control; for everyone
            // else it gains one beside the leave button, and flex-wrap is
            // what keeps that from crowding a long group name at 360px.
            <div className="flex flex-wrap items-center gap-2">
              <CoverSheet
                groupId={group.id}
                current={cover}
                isAnonymous={Boolean(user.is_anonymous)}
              />
              {!isCreator && (
                <form action={leaveGroup}>
                  <input type="hidden" name="groupId" value={group.id} />
                  {/* Leaving drops this group off your list entirely, and
                      getting back in needs a fresh invite link from the
                      creator — so it is the least reversible button on the
                      page and sits in the header, where a back-tap can land. */}
                  <ConfirmButton
                    pendingText="Leaving…"
                    announcement={`Leave ${group.name}? You would need a new invite link to get back in. Press again to confirm.`}
                  >
                    Leave group
                  </ConfirmButton>
                </form>
              )}
            </div>
          }
        />
      }
    >
      <PeopleSheet people={(profiles ?? []) as MemberProfile[]}>
        <MembersSection
          groupId={group.id}
          profiles={(profiles ?? []) as MemberProfile[]}
          preferencesByProfileId={preferencesByProfileId}
          currentUserId={user.id}
          isCreator={isCreator}
        />
        {isCreator && <InvitesSection groupId={group.id} invites={invites} />}
      </PeopleSheet>

      <Surface as="section" className="mb-8">
        <SectionHeading>Trips</SectionHeading>

        {/* One field, one button. The date and location inputs that used to
            sit here are gone: EditItineraryDetails edits both one screen
            deeper, so this form was a second editing surface for the same two
            columns — and it asked for them before anyone had decided the trip
            was real (§5.1). Naming it is the only required step. */}
        <form
          action={createItinerary}
          className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <input type="hidden" name="groupId" value={group.id} />
          <Field
            id="new-trip-title"
            label="Trip name"
            name="title"
            required
            maxLength={ITINERARY_TITLE_MAX_LENGTH}
            placeholder="Weekend ideas"
            className="min-w-0 flex-1"
          />
          <Button type="submit" pendingText="Creating…">
            Add a little trip
          </Button>
        </form>

        {/* The highest-stakes empty state in the app: somebody has just made
            a group and this is the first thing in it. So it explains what a
            trip is before asking for one — "add one above" alone assumes the
            reader already knows what they'd be adding. */}
        {(!itineraries || itineraries.length === 0) && (
          <EmptyState
            illustration={<TrailSpot />}
            title="Nothing planned yet"
            description="A little trip is one outing — a Saturday afternoon, a weekend away, a city you keep meaning to visit. Name one above and you can start collecting places to go."
          />
        )}
        {itineraries && itineraries.length > 0 && (
          // Two-up from sm:, with the newest trip spanning the full width and
          // set larger. The list is ordered newest-first, so the emphasis is
          // carrying real information rather than decorating the first row —
          // and it is what keeps this from being one more uniform stack of
          // identical boxes (DESIGN_VARIANCE 5).
          <ul className="grid gap-3 sm:grid-cols-2">
            {itineraries.map((it, i) => {
              // Featured only from three trips up. At two, the grid is exactly
              // one full row, so spanning the first across both columns leaves
              // the second stranded alone at half width and a smaller type size
              // — a hierarchy with nothing to rank. Two trips render as equals.
              const featured = i === 0 && itineraries.length > 2;
              const delay = revealDelay(i);
              // planned_date is a DATE column (formatDate, local midnight);
              // created_at is a timestamptz (formatTimestamp, UTC-pinned).
              // Mixing them up renders the wrong calendar day either side of
              // Greenwich — see lib/format.ts.
              const dateLabel = it.planned_date
                ? formatDate(parsePlannedDate(it.planned_date))
                : null;
              const meta =
                [dateLabel, it.location].filter(Boolean).join(" · ") ||
                `Added ${formatTimestamp(it.created_at)}`;
              return (
                // min-w-0 is what makes the break-words below actually work.
                // A grid item's default min-width is auto, i.e. it refuses to
                // shrink under its min-content width — and `overflow-wrap:
                // break-word` does not reduce min-content, it only breaks a
                // word that would overflow an already-established line box. So
                // a 100-character trip title with no space in it sized this
                // track to 1500px and scrolled the whole page sideways at
                // 360px. Measured, not theorised: the responsive sweep caught
                // it at 360 and 390.
                <Reveal
                  as="li"
                  key={it.id}
                  delay={delay}
                  className={`min-w-0 ${featured ? "sm:col-span-2" : ""}`}
                >
                  {/* Sunken, not .card-link: these rows sit inside this
                      section's own card, and a bordered, shadowed card
                      inside a bordered, shadowed card is §2.5 no. 5.
                      focus-visible repeats the hover tint, not just the ring,
                      so keyboard and pointer see the same affordance. */}
                  <Link
                    href={`/groups/${group.id}/itineraries/${it.id}`}
                    className="surface-sunken block h-full p-4 transition-colors duration-fast ease-entrance hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    {/* Two lines rather than one: these cells are half the
                        column wide from sm: up, where a single truncated line
                        cuts a 100-character trip title after about four words
                        — enough to make two differently-named Saturdays look
                        identical in the list. */}
                    <p
                      className={`line-clamp-2 break-words font-display text-primary ${
                        featured ? "text-display-md" : "text-title"
                      }`}
                      title={it.title}
                    >
                      {it.title}
                    </p>
                    <p className="mt-1 truncate text-label text-secondary" title={meta}>
                      {meta}
                    </p>
                  </Link>
                </Reveal>
              );
            })}
          </ul>
        )}
      </Surface>
    </AppShell>
  );
}
