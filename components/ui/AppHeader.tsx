import Link from "next/link";
import { CompassMark } from "@/components/ui/CompassMark";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { Surface } from "@/components/ui/Surface";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * The persistent navigation bar for every authenticated route. Rendered by
 * components/ui/AppShell.tsx rather than by pages directly — before that
 * shell existed this component was mounted exactly once, on `/groups`, and
 * the other five route groups had no persistent navigation at all.
 *
 * `elevation="floating"` on purpose: the header used to wear plain `.card`,
 * the same treatment as a group row in the list below it, so nothing in the
 * visual language said "this is chrome, that is content". Floating separates
 * them without adding a single new color.
 */
export function AppHeader({ email }: { email?: string }) {
  return (
    <Surface
      as="header"
      elevation="floating"
      padding="none"
      className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
    >
      <Link
        href="/groups"
        // min-w-0 + the nowrap/truncate pair below are what keep this to a
        // single line at 360px, the width most people first open this app at.
        //
        // min-h-11 costs no height: the Sign out button beside it is already
        // 44px, so the bar is that tall regardless. It was the wordmark itself
        // that was a 20px target — the app's home link, and on a phone the
        // only one.
        className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated"
      >
        <CompassMark className="h-5 w-5 shrink-0 text-accent" />
        <span className="min-w-0">
          {/* `truncate`, not the bare `whitespace-nowrap` this had: with two
              controls on the right instead of one, 360px no longer has room
              for the full wordmark plus both. nowrap alone would overflow the
              bar and give the page a horizontal scrollbar; truncate clips to
              an ellipsis and keeps min-w-0 doing its job. */}
          <span className="block truncate text-label font-bold uppercase tracking-widest text-accent">
            Little Trips
          </span>
          {/* The signed-in address is reassurance, not navigation, so it is
              the first thing to go when the bar gets narrow. */}
          {email && (
            <span className="hidden truncate text-micro text-muted sm:block">
              {email}
            </span>
          )}
        </span>
      </Link>
      {/* shrink-0 on the group, min-w-0 on the wordmark: the chrome controls
          keep their full size and the title is the thing that gives way. Both
          buttons carry shrink-0 of their own via buttonClasses, so this is
          belt and braces — but the group is what flexbox measures. */}
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <SignOutButton />
      </div>
    </Surface>
  );
}
