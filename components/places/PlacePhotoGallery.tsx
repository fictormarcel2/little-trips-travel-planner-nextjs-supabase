"use client";

import { useState } from "react";
import { PlacePhotoFallback } from "@/components/places/PlacePhotoFallback";
import type { PlacePhotoRef } from "@/types/place";

// Fades an <img> in once it's actually loaded, with a shimmering .skeleton
// placeholder underneath instead of the image popping in abruptly.
function FadeInImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && <div className="skeleton absolute inset-0" aria-hidden />}
      {/* loading="lazy": a 32-place itinerary is 32 Google photos, and every
          one of them was fetched on load however far down the page it sat.
          The .skeleton underneath is already the placeholder a deferred image
          needs, so this costs nothing visually. decoding="async" keeps the
          decode off the main thread as each one arrives. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`${className} ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}

// Google's photo attribution policy requires attribution to be "always
// visible and legible" — never hidden behind a hover/menu. This renders as
// a persistent bar under every photo, not a tooltip.
//
// Two things about the "legible" half of that requirement: the type is
// `micro` (12px) rather than an arbitrary 10px that sat below the bottom of
// the type scale entirely, and the scrim is --inverse at 70%. --inverse is a
// channel triple (spec §2.1), which is the only reason a /70 opacity modifier
// composes at all — as a hex-string token it would have rendered no
// background whatsoever.
//
// `text-on-inverse`, NOT `text-white`. The §2.5 rename table only lists the
// `bg-` half, because it was cut from a grep for raw scale names and
// `text-white` is not one — but --inverse *flips between themes*, so leaving
// the text hardcoded white puts white type on a near-white scrim in dark:
// measured 2.33:1, a hard failure. --inverse and --on-inverse are a pair and
// have to move together. Measured worst case for each theme, meaning the
// photo underneath is the one that fights the scrim hardest: 6.73:1 in light
// (blown-out white photo) and 8.41:1 in dark (pure black photo).
//
// This link is also the one focusable thing left in the gallery, and that is
// load-bearing rather than incidental: it is what lets a keyboard user reach
// and scroll each slide of the snap strip below, now that the arrows are gone.
function PhotoAttribution({ photo }: { photo: PlacePhotoRef }) {
  return (
    <p className="absolute inset-x-0 bottom-0 truncate bg-inverse/70 px-2 py-1 text-micro leading-tight text-on-inverse">
      Photo:{" "}
      {photo.attributionUri ? (
        <a
          href={photo.attributionUri}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {photo.attributionText}
        </a>
      ) : (
        photo.attributionText
      )}
    </p>
  );
}

/**
 * A CSS scroll-snap strip. **Zero buttons** — this used to be an expand
 * toggle, a "+N more" badge and a "Show less" button, three of the six
 * controls a PlaceCard carried (redesign spec §5.2).
 *
 * Swipe on touch, shift-scroll or a trackpad on desktop, and — because each
 * slide holds a focusable attribution link — Tab on a keyboard, which scrolls
 * the slide into view natively. No JS drives any of it, so there is nothing
 * to break when it is off.
 *
 * With more than one photo each slide is deliberately narrower than the
 * track, so the next one peeks in at the right edge. That peek *is* the
 * affordance: with no arrows and no dots, it is the only thing telling you
 * there is more to see, and it costs one class instead of a control.
 *
 * `overflow-x-auto` scrolls inside its own box, so a wide strip never widens
 * the card or gives the page a horizontal scrollbar.
 */
export function PlacePhotoGallery({
  photos,
  category,
  name,
}: {
  photos: PlacePhotoRef[];
  category: string;
  name: string;
}) {
  if (photos.length === 0) {
    return <PlacePhotoFallback category={category} className="h-40 w-full" />;
  }

  const multiple = photos.length > 1;

  return (
    <ul
      className="flex h-40 snap-x snap-mandatory gap-1 overflow-x-auto overflow-y-hidden"
      // A list of N photos rather than N loose images: without this the strip
      // announces as an unlabelled group of links, and the count — the thing
      // the vanished "+N more" badge used to carry — is lost entirely.
      aria-label={
        multiple ? `${photos.length} photos of ${name}` : `Photo of ${name}`
      }
    >
      {photos.map((photo, i) => (
        <li
          key={photo.url}
          className={`relative h-full shrink-0 snap-start ${
            multiple ? "w-[88%]" : "w-full"
          }`}
        >
          <FadeInImage
            src={photo.url}
            alt={multiple ? `${name} photo ${i + 1}` : name}
            className="h-full w-full object-cover"
          />
          <PhotoAttribution photo={photo} />
        </li>
      ))}
    </ul>
  );
}
