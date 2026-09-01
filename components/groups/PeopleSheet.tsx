"use client";

import { useState, type ReactNode } from "react";
import { AvatarCircle } from "@/components/groups/AvatarCircle";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Surface } from "@/components/ui/Surface";
import type { MemberProfile } from "@/types/member";

/** How many faces show before the rest collapse into a "+N" chip. */
const MAX_FACES = 5;

export interface PeopleSheetProps {
  people: Pick<MemberProfile, "id" | "display_name" | "avatar_url">[];
  /**
   * The whole administration surface — roster, claim, remove, avatar upload,
   * preferences, invite links. Rendered on the server and handed in as
   * children, so every Server Action form inside stays a Server Component;
   * this file only owns the open/closed state.
   */
  children: ReactNode;
}

/**
 * The people affordance on the group page: one row of faces, the names, and a
 * single button.
 *
 * This replaces a section that rendered 30-odd controls inline — a claim and a
 * remove button per member, an avatar upload, eleven preference pills and two
 * near-identical add-person forms — above the trips the page actually exists
 * to show (spec §5.1). None of it is gone; all of it moved one tap away.
 *
 * The trigger's label and the sheet's title are deliberately the same string:
 * the accessible name a screen reader hears on the button is the name it hears
 * on the panel that opens.
 *
 * `children` are only rendered while open (no `keepMounted` — nothing in here
 * binds a third-party widget to a live DOM node the way the add-stop sheet's
 * Google Autocomplete does), which is what guarantees zero focusable children
 * at rest.
 */
export function PeopleSheet({ people, children }: PeopleSheetProps) {
  const [open, setOpen] = useState(false);

  const faces = people.slice(0, MAX_FACES);
  const overflow = people.length - faces.length;
  // Names are up to 100 characters each (lib/constraints.ts) and there can be
  // any number of them, so this line truncates and carries the full string on
  // `title`. min-w-0 is what lets `truncate` bite inside a flex row.
  const names = people.map((p) => p.display_name).join(", ");
  const label = people.length === 0 ? "No names added yet" : names;

  return (
    <Surface as="section" className="mb-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {/* aria-hidden: every face here is a redundant rendering of a name
            that is spelled out in the line beside it, and AvatarCircle's own
            initial is already hidden for the same reason. */}
        {faces.length > 0 && (
          <ul aria-hidden className="flex shrink-0 items-center -space-x-2">
            {faces.map((p) => (
              <li key={p.id}>
                {/* ring-surface, not ring-strong: these overlap, so the ring is
                    doing separation against this card's own ground. */}
                <AvatarCircle
                  name={p.display_name}
                  avatarUrl={p.avatar_url}
                  className="h-9 w-9 text-label ring-2 ring-surface"
                />
              </li>
            ))}
            {overflow > 0 && (
              <li className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken text-label font-semibold text-secondary ring-2 ring-surface">
                +{overflow}
              </li>
            )}
          </ul>
        )}

        <p className="min-w-0 flex-1 basis-40 truncate text-body text-secondary" title={label}>
          {label}
        </p>

        <Button variant="secondary" onClick={() => setOpen(true)}>
          Manage people
        </Button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Manage people">
        <div className="flex flex-col gap-8">{children}</div>
      </Sheet>
    </Surface>
  );
}
