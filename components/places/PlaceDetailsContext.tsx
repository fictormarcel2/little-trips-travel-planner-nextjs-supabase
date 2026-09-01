"use client";

import { createContext, useContext } from "react";

interface PlaceDetailsContextValue {
  openPlaceId: string | null;
  open: (placeId: string, triggerEl: HTMLElement | null) => void;
  close: () => void;
}

// PlaceCard is a Server Component and can't receive a callback prop from a
// Client Component ancestor directly — Context lets the small DetailsButton
// leaf (a Client Component PlaceCard renders as an ordinary child) reach the
// shared "which place's drawer is open" state owned by
// PlacesWithDetailsDrawer without prop-drilling through Server Components.
export const PlaceDetailsContext = createContext<PlaceDetailsContextValue | null>(null);

export function usePlaceDetails() {
  const ctx = useContext(PlaceDetailsContext);
  if (!ctx) {
    throw new Error("usePlaceDetails must be used within PlacesWithDetailsDrawer");
  }
  return ctx;
}
