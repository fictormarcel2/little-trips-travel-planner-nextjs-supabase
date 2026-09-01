"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** How long the confirmation tint holds before fading back out. */
const CONFIRM_MS = 1800;

export interface MemberRowProps {
  /** True when this row is the current user's claimed name. */
  claimed: boolean;
  /** Used only for the screen-reader announcement. */
  displayName: string;
  children: ReactNode;
}

/**
 * One member row, plus the confirmation that fires when you claim it.
 *
 * Claiming a name is the "this one is me" moment in an app people open on a
 * shared invite link, and it used to be a silent server re-render: the row
 * gained a badge somewhere down the list and nothing said the tap had worked.
 * This gives it one soft settle — a status tint that fades in over 400ms,
 * holds, and fades out. No confetti, no bounce; nothing here is an
 * achievement, it is a checkbox with a name on it.
 *
 * The trigger is a *transition* of `claimed`, tracked against a ref seeded
 * with the first value, not the value itself — otherwise every page load
 * would flash the tint on whichever row is already yours. Releasing a claim
 * (which happens to your old row when you take a different one) is
 * deliberately silent: the row you just took is the one worth pointing at.
 *
 * `bg-positive-tint` is the one background this row ever paints, and it was
 * checked against everything that renders directly on it: the display name
 * (`text-primary`), AvatarUpload's label and file input (`text-secondary`,
 * 7.13:1), and the ghost "Edit preferences" button (`text-accent`, 5.31:1).
 * The preferences form is not in that list because it renders inside a Panel,
 * whose own opaque surface covers the tint entirely.
 *
 * `animate-rise-in` covers the other half of the moment: joining with a name
 * nobody had pre-added inserts a brand-new row, which the effect below cannot
 * see as a transition because the component mounts already claimed. A CSS
 * entrance runs on DOM insertion, so the new row lifts in on its own.
 */
export function MemberRow({ claimed, displayName, children }: MemberRowProps) {
  const [confirming, setConfirming] = useState(false);
  const wasClaimed = useRef(claimed);

  useEffect(() => {
    if (claimed === wasClaimed.current) return;
    wasClaimed.current = claimed;
    if (!claimed) return;

    setConfirming(true);
    const timer = window.setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [claimed]);

  return (
    // The tint is a full-bleed band the exact width of the row, with no
    // radius or inset: the hairlines above and below come from the list's
    // `divide-y`, so anything narrower or rounder would sit visibly out of
    // register with them. `bg-surface-elevated` is the resting value rather
    // than no background at all, so the fade interpolates between two real
    // colors instead of through a transparent black — and *elevated*
    // specifically because this row now renders inside a Sheet, whose panel is
    // bg-surface-elevated. The two tokens are equal in light but differ in
    // dark (#14141C vs #1C1C26), so bg-surface would leave a visibly wrong
    // band under every member.
    <li
      className={`animate-rise-in py-4 transition-colors duration-slow ease-entrance ${
        confirming ? "bg-positive-tint" : "bg-surface-elevated"
      }`}
    >
      {children}
      {/* Mounted empty for the whole life of the row, so assistive tech has a
          live region to announce *into* when the text arrives — a status
          region created at the same moment as its content is frequently
          missed. */}
      <p role="status" className="sr-only">
        {confirming ? `You're now ${displayName} in this group.` : ""}
      </p>
    </li>
  );
}
