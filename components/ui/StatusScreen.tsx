import type { ReactNode } from "react";
import { CompassMark } from "@/components/ui/CompassMark";

export interface StatusScreenProps {
  title: string;
  description: string;
  /** Buttons / links, already styled by the caller via buttonClasses(). */
  actions?: ReactNode;
  /** BrandTag label. Defaults to the app name. */
  tag?: string;
  /**
   * Announces `description` via `role="alert"` — for a screen that replaces
   * an in-progress `role="status"` region with a failure, so a screen reader
   * user gets a signal rather than silence (e.g. `JoinAsGuest`'s error state).
   */
  alert?: boolean;
}

/**
 * Replaces four hand-written dead-end screens (`error.tsx`, `not-found.tsx`,
 * invalid-invite, `JoinAsGuest`'s error state). Joins the **Persuade**
 * composition grammar of `/` and `/login` — left-aligned, a BrandTag-style
 * tag, an italic display heading — rather than the centred `max-w-md` card
 * those four screens used to share, which matched neither the marketing nor
 * the app surfaces (§5.3).
 *
 * The tag markup is BrandTag's, inlined rather than imported: BrandTag's
 * label is hardcoded to the app name, and this component's `tag` prop needs
 * to override it (e.g. "Invite" for an invalid-invite screen).
 *
 * Owns its own `<main>` — every surface this replaces sits outside AppShell,
 * and CLAUDE.md's rule is exactly one `<main>` per rendered page. Callers
 * must not wrap this in another `<main>`.
 */
export function StatusScreen({ title, description, actions, tag, alert }: StatusScreenProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-20">
      <p className="inline-flex w-fit -rotate-1 items-center gap-2 rounded-full bg-accent-tint px-3.5 py-1.5 text-label font-bold uppercase tracking-widest text-accent-on-tint">
        <CompassMark className="h-3.5 w-3.5" />
        {tag ?? "Little Trips"}
      </p>

      <h1 className="mt-7 font-display text-display-lg italic text-primary">{title}</h1>

      <p
        role={alert ? "alert" : undefined}
        className="mt-4 max-w-md text-body-lg text-secondary"
      >
        {description}
      </p>

      {actions && (
        <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>
      )}
    </main>
  );
}
