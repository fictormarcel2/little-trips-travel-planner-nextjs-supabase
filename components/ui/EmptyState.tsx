import type { ReactNode } from "react";
import { CompassMark } from "@/components/ui/CompassMark";

export interface EmptyStateProps {
  /** What is missing, in the app's own words. Not "No data". */
  title: string;
  /** What the missing thing *is*, and how to get one. */
  description: string;
  /** A spot from components/ui/SpotIllustration.tsx. Falls back to the mark. */
  illustration?: ReactNode;
}

/**
 * An empty state is the first thing a new group, a new trip, and a new invite
 * list all show, so it is the surface most likely to be somebody's first
 * impression of this app — and it used to be one grey sentence in a dashed
 * box, which is the shape of a component that ran out of ideas.
 *
 * Three parts, all required: a drawn spot, a title that names what is
 * missing, and a description that says what the thing is and where to get
 * one. Callers write their own copy for each — there is deliberately no
 * default title or description, because "No items yet" three times is the
 * pattern this replaced.
 *
 * No `action` prop (§5.3): every call site already sits next to the control
 * that fills it, so a second one here would duplicate it rather than help.
 *
 * Sunken rather than a dashed outline: every one of these sits inside a
 * Surface, and a dashed box inside a card is one more frame (§2.5 no. 5). The
 * tone steps down instead, the same move Panel makes.
 */
export function EmptyState({
  title,
  description,
  illustration,
}: EmptyStateProps) {
  return (
    <div className="surface-sunken flex flex-col items-center gap-4 px-6 py-10 text-center">
      <span aria-hidden className="text-accent">
        {illustration ?? <CompassMark className="h-9 w-9" />}
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="font-display text-title text-primary">{title}</p>
        {/* ~36 characters is a readable measure at this type size; inside a
            card on a 360px phone the column is narrower than that anyway, so
            this only ever bites on desktop. */}
        <p className="mx-auto max-w-[36ch] text-body text-secondary">{description}</p>
      </div>
    </div>
  );
}
