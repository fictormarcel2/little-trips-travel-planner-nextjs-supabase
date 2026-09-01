import type { ReactNode } from "react";
import { AppHeader } from "@/components/ui/AppHeader";

export interface AppShellProps {
  /** Signed-in address, shown quietly in the header from `sm:` up. */
  email?: string;
  /** Contextual page header — normally a <PageHeader />. */
  pageHeader?: ReactNode;
  children: ReactNode;
}

/**
 * The frame every authenticated route sits in. Two jobs:
 *
 * 1. Persistent navigation. `AppHeader` used to be mounted by `/groups`
 *    alone; a group page or an itinerary page gave you no way back to the
 *    top of the app and no sign-out at all.
 * 2. One page container. `mx-auto min-h-screen max-w-2xl px-6 py-12` was
 *    copy-pasted into all six files under `app/groups/**`. This absorbs that
 *    pattern rather than becoming a seventh copy of it.
 *
 * Vertical rhythm follows VISUAL_DENSITY 4 (`py-16`–`py-24`), measured from
 * the top of <main>. Mobile deliberately runs tighter than the band: the
 * header now occupies the space the band assumed was empty, and 64px of dead
 * space above the title on a 360x740 screen is a fifth of the viewport spent
 * on nothing. The Taste Skill's mobile override authorizes exactly this.
 */
export function AppShell({ email, pageHeader, children }: AppShellProps) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-6 pt-6">
      <AppHeader email={email} />
      <main className="pb-24 pt-10 sm:pt-16">
        {pageHeader}
        {children}
      </main>
    </div>
  );
}
