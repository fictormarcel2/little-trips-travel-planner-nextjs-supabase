import { CompassMark } from "@/components/ui/CompassMark";
import { placeCategoryLabel } from "@/types/place";

export function PlacePhotoFallback({
  category,
  className = "",
  compact = false,
}: {
  category: string;
  className?: string;
  /**
   * Drops the category caption, for the thumbnail-sized slots (the 64px
   * squares in the recommendation results) where a word set in it would wrap
   * to two clipped lines rather than reading as a label.
   */
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-surface-sunken to-surface-hover ${className}`}
    >
      {/* Contrast here has now been re-measured twice, and the caption has
          moved twice with it.

          First: off the dustyrose scale, where it measured 3.89:1 against the
          old cream gradient — under the 4.5:1 floor this palette holds itself
          to. --accent-on-tint fixed that at 7.33:1.

          Now: --accent-on-tint fails on the *Nocturne* gradient, but only in
          one theme, which is exactly how this sort of thing survives a
          review. Light is fine (5.96:1 sunken, 5.61:1 hover). Dark is 5.13:1
          against --surface-sunken and 4.22:1 against --surface-hover — so the
          caption would have passed at one end of its own gradient and failed
          at the other. --text-secondary clears both ends of both themes with
          room to spare: 9.36/8.82 light, 11.08/9.13 dark.

          The mark stays on --accent. It is a non-text graphic, so WCAG 1.4.11
          asks 3:1 of it rather than 4.5:1, and its worst end measures 4.42:1
          (light, against --surface-hover). */}
      <CompassMark className="h-6 w-6 text-accent" />
      {!compact && (
        <span className="px-2 text-center text-micro font-bold uppercase tracking-wide text-secondary">
          {placeCategoryLabel(category)}
        </span>
      )}
    </div>
  );
}
