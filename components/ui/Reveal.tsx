"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Tags a reveal may render as. A short list on purpose — this is a wrapper for
 * list rows and page sections, not a general-purpose element factory.
 */
type RevealTag = "div" | "li" | "section" | "article";

export interface RevealProps {
  /**
   * Milliseconds to hold before this element enters. Use `revealDelay(i)`
   * from lib/motion.ts — it lives there, not here, because the callers are
   * Server Components and this module is "use client". See the note in that
   * file; exporting it from here compiled and shipped, then crashed on the
   * first request.
   */
  delay?: number;
  as?: RevealTag;
  className?: string;
  children: ReactNode;
}

/**
 * Fades and lifts its content in once, when it enters the DOM.
 *
 * Two properties this leans on, both worth knowing before changing it:
 *
 * 1. **Only new rows animate.** A CSS animation runs when an element is
 *    inserted, not when React re-renders one. Because the lists using this are
 *    keyed by row id, adding a place re-renders the whole list but only the new
 *    row is a new DOM node — the rows already on screen keep theirs and stay
 *    still. That is the behaviour the brief asks for, and it comes for free
 *    from CSS rather than from tracking "which item is new" in state.
 *
 * 2. **The animation ships in the server-rendered markup.** `animate` starts
 *    `true`, so the class is present in the first HTML the browser sees. The
 *    `@media (prefers-reduced-motion: reduce)` block in globals.css is what
 *    actually honours the preference, and it applies before a line of JS runs.
 *    The matchMedia check below only ever *removes* motion afterwards — a
 *    second layer, not the guard. Gating the initial render on JS instead
 *    would leave every list invisible until hydration, and permanently
 *    invisible with JS off, in an app that otherwise works without it.
 *
 * No matchMedia listener: this is a one-shot entrance, already finished by the
 * time anyone could change the preference, so there is nothing for a listener
 * to do except need a cleanup function.
 *
 * 3. **The animation class is dropped once it finishes, via `onAnimationEnd`.**
 *    `animation-fill-mode: both` keeps a CSS Animation "in effect" on its
 *    target indefinitely — that's what holds the entrance's final frame after
 *    it plays. But per the CSS spec, any element with an *effectively
 *    animating* transform or opacity creates a stacking context for as long
 *    as that animation stays in effect, regardless of what value the final
 *    keyframe leaves behind (`getComputedStyle` reports the animation's
 *    resolved matrix, never literally "none", even when the authored
 *    keyframe says `transform: none`). Left in place, every row here would
 *    be an isolated stacking context forever, and a z-indexed popover in one
 *    row could never paint above a later row's plain content — found live
 *    via a PlaceCard overflow menu that a real click could not reach because
 *    a sibling card's photo box, painted in its own sealed stacking context,
 *    sat on top of it regardless of z-index. Stripping the class once the
 *    entrance is done removes the animation from the target entirely, so the
 *    forced stacking context goes with it.
 */
export function Reveal({
  delay = 0,
  as: Tag = "div",
  className = "",
  children,
}: RevealProps) {
  const [animate, setAnimate] = useState(true);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAnimate(false);
    }
  }, []);

  const showAnimation = animate && !settled;

  const style: CSSProperties | undefined =
    showAnimation && delay > 0 ? { animationDelay: `${delay}ms` } : undefined;

  const classes = [showAnimation ? "animate-rise-in" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag
      className={classes || undefined}
      style={style}
      onAnimationEnd={() => setSettled(true)}
    >
      {children}
    </Tag>
  );
}
