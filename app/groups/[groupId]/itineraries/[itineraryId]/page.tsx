import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddStopSheet } from "@/components/places/AddStopSheet";
import { PlaceCard } from "@/components/places/PlaceCard";
import { PlacesWithDetailsDrawer } from "@/components/places/PlacesWithDetailsDrawer";
import { WeatherSummary } from "@/components/itineraries/WeatherSummary";
import { EditItineraryDetails } from "@/components/itineraries/EditItineraryDetails";
import { AppShell } from "@/components/ui/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SignpostSpot } from "@/components/ui/SpotIllustration";
import { Reveal } from "@/components/ui/Reveal";
import { revealDelay } from "@/lib/motion";
import { formatDateLong, parsePlannedDate } from "@/lib/format";
import type { Itinerary } from "@/types/itinerary";
import type { PlaceRecord } from "@/types/place";
import { preferenceSearchTerms, type MemberProfile, type MemberPreferences } from "@/types/member";

export default async function ItineraryPage({
  params,
}: {
  params: { groupId: string; itineraryId: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        `/groups/${params.groupId}/itineraries/${params.itineraryId}`
      )}`
    );
  }

  // RLS scopes this to itineraries whose group the user belongs to — a
  // non-member (or a mismatched/foreign itineraryId) simply gets no row.
  const { data: itineraryData } = await supabase
    .from("itineraries")
    .select("id, title, planned_date, location, weather, chosen_place_id, group_id, created_at")
    .eq("id", params.itineraryId)
    .maybeSingle();

  if (!itineraryData || itineraryData.group_id !== params.groupId) {
    notFound();
  }
  const itinerary = itineraryData as Pick<
    Itinerary,
    | "id"
    | "title"
    | "planned_date"
    | "location"
    | "weather"
    | "chosen_place_id"
    | "group_id"
    | "created_at"
  >;

  // All three only need fields already in hand from the itinerary row above
  // (itinerary.id / itinerary.group_id) — none depends on another's result, so
  // they run together.
  const [{ data: placesData }, { data: profilesData }, { data: preferencesData }] =
    await Promise.all([
      supabase
        .from("places")
        .select(
          "id, name, category, address, latitude, longitude, google_place_id, user_notes, ai_details, photo_refs, rating, rating_count, rating_source, added_by, added_by_profile_id, created_at"
        )
        .eq("itinerary_id", itinerary.id)
        .order("created_at", { ascending: false }),
      // Resolves places.added_by_profile_id to a display name/avatar for the
      // "who added this" badge on each PlaceCard. Keyed by profile id, not
      // claimed_by_user_id — added_by_profile_id is fixed at creation time (see
      // the migration file), so it must still resolve correctly even if that
      // profile is later reclaimed by someone else or released back to
      // unclaimed; a claimed_by_user_id-keyed map would follow the *current*
      // claimant instead, which is exactly the "added by" badge changing out
      // from under you that this was built to avoid. Can come back null (no
      // match) for places added before this column existed, or by an
      // email-authenticated user who never claimed a name — AddedByBadge
      // already handles that gracefully.
      supabase
        .from("group_member_profiles")
        .select("id, group_id, display_name, avatar_url, claimed_by_user_id")
        .eq("group_id", itinerary.group_id),
      // Feeds AddStopSheet's suggestion chips. Filtered through an inner join on
      // the parent profile's group rather than `.in(profileIds)` so it does not
      // have to wait on the profiles query above and can run in this same batch.
      supabase
        .from("member_preferences")
        .select(
          "food_preference, activity_preference, environment_preference, group_member_profiles!inner(group_id)"
        )
        .eq("group_member_profiles.group_id", itinerary.group_id),
    ]);
  // Chosen-first, ordered in JS rather than in SQL: the marker lives on the
  // itinerary row, so sorting by it in the query would mean a join or a
  // second round trip to reorder at most a few dozen rows. Array.prototype
  // .sort is stable, so the created_at desc order above survives among
  // everything else — and with nothing chosen, every comparison is 0 and the
  // list is untouched.
  const places =
    (placesData as PlaceRecord[] | null)
      ?.slice()
      .sort(
        (a, b) =>
          Number(b.id === itinerary.chosen_place_id) -
          Number(a.id === itinerary.chosen_place_id)
      ) ?? null;
  // Resolved from the rows in hand rather than trusted from the column: a
  // chosen place that has since been deleted leaves chosen_place_id null via
  // the FK's on delete set null, but a page rendered from a stale cache would
  // otherwise print a name for a stop that is gone.
  const chosenPlace = places?.find((p) => p.id === itinerary.chosen_place_id) ?? null;
  const profileById = new Map<string, MemberProfile>(
    ((profilesData ?? []) as MemberProfile[]).map((p) => [p.id, p])
  );
  type PreferenceRow = Pick<
    MemberPreferences,
    "food_preference" | "activity_preference" | "environment_preference"
  >;
  const suggestedTerms = preferenceSearchTerms((preferencesData ?? []) as PreferenceRow[]);

  return (
    // Wraps the whole page (not just the places list) so the details-drawer
    // content-shift (see PlacesWithDetailsDrawer) repositions the entire
    // max-w-2xl column as a block, rather than squeezing just the list
    // section into a narrower width than the header/add-stop form above it.
    // AppShell sits inside it, so the persistent header shifts with the rest.
    <PlacesWithDetailsDrawer places={places ?? []}>
      <AppShell
        email={user.email}
        pageHeader={
          <PageHeader
            backHref={`/groups/${itinerary.group_id}`}
            backLabel="Back to group"
            title={itinerary.title}
            // The two things you can *do* to a trip, both of them one button
            // opening one sheet. Between them they replace an inline
            // ten-control add-stop form that sat above the stops themselves,
            // and an inline edit toggle that sprouted two more fields in the
            // meta slot below (spec §5.2).
            actions={
              <>
                <AddStopSheet itineraryId={itinerary.id} suggestedTerms={suggestedTerms} />
                <EditItineraryDetails
                  itineraryId={itinerary.id}
                  title={itinerary.title}
                  plannedDate={itinerary.planned_date}
                  location={itinerary.location}
                />
              </>
            }
            meta={
              <>
                {/* The answer to "so where are we going", above the trip's
                    date and weather because it is the thing the group came
                    back to the page to check. */}
                {chosenPlace && (
                  <p className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge tone="positive">Going</Badge>
                    {/* min-w-0 + truncate for the same reason as the location
                        below: a 200-character name (PLACE_NAME_MAX_LENGTH)
                        otherwise sets this row's width to its content. */}
                    <span
                      className="min-w-0 truncate text-body font-semibold text-primary"
                      title={chosenPlace.name}
                    >
                      {chosenPlace.name}
                    </span>
                  </p>
                )}
                {(itinerary.planned_date || itinerary.location) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {itinerary.planned_date && (
                      <Badge tone="accent">
                        {formatDateLong(parsePlannedDate(itinerary.planned_date))}
                      </Badge>
                    )}
                    {itinerary.location && (
                      // A 200-character location (ITINERARY_LOCATION_MAX_LENGTH)
                      // sits on the same wrapping row as the date badge; without
                      // min-w-0 the truncate below never engages, because a flex
                      // item's default min-width is its content.
                      <span
                        className="min-w-0 truncate text-body text-secondary"
                        title={itinerary.location}
                      >
                        {itinerary.location}
                      </span>
                    )}
                  </div>
                )}
                <WeatherSummary
                  itineraryId={itinerary.id}
                  weather={itinerary.weather}
                  plannedDate={itinerary.planned_date}
                  location={itinerary.location}
                />
              </>
            }
          />
        }
      >
        {(!places || places.length === 0) ? (
          // Points at the "Add a stop" button in the header rather than at a
          // form, which is no longer on the page — and it still spends its
          // first line saying what a "stop" even is, since nothing else here
          // does.
          <EmptyState
            illustration={<SignpostSpot />}
            title="No stops yet"
            description="Stops are the places you're weighing up — a café, a viewpoint, somewhere to swim. Hit “Add a stop” up top to search one by name, or ask for ideas and add the ones you like."
          />
        ) : (
          <ul className="space-y-4">
            {places.map((place, i) => (
              // Only a newly added stop animates on its own: it arrives as a
              // brand-new DOM node while every row already on screen keeps
              // its own and stays put — including when picking a stop
              // reorders the list, since these are keyed by place id and a
              // move is not an insert. See components/ui/Reveal.tsx.
              <Reveal as="li" key={place.id} delay={revealDelay(i)}>
                <PlaceCard
                  place={place}
                  itineraryId={itinerary.id}
                  chosen={place.id === itinerary.chosen_place_id}
                  addedByProfile={
                    place.added_by_profile_id
                      ? (profileById.get(place.added_by_profile_id) ?? null)
                      : null
                  }
                />
              </Reveal>
            ))}
          </ul>
        )}
      </AppShell>
    </PlacesWithDetailsDrawer>
  );
}
