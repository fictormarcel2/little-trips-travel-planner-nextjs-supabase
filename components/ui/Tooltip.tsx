import type { ReactNode } from "react";

const ALIGN_STYLES = {
  center: {
    bubble: "left-1/2 w-56 -translate-x-1/2 text-left",
    tail: "left-1/2 -translate-x-1/2",
  },
  end: {
    bubble: "right-0 w-max max-w-[10rem] text-center",
    tail: "right-2",
  },
} as const;

// Shared hover/focus tooltip — was previously duplicated near-identically
// across the app's tooltip sites. Currently used by the "added by" avatar
// badge; the other original caller was AiSummaryPanel's rating badges, which
// went away with that panel.
export function Tooltip({
  label,
  content,
  align = "center",
  className,
  children,
}: {
  label: string;
  content: ReactNode;
  align?: "center" | "end";
  className?: string;
  children: ReactNode;
}) {
  const styles = ALIGN_STYLES[align];
  return (
    // role="img" beside the aria-label: a focusable <span> with a label and no
    // role is announced inconsistently — some screen readers read the label,
    // others fall through to the contents. This is a labelled graphic, and
    // saying so is what makes the label reliably the thing that is read.
    <span
      role="img"
      tabIndex={0}
      aria-label={label}
      className={`group relative inline-flex items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent${className ? ` ${className}` : ""}`}
    >
      {children}
      {/* text-micro (12px), not an arbitrary 11px that sat below the bottom of
          the type scale. duration-fast rather than a bare duration-150, so
          this reads from the same motion vocabulary as everything else — and
          so the reduced-motion block in globals.css covers it. */}
      <span
        role="tooltip"
        aria-hidden
        // break-words: max-w-[10rem] alone caps the box, not the content —
        // a space-free string (a display name with no spaces, say) still
        // renders as one unbroken run at its intrinsic width. And this stays
        // in layout while "closed" (opacity-0, not hidden, so the transition
        // has something to fade), so an unwrapped long word here widens
        // document.scrollWidth on every page that renders one, at every
        // width — measured, not theoretical: hiding just this node dropped
        // scrollWidth 922 -> 360.
        className={`pointer-events-none absolute bottom-full z-10 mb-2 rounded-lg bg-inverse px-3 py-2 text-micro font-normal normal-case leading-snug text-on-inverse opacity-0 shadow-soft transition-opacity duration-fast ease-entrance group-hover:opacity-100 group-focus-visible:opacity-100 break-words ${styles.bubble}`}
      >
        {content}
        <span className={`absolute top-full -mt-px h-2 w-2 rotate-45 bg-inverse ${styles.tail}`} />
      </span>
    </span>
  );
}
