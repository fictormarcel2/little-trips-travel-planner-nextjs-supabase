"use client";

import { useEffect, useState } from "react";
import { buttonClasses } from "./buttonStyles";

/**
 * The single light/dark control. One button, not a three-way picker — the
 * owner's brief for this redesign was "don't have too many confusing buttons,
 * make it simple", and a system/light/dark segmented control is three controls
 * to explain where one will do. The "system" default still exists, it just
 * lives in the boot script in app/layout.tsx: no stored choice means
 * prefers-color-scheme decides. Touching this button is what opts out of that.
 *
 * Two things here look redundant and are not:
 *
 * 1. **The icon is chosen by CSS, the label by React.** The server cannot know
 *    the theme, so any icon rendered from React state is wrong on the first
 *    paint of a dark page — a visible sun blinking into a moon, which is the
 *    exact flash the boot script exists to prevent. So both icons ship and an
 *    ancestor `[data-theme="dark"]` selector picks one, correct before
 *    hydration and with zero state. `aria-label` cannot be done that way, so
 *    it settles in the effect below and says something honest ("Toggle theme")
 *    until it does.
 * 2. **The effect reads the DOM, not localStorage.** `document.documentElement`
 *    is the one place that already holds the resolved answer — storage may be
 *    empty while the media query decided. Reading storage during render would
 *    also be a hydration mismatch by construction.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private mode / storage disabled: the theme still flips for this page,
      // it just will not survive a reload. Not worth breaking the click over.
    }
    setTheme(next);
  }

  // Names the destination, not the state — "Switch to dark theme" is
  // unambiguous in a way "Dark theme, not pressed" is not, which is why there
  // is no aria-pressed here. Pick one; this is the one.
  const label = theme
    ? `Switch to ${theme === "dark" ? "light" : "dark"} theme`
    : "Toggle theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      // `md`, not `sm` + .touch-target. The established sm pairing measures
      // 42px here, not 44: `.touch-target::after` is absolutely positioned, so
      // its `-inset-y-1` resolves against the *padding* box, and every variant
      // in buttonStyles.ts adds a 1px border that the figure never accounted
      // for. `md` is a real 44px box (measured 62x44) and needs no
      // pseudo-element at all. Its 20px side padding makes a wider pill than a
      // lone icon strictly needs; that is deliberate rather than overridden,
      // because a `px-3` here loses the cascade to `md`'s own `px-5` — same
      // property, and class order in the string does not decide the winner.
      className={buttonClasses({ variant: "ghost", size: "md" })}
    >
      {/* Moon in light theme: the icon shows where the click goes. */}
      <MoonIcon className="[[data-theme=dark]_&]:hidden" />
      <SunIcon className="hidden [[data-theme=dark]_&]:block" />
    </button>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 ${className ?? ""}`}
    >
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 ${className ?? ""}`}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2.5 12h2M19.5 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
