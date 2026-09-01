import { deletePlace } from "@/lib/actions/places";
import { setChosenPlace } from "@/lib/actions/itineraries";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { StarRating } from "@/components/places/StarRating";
import { PlacePhotoGallery } from "@/components/places/PlacePhotoGallery";
import { AddedByBadge } from "@/components/places/AddedByBadge";
import { DetailsButton } from "@/components/places/DetailsButton";
import { EditableNotes } from "@/components/places/EditableNotes";
import { formatCount } from "@/lib/format";
import { isValidAiDetails, type AiDetails } from "@/types/ai";
import { placeCategoryLabel, type PlaceRecord } from "@/types/place";
import type { MemberProfile } from "@/types/member";

export function PlaceCard({
  place,
  itineraryId,
  chosen = false,
  addedByProfile,
}: {
  place: PlaceRecord;
  itineraryId: string;
  /** This is the stop the group settled on — itineraries.chosen_place_id. */
  chosen?: boolean;
  addedByProfile: Pick<MemberProfile, "display_name" | "avatar_url"> | null;
}) {
  // The card shows only the price badge and a one-line teaser from the AI
  // details; everything else lives in the drawer, so a place with a full
  // write-up doesn't turn its card into a wall of text.
  const details: AiDetails | null = isValidAiDetails(place.ai_details)
    ? place.ai_details
    : null;
  const priceRange =
    details?.priceRange && details.priceRange !== "unknown" ? details.priceRange : null;

  // Every field this needs is already stored and already selected, so the
  // link costs nothing but the anchor. query_place_id pins the result to the
  // exact establishment; the text query alone would resolve "Bar" in a big
  // city to somewhere else entirely, so it is only the fallback for rows
  // added by hand, which have no google_place_id. The origin and scheme are
  // fixed literals and both user-supplied parts are percent-encoded, so
  // nothing here can steer the href the way a raw stored URL could — see the
  // parsePhotoRefs note in CLAUDE.md for the version of this that bit.
  const mapsUrl =
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(
      place.google_place_id ? place.name : [place.name, place.address].filter(Boolean).join(" ")
    ) +
    (place.google_place_id
      ? "&query_place_id=" + encodeURIComponent(place.google_place_id)
      : "");

  return (
    // An <article>, not the <li> it used to be: the itinerary page now wraps
    // each card in a <Reveal as="li"> for its staggered entrance, and the
    // list row and the card can't be the same element without nesting an <li>
    // inside an <li>. Semantically unchanged — ul > li > article is still a
    // list of self-contained cards.
    <article className="card">
      {/* overflow-hidden lives on this wrapper, not the <article>, so it only
          clips the cover photo to the card's rounded top corners — putting
          it on the card itself would also clip anything that visually
          escapes its box further down, like AddedByBadge's tooltip. */}
      <div className="overflow-hidden rounded-t-xl2">
        <PlacePhotoGallery
          photos={place.photo_refs}
          category={place.category}
          name={place.name}
        />
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* line-clamp-2, and `break-words` beside it: a 200-character name
                (PLACE_NAME_MAX_LENGTH) with no space in it — a URL pasted into
                the manual-entry field, say — clamps to two lines and then
                overflows them sideways, because clamping caps the number of
                lines, not the width of one. */}
            <p
              className="line-clamp-2 break-words font-display text-xl leading-snug text-primary"
              title={place.name}
            >
              {place.name}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {/* First badge in the row, and the only positive tone on the
                  page: the whole point of the marker is to be findable at a
                  glance while scrolling a list of candidates. */}
              {chosen && <Badge tone="positive">We&rsquo;re going here</Badge>}
              <Badge>{placeCategoryLabel(place.category)}</Badge>
              {priceRange && <Badge tone="accent">{priceRange}</Badge>}
            </div>
          </div>
          <AddedByBadge profile={addedByProfile} />
        </div>

        {/* The rating is the card's loudest element after the name: it's the
            one piece of information here that is neither guessed nor typed by
            a group member. StarRating carries the full accessible label, so
            the numerals beside it are decorative duplicates. */}
        {place.rating != null && (
          <div className="mt-3 flex items-center gap-2.5">
            <span
              aria-hidden
              className="font-display text-3xl leading-none text-primary"
            >
              {place.rating.toFixed(1)}
            </span>
            <span className="flex flex-col gap-1">
              <StarRating rating={place.rating} ratingCount={place.rating_count} size="lg" />
              <span aria-hidden className="text-label text-secondary">
                {place.rating_count != null
                  ? `${formatCount(place.rating_count)} Google reviews`
                  : "on Google"}
              </span>
            </span>
          </div>
        )}

        {place.address && (
          <p className="mt-2.5 truncate text-body text-secondary" title={place.address}>
            {place.address}
          </p>
        )}

        {details && (
          <p className="mt-2 line-clamp-2 text-body italic text-secondary">
            {details.whatItsLike}
          </p>
        )}

        <EditableNotes
          placeId={place.id}
          itineraryId={itineraryId}
          initialNotes={place.user_notes}
        />

        {/* Actions get their own row rather than a shrink-0 right-hand column.
            The old column was ~95px wide and never collapsed, which left the
            content beside it about 160px on a 360px phone — and it rendered
            the destructive Remove larger than Details, the action people
            actually came for. */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-subtle pt-3">
          <DetailsButton placeId={place.id} />

          {/* The stop that isn't chosen offers the choice; the chosen one
              already wears the badge, and its undo lives in the overflow
              below with the other rarely-wanted action. */}
          {!chosen && (
            <form action={setChosenPlace}>
              <input type="hidden" name="itineraryId" value={itineraryId} />
              <input type="hidden" name="placeId" value={place.id} />
              {/* A page renders one of these per stop, so the accessible name
                  has to say *which* stop. The visible text is a prefix of the
                  full name rather than being replaced by an aria-label, which
                  would break WCAG 2.5.3's label-in-name for anyone driving
                  this by voice. Same pattern on the Maps link below. */}
              <Button type="submit" variant="secondary" pendingText="Saving…">
                Pick this one<span className="sr-only">: {place.name}</span>
              </Button>
            </form>
          )}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: "ghost" })}
          >
            Open in Maps<span className="sr-only">: {place.name}</span>
          </a>

          {/* Remove moved behind an overflow (spec §5.2: a card's six controls
              become about three). Deliberately a native <details>, not a
              hand-rolled menu: <summary> is focusable, toggles on Enter and
              Space, exposes its own expanded state, and needs no JavaScript —
              so this file stays a Server Component and there is no focus trap
              to get wrong. It is a disclosure rather than role="menu"
              precisely because it holds a form, and a real menu may not.

              Opens downward. Upward would cover the card's own notes and
              rating; downward it spills into the gap between cards, which is
              empty. z-20 clears the sibling card below it. */}
          <details className="relative ml-auto">
            <summary
              // A bare glyph button with no name is the failure mode the brief
              // calls out. The place name is in there because a list of stops
              // otherwise offers a dozen identically-named "More actions".
              aria-label={`More actions for ${place.name}`}
              className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full text-muted transition duration-fast ease-entrance hover:bg-surface-hover hover:text-primary focus-visible:bg-surface-hover focus-visible:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-details-marker]:hidden"
            >
              <span aria-hidden className="text-xl leading-none">
                ⋯
              </span>
            </summary>
            <div className="absolute right-0 top-full z-20 mt-2 w-max space-y-1 rounded-xl2 border border-subtle bg-surface-elevated p-2 shadow-elevated">
              {/* Not a ConfirmButton: un-choosing destroys nothing and the
                  button that puts it back is one click away on the same card.
                  The two-step is reserved for the irreversible one below. */}
              {chosen && (
                <form action={setChosenPlace}>
                  <input type="hidden" name="itineraryId" value={itineraryId} />
                  <input type="hidden" name="placeId" value="" />
                  <Button
                    type="submit"
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    pendingText="Saving…"
                  >
                    Un-pick<span className="sr-only">: {place.name}</span>
                  </Button>
                </form>
              )}
              <form action={deletePlace}>
                <input type="hidden" name="placeId" value={place.id} />
                <input type="hidden" name="itineraryId" value={itineraryId} />
                {/* Any group member can delete any place, including one
                    somebody else added — so this is the mis-tap that costs
                    someone else their work, and it asks first. Still a
                    ConfirmButton, never a bare submit: burying it one level
                    deeper is not a substitute for the two-step, because the
                    menu opens on a single click and the button underneath
                    would then be one more click from gone. The announcement
                    names the place, since the live region has no visual
                    context to lean on. */}
                <ConfirmButton
                  size="sm"
                  className="w-full"
                  pendingText="Removing…"
                  announcement={`Remove ${place.name} from this trip? Press again to confirm.`}
                >
                  Remove
                </ConfirmButton>
              </form>
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}
