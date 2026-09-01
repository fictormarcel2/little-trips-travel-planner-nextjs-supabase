"use client";

import { useState } from "react";
import { updateItinerary } from "@/lib/actions/itineraries";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { ITINERARY_LOCATION_MAX_LENGTH } from "@/lib/constraints";

/**
 * Trip settings. This used to be an inline toggle that swapped a button for a
 * sunken panel of inputs wedged into the page header's meta slot — a reading
 * surface and an editing surface competing for the same space. The governing
 * rule of the Nocturne IA is that a page shows what is true and a sheet is
 * where you change it (spec §5), so the form moved into one.
 */
export function EditItineraryDetails({
  itineraryId,
  title,
  plannedDate,
  location,
}: {
  itineraryId: string;
  title: string;
  plannedDate: string | null;
  location: string | null;
}) {
  const [open, setOpen] = useState(false);
  const hasDetails = Boolean(plannedDate || location);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {hasDetails ? "Trip settings" : "Add date & location"}
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Trip settings">
        <form
          action={async (formData) => {
            await updateItinerary(formData);
            setOpen(false);
          }}
          className="flex flex-col gap-5"
        >
          <input type="hidden" name="itineraryId" value={itineraryId} />
          <input type="hidden" name="title" value={title} />

          {/* One column, not the sm:grid-cols-2 this had. The sheet is 448px
              at its widest and a full-bleed bottom sheet below that, so two
              tracks would put a date picker and a 200-character location
              field in about 180px each. */}
          <Field
            id={`plannedDate-${itineraryId}`}
            label="Date"
            name="plannedDate"
            type="date"
            defaultValue={plannedDate ?? ""}
          />
          <Field
            id={`location-${itineraryId}`}
            label="Location"
            name="location"
            defaultValue={location ?? ""}
            maxLength={ITINERARY_LOCATION_MAX_LENGTH}
            placeholder="e.g. Aachen"
          />

          {/* Save only. The Cancel button that sat beside it was a third way
              to do what the sheet's own close button and Escape already do. */}
          <Button type="submit" pendingText="Saving…">
            Save
          </Button>
        </form>
      </Sheet>
    </>
  );
}
