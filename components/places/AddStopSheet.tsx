"use client";

import { useState } from "react";
import { AddPlaceForm } from "@/components/places/AddPlaceForm";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

/**
 * The whole density win of the Nocturne redesign, in one component.
 *
 * `AddPlaceForm` used to be mounted inline on the trip page — three numbered
 * steps, a tablist, two panels, a select, a textarea and a submit, about ten
 * controls, sitting *above* the stops the page exists to show. It is now one
 * button (redesign spec §5.2).
 *
 * ── keepMounted is not optional, once open ────────────────────────────────
 *
 * `PlaceAutocompleteInput` creates a `google.maps.places.Autocomplete` bound
 * to a live `<input>` node, once, on mount — that widget's effect has an
 * empty dependency array precisely so it is never rebuilt (see the long
 * comment there about the dropdown tearing down mid-click). If this sheet
 * unmounted on close, every reopen would destroy and re-create the widget:
 * a fresh network round-trip and the exact class of bug that file already
 * goes out of its way to avoid.
 *
 * `Sheet` covers the cost of keeping it mounted: the panel gets `inert` the
 * instant it closes and the native `hidden` attribute once the close
 * animation settles, so nothing inside is focusable or hit-testable while the
 * sheet is shut.
 *
 * `AddPlaceForm` is gated behind `everOpened` rather than mounted
 * unconditionally: mounting it eagerly ran `PlaceAutocompleteInput`'s effect
 * — and its `loadPlacesLibrary()` call — on every itinerary page view,
 * whether or not "Add a stop" was ever clicked. `everOpened` flips once, on
 * first open, and never back, so the widget still gets created exactly once
 * and survives every close/reopen after that.
 */
export function AddStopSheet({
  itineraryId,
  suggestedTerms,
}: {
  itineraryId: string;
  /** The group's saved preferences, as opt-in chips on the "Get ideas" search. */
  suggestedTerms: string[];
}) {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
          setEverOpened(true);
        }}
      >
        Add a stop
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Add a stop"
        keepMounted={everOpened}
      >
        {everOpened && (
          <AddPlaceForm
            itineraryId={itineraryId}
            suggestedTerms={suggestedTerms}
            onAdded={() => setOpen(false)}
          />
        )}
      </Sheet>
    </>
  );
}
