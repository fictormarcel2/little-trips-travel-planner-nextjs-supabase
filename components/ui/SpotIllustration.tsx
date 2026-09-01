import type { ReactNode } from "react";

/**
 * Line-drawn spot illustrations for empty states.
 *
 * Same drawing rules as components/ui/CompassMark.tsx — 24x24 box, pure
 * `currentColor` stroke, no fill, no gradient, no asset file and no network
 * request — so a spot and the brand mark read as one hand. They are decorative
 * (`aria-hidden`): every one of them sits directly above an EmptyState title
 * that says the same thing in words.
 *
 * Sized by the caller via className, like CompassMark, rather than by a `size`
 * prop, so an empty state can set its own scale without a new variant here.
 */
function Spot({
  className = "h-10 w-10",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** A winding trail ending in a pennant — "no trips planned yet". */
export function TrailSpot({ className }: { className?: string }) {
  return (
    <Spot className={className}>
      <path d="M3.5 19.5c3 0 3.3-3.4 6.3-3.4s3.3-4.1 6.4-4.1" />
      <circle cx="3.5" cy="19.5" r="1.4" />
      <path d="M16.2 12V4.2" />
      <path d="M16.2 4.8 20.9 6.4l-4.7 1.6" />
    </Spot>
  );
}

/** A two-armed signpost — "no stops on this trip yet". */
export function SignpostSpot({ className }: { className?: string }) {
  return (
    <Spot className={className}>
      <path d="M12 3.2v17.6" />
      <path d="M12 6h5.8l2.2 2.4-2.2 2.4H12" />
      <path d="M12 13.2H6.2L4 15.6 6.2 18H12" />
    </Spot>
  );
}

/** A paper plane — "no invite links yet", i.e. nothing sent to anyone. */
export function PaperPlaneSpot({ className }: { className?: string }) {
  return (
    <Spot className={className}>
      <path d="M20.8 3.2 3.6 10.1l6.4 3.9 3.9 6.4 6.9-17.2Z" />
      <path d="M20.8 3.2 10 14" />
    </Spot>
  );
}

/** Two figures side by side — "no groups yet", i.e. nobody to plan with. */
export function CompanionsSpot({ className }: { className?: string }) {
  return (
    <Spot className={className}>
      <circle cx="9" cy="8.4" r="3.1" />
      <path d="M3.4 19.4c.7-3 3-4.7 5.6-4.7s4.9 1.7 5.6 4.7" />
      <circle cx="17.2" cy="10.4" r="2.3" />
      <path d="M16.6 15.1c2 .2 3.5 1.6 4 3.6" />
    </Spot>
  );
}
