"use client";

import { useEffect, useState } from "react";
import { StarRatingInline } from "@/components/places/StarRating";
import { PlaceDetailsContent } from "@/components/places/PlaceDetailsContent";
import { Badge } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Sheet";
import { placeCategoryLabel, type PlaceRecord } from "@/types/place";

/**
 * A single persistent drawer instance (not one per card), its open/closed
 * state and content driven entirely by `place`. Clicking a different place's
 * Details button just swaps `place`, which remounts PlaceDetailsContent via
 * its own key prop for fresh state, without the drawer shell closing.
 *
 * ── Why modal={false} ─────────────────────────────────────────────────────
 *
 * This is the whole reason `Sheet` has the flag. The affordance above is the
 * contract: with a scrim and a focus trap, "click another place's Details to
 * swap what the drawer is showing" stops working. So from `xl` up there is no
 * scrim, no trap and no scroll lock, and the page beside the panel stays
 * fully operable — `PlacesWithDetailsDrawer` shifts that page left by
 * `xl:-translate-x-56` so the two clear each other. Below `xl` the panel
 * covers most of the column, the affordance is out of reach anyway, and
 * `Sheet` renders a light-dismiss backdrop instead. Escape closes at every
 * width, in both modes.
 *
 * `aria-modal="false"` is stated rather than left to the default, and `Sheet`
 * emits it from the same flag: role="dialog" alone reads as a promise of
 * modality this deliberately does not keep. Nothing behind it is inert, focus
 * is not trapped, and nothing is ever hidden from assistive technology.
 *
 * The width is arithmetically load-bearing and lives in `Sheet` now:
 * `max-w-md` (448px) is what the 14rem page-shift was derived from. There is
 * no offset that works at both 1024 and 1280 — see the comment in
 * PlacesWithDetailsDrawer — which is why the shift starts at `xl` and must
 * not be lowered to `lg`.
 */
export function PlaceDetailsDrawer({
  place,
  onClose,
}: {
  place: PlaceRecord | null;
  onClose: () => void;
}) {
  // `Sheet` animates its own unmount via AnimatePresence, and `place` goes
  // null the instant the drawer is asked to close — so rendering straight
  // from `place` would empty the panel on frame one and slide an empty box
  // off screen. Holding the last non-null place keeps the contents up for the
  // length of the exit. It is never shown while closed: the panel is
  // unmounted (no keepMounted here — unlike the add-stop sheet there is no
  // live third-party widget to preserve, and PlaceDetailsContent should get
  // fresh state per place anyway).
  const [lastPlace, setLastPlace] = useState<PlaceRecord | null>(place);
  useEffect(() => {
    if (place) setLastPlace(place);
  }, [place]);

  const shown = place ?? lastPlace;

  return (
    <Sheet
      open={place !== null}
      onClose={onClose}
      // Sheet's title becomes the panel's <h2> and its accessible name. Both
      // were verified behaviours of the drawer this replaces, and the heading
      // level matters: PlaceDetailsContent's sections are h3s, so a <p> here
      // would leave them hanging under the page's h2 two sections away.
      title={shown?.name ?? "Place details"}
      modal={false}
    >
      {shown && (
        <>
          {/* Category and rating sat in the drawer's own header bar before.
              Sheet owns that bar (title + close button), so they move to the
              top of the scrolling body — same reading order, one less bespoke
              header in the app. */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge>{placeCategoryLabel(shown.category)}</Badge>
            <StarRatingInline rating={shown.rating} ratingCount={shown.rating_count} />
          </div>
          <PlaceDetailsContent key={shown.id} place={shown} />
        </>
      )}
    </Sheet>
  );
}
