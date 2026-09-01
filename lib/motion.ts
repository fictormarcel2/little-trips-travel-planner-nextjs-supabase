/**
 * The numeric half of the motion vocabulary. The curve and the three
 * durations live as custom properties in app/globals.css (and reach Tailwind
 * as `ease-entrance` / `duration-fast|base|slow`); the stagger figures have to
 * be real numbers because they end up in an inline `animation-delay`.
 *
 * This is a plain module on purpose, and that is load-bearing rather than
 * stylistic. `revealDelay` was first exported from components/ui/Reveal.tsx,
 * which carries "use client" — so a Server Component importing it got a client
 * *reference* rather than the function, and every page that called it inside a
 * .map() crashed at request time with "(0 , X.X) is not a function". Type
 * checking, lint and `next build` all passed; only loading the page showed it.
 * Anything a Server Component needs to *call* must live outside a "use client"
 * module, and that is what this file is for.
 */

/** Gap between one list row's entrance and the next. */
export const REVEAL_STAGGER_MS = 40;

/**
 * How many rows stagger before the delay stops growing. A 30-place itinerary
 * at 40ms a row would take 1.2 seconds to finish appearing, which stops being
 * a reveal and starts being a wait — everything past the eighth row enters
 * together, on the eighth row's delay.
 */
export const MAX_STAGGER_STEPS = 8;

/** Entrance delay for a list index, capped. Pass the map index straight in. */
export function revealDelay(index: number, stepMs: number = REVEAL_STAGGER_MS): number {
  return Math.min(index, MAX_STAGGER_STEPS - 1) * stepMs;
}

/**
 * Gap between the AI details sections as they cascade in. Wider than a list
 * row's: four sections, each a block of prose rather than a card, so they read
 * as a sequence instead of a ripple.
 */
export const SECTION_STAGGER_MS = 60;

/**
 * framer-motion values (imported from "motion/react" elsewhere) for the
 * three things CSS genuinely cannot do: animating a Sheet's unmount, its
 * drag-to-dismiss, and a card→page layoutId transition. Everything else
 * (list entrances, hover, focus) stays CSS — see docs/redesign/06-redesign-spec.md §6.
 *
 * Plain objects only, same rule as revealDelay above: this file must never
 * gain "use client".
 */
export const SHEET_SPRING = { type: "spring", stiffness: 380, damping: 34 } as const;
export const SHEET_EXIT = { duration: 0.2, ease: [0.4, 0, 1, 1] } as const;
export const LAYOUT_SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;
export const SCRIM_FADE = { duration: 0.2 } as const;
