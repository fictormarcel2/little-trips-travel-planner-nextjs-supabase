"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { PlaceDetailsContext } from "@/components/places/PlaceDetailsContext";
import { PlaceDetailsDrawer } from "@/components/places/PlaceDetailsDrawer";
import type { PlaceRecord } from "@/types/place";

// `children` is the itinerary page's entire already-server-rendered <main>
// (header, add-stop form, and the <ul> of PlaceCards), passed straight
// through unchanged — Next.js's supported "Server Components as Client
// Component children" composition, since that's already-rendered RSC
// output, not re-executed here. `places` is the separate plain-serializable
// array this wrapper needs to look up whichever place's drawer is
// currently open.
export function PlacesWithDetailsDrawer({
  places,
  children,
}: {
  places: PlaceRecord[];
  children: React.ReactNode;
}) {
  const [openPlaceId, setOpenPlaceId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const open = useCallback((placeId: string, triggerEl: HTMLElement | null) => {
    triggerRef.current = triggerEl;
    setOpenPlaceId(placeId);
  }, []);

  const close = useCallback(() => {
    setOpenPlaceId(null);
    triggerRef.current?.focus();
    triggerRef.current = null;
  }, []);

  const contextValue = useMemo(() => ({ openPlaceId, open, close }), [openPlaceId, open, close]);
  const openPlace = places.find((p) => p.id === openPlaceId) ?? null;

  return (
    <PlaceDetailsContext.Provider value={contextValue}>
      {/* The drawer is a fixed-width right panel over the viewport, but
          <main> is centered (mx-auto), not left-aligned — without this
          shift, the drawer visually covers the right edge of the content
          column (exactly where each PlaceCard's Details/Remove buttons
          live), making it impossible to click a *different* place's
          Details button to swap the drawer's content while it's open.
          Applied to this OUTER wrapper (around the whole <main>, not just
          the places list) so the entire block moves as one — <main> keeps
          its full max-w-2xl width, it just shifts left, rather than one
          inner section being squeezed narrower than the rest of the page.

          This used to animate a 28rem right margin instead. Same result on
          screen, but margin is a layout property: every frame of that
          transition re-ran layout for the whole page, including the places
          list, which is the most expensive thing on it. -translate-x-56 is
          14rem — exactly the offset that margin produced once mx-auto
          re-centered the narrowed column — and it composites without
          touching layout at all. (Class names deliberately not quoted in
          this comment: Tailwind scans these files as plain text, so naming a
          retired utility here is enough to keep emitting it.) Safe as a
          transform here because nothing
          inside this wrapper is position:fixed (the drawer is a sibling, and
          the paper-grain layer lives up in app/layout.tsx); a fixed
          descendant would have been trapped by the containing block a
          transform creates. */}
      <div
        className={`transition-transform duration-slow ease-entrance ${
          openPlaceId ? "xl:-translate-x-56" : ""
        }`}
      >
        {children}
      </div>
      <PlaceDetailsDrawer place={openPlace} onClose={close} />
    </PlaceDetailsContext.Provider>
  );
}
