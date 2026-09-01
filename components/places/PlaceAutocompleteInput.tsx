"use client";

import { useEffect, useId, useRef, useState } from "react";
import { loadPlacesLibrary } from "@/lib/google/loadGoogleMaps";
import { Field } from "@/components/ui/Field";
import type { PlacePhotoRef } from "@/types/place";

export interface PlaceSelection {
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  rating: number | null;
  ratingCount: number | null;
  // Set only when the selection came from PlaceRecommendationSearch, whose
  // searchByText() call already requests photos as part of the result —
  // present here lets AddPlaceForm skip a redundant fetchPlacePhotos call.
  photos?: PlacePhotoRef[];
}

export function PlaceAutocompleteInput({
  onSelect,
  onManualEdit,
}: {
  onSelect: (place: PlaceSelection) => void;
  onManualEdit: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const fieldId = useId();

  // AddPlaceForm passes a brand-new onSelect closure on every render (it's
  // not wrapped in useCallback there), and every keystroke here triggers a
  // parent re-render via onManualEdit. If this effect depended on [onSelect]
  // directly, the Autocomplete widget got torn down and recreated on every
  // keystroke — including while its dropdown was open — so a listener bound
  // to a since-destroyed instance often never fired on click, silently
  // leaving whatever raw text was last typed as the "selected" name instead
  // of the full place name. A ref sidesteps this: the widget is created
  // once on mount, and the listener always calls the latest onSelect
  // without the effect itself needing to depend on it.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    let listener: google.maps.MapsEventListener | undefined;

    loadPlacesLibrary()
      .then((places) => {
        if (cancelled || !inputRef.current) return;
        const autocomplete = new places.Autocomplete(inputRef.current, {
          fields: ["place_id", "geometry", "name", "formatted_address", "rating", "user_ratings_total"],
        });
        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          onSelectRef.current({
            name: place.name ?? inputRef.current?.value ?? "",
            address: place.formatted_address ?? null,
            latitude: place.geometry?.location?.lat() ?? null,
            longitude: place.geometry?.location?.lng() ?? null,
            googlePlaceId: place.place_id ?? null,
            rating: place.rating ?? null,
            ratingCount: place.user_ratings_total ?? null,
          });
        });
        setStatus("ready");
      })
      .catch((err) => {
        console.error("Failed to load Google Places", err);
        setStatus("error");
      });

    return () => {
      cancelled = true;
      listener?.remove();
    };
    // Deliberately empty — see comment above. Set up the widget once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The hint carries the rule that used to be invisible: a name typed without
  // taking a suggestion still saves, it just arrives with no address, no
  // coordinates and no Google rating attached. Nothing in the old
  // placeholder-only version said so.
  //
  // A dead Places library goes in the same slot rather than Field's `error`
  // slot on purpose — `error` also flips aria-invalid, and the input is not
  // invalid here. Typing a name and saving it is still a completely valid
  // thing to do; only the suggestions are missing.
  return (
    <Field
      id={fieldId}
      label="Place name"
      controlRef={inputRef}
      onChange={(e) => onManualEdit(e.target.value)}
      placeholder={
        status === "error" ? "Type the place name" : "Start typing a place name…"
      }
      hint={
        status === "error"
          ? "Place search is unavailable right now — type the name and save it as it is."
          : "Pick a suggestion to pull in its address, rating and photos — or just type a name."
      }
      autoComplete="off"
    />
  );
}
