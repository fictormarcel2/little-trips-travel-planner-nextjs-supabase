import { CompassMark } from "@/components/ui/CompassMark";

/**
 * The brand mark as a taped-on tag: the shared opening move of the three
 * Persuade surfaces (`/`, `/login`, `/join/[token]`), so they read as one
 * family instead of three unrelated pages that happen to share a palette.
 *
 * The slight rotation is the scrapbook cue — a label stuck on slightly
 * crooked. It is real text, never an image, and the tint/text pair is the
 * contrast-verified one from components/ui/Badge.tsx (8.00:1).
 *
 * Deliberately *not* the same treatment as components/ui/AppHeader.tsx's
 * wordmark: that one is navigation inside a working surface and stays quiet.
 * This one is the first thing on the page and is allowed to have a voice.
 */
export function BrandTag({ className = "" }: { className?: string }) {
  const classes = [
    "inline-flex -rotate-1 items-center gap-2 rounded-full bg-accent-tint px-3.5 py-1.5 text-label font-bold uppercase tracking-widest text-accent-on-tint",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <p className={classes}>
      <CompassMark className="h-3.5 w-3.5" />
      Little Trips
    </p>
  );
}
