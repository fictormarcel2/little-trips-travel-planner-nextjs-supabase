"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Wraps a framer-motion subtree so its animations respect the OS-level
 * prefers-reduced-motion setting.
 *
 * The app already has a global reduced-motion net in app/globals.css
 * (`transition-duration: 0.01ms !important` under
 * `@media (prefers-reduced-motion: reduce)`), but that only reaches CSS
 * transitions/animations. framer-motion animates via inline styles / WAAPI,
 * which that block cannot touch — so without this, a reduced-motion user
 * would silently get full motion on every Sheet regardless of the CSS layer.
 * Neither layer replaces the other; both must exist.
 *
 * Deliberately NOT mounted in app/layout.tsx — that would make the root
 * layout a client component. Instead, wrap each framer tree at its own root.
 * Sheet.tsx does this itself, so any consumer of <Sheet> gets this for free;
 * a future framer tree elsewhere (e.g. a card→page layoutId transition) needs
 * its own <MotionProvider>.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
