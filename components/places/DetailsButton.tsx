"use client";

import { useRef } from "react";
import { usePlaceDetails } from "@/components/places/PlaceDetailsContext";
import { buttonClasses } from "@/components/ui/buttonStyles";

// Rendered as the card's primary action. It used to be the smaller of the
// two buttons on a card, below a full-size "Remove" — an inversion, since
// this is what people open a place for and Remove is destructive and
// irreversible.
export function DetailsButton({ placeId }: { placeId: string }) {
  const { open, openPlaceId } = usePlaceDetails();
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={() => open(placeId, btnRef.current)}
      aria-expanded={openPlaceId === placeId}
      // Uses buttonClasses() to ensure consistent primary button styling.
      // The px-4 py-2 text-sm overrides it used to carry put it at a
      // different size from every other primary button in the app for no
      // reason anyone recorded; the class already ships min-h-11.
      className={buttonClasses({ variant: "primary" })}
    >
      Details
    </button>
  );
}
