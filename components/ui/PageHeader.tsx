import type { ReactNode } from "react";
import Link from "next/link";

export interface PageHeaderProps {
  title: string;
  /** One line of prose describing the page, directly under the title. */
  subtitle?: string;
  /**
   * Things that annotate the title rather than describe it — a date badge, a
   * location, a weather line. Rendered below the title/actions row so a long
   * title and a wide action never fight it for the same line.
   */
  meta?: ReactNode;
  backHref?: string;
  backLabel?: string;
  /** Page-level actions, e.g. "Leave group". */
  actions?: ReactNode;
}

/**
 * The contextual header for a route, replacing the hand-written <header>
 * blocks that each page used to carry its own version of. Every page inside
 * `AppShell` gets the same rhythm: back link, title, actions, meta.
 */
export function PageHeader({
  title,
  subtitle,
  meta,
  backHref,
  backLabel = "Back",
  actions,
}: PageHeaderProps) {
  return (
    <header className="mb-10">
      {/* mb-3, not mb-5: the back link grew to a 44px touch target, and its
          label sits centred in that box, so it now brings ~9px of its own
          space to the gap below it.

          Absorbed from the deleted BackLink.tsx (§5.3, its only call site) —
          the min-h-11, the focus-on-top-of-hover arrow nudge, and the
          ring-offset-surface-page below are load-bearing behaviour carried
          over, not restyling. */}
      {backHref && (
        <div className="mb-3">
          <Link
            href={backHref}
            // text-accent, not terracotta-500: that step measures 4.46:1 as
            // text and was retired from every accent role in Phase 1 (§2.5
            // no. 6).
            // min-h-11. This measured 26px tall, and on a phone it is the
            // only way back up a level — the one control on the page that
            // has to be easy to hit. Nothing sits directly above or below
            // it, so the box simply grows rather than needing the
            // pseudo-element trick the dense pill rows use.
            className="group inline-flex min-h-11 items-center gap-1.5 rounded-lg text-label font-semibold text-accent transition duration-fast ease-entrance hover:text-accent-hover focus-visible:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
          >
            {/* The arrow nudges on focus as well as hover — it is the only
                thing on this link that moves, so a keyboard user losing it
                would be losing the affordance itself, not a flourish. */}
            <span className="inline-block transition-transform duration-fast ease-entrance group-hover:-translate-x-0.5 group-focus-visible:-translate-x-0.5">
              &larr;
            </span>
            {backLabel}
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          {/* Upright, not italic. Italic Fraunces is reserved for the Persuade
              surfaces (`/`, `/login`, `/join`) — when every h1 in the app
              slants, the slant stops carrying information (§2.4).

              Clamped to two lines, with the full string on `title`. Group
              names and trip titles both run to 100 characters
              (lib/constraints.ts), and 100 characters of display-lg on a
              360px screen is roughly five lines — an h1 that fills the fold
              on its own and pushes every actual control below it. `break-words`
              stays alongside the clamp: clamping caps how many lines render,
              not how wide one line may get, so a single unbroken 100-character
              token would still escape sideways without it. */}
          <h1
            className="line-clamp-2 break-words font-display text-display-lg text-primary"
            title={title}
          >
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-body text-secondary">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>

      {meta && <div className="mt-4">{meta}</div>}
    </header>
  );
}
