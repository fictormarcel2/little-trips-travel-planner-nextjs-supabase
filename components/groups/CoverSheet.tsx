"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { COVERS, type ImageAsset } from "@/components/ui/images";
import { setGroupCover, uploadGroupCover } from "@/lib/actions/groupCovers";

/**
 * "cover-04-dusk-peaks" -> "Dusk peaks".
 *
 * Every thumbnail below is a button wrapping a decorative image (alt=""), so
 * without this each one would announce as an unnamed button and the grid
 * would be unusable by keyboard or screen reader. Derived from the id rather
 * than stored as another registry field: the id format is ours, the label is
 * only ever spoken, and a fifth field per entry to hold two words would be
 * one more thing to keep in sync when a photo is swapped.
 */
function coverLabel(id: string): string {
  const words = id.replace(/^cover-\d+-/, "").split("-");
  if (words.length === 0 || words[0] === "") return "Cover";
  return words.join(" ").replace(/^./, (c) => c.toUpperCase());
}

/**
 * Choose the group's cover: one of the curated photos, one of your own, or
 * none at all.
 *
 * WHERE THIS LIVES, AND WHY IT IS A SHEET
 *
 * It sits in PageHeader's `actions` slot. The group page is held to roughly
 * six controls at rest (spec §5.1) — a budget the previous redesign spent
 * real effort getting down to — so a picker that showed its grid inline would
 * put nine more controls on the page to serve an occasional decision. One
 * button that opens a sheet costs one.
 *
 * The current cover is previewed at the top because the group page does not
 * render its own cover anywhere; without the preview you would change the
 * photo here and have to navigate to /groups to find out what you picked.
 */
export function CoverSheet({
  groupId,
  current,
  isAnonymous,
}: {
  groupId: string;
  /** What the card shows today — chosen or fallen back, already resolved. */
  current: ImageAsset;
  /** Guests may choose a curated cover but not upload a file of their own. */
  isAnonymous: boolean;
}) {
  const [open, setOpen] = useState(false);
  const uploadInputId = `cover-upload-${groupId}`;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Cover photo
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Cover photo">
        <div className="flex flex-col gap-8">
          <section>
            <p className="mb-3 text-label font-semibold text-secondary">
              On the card now
            </p>
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl2 border border-subtle bg-surface-sunken">
              <Image
                src={current.src}
                alt=""
                fill
                sizes="(min-width: 768px) 384px, 90vw"
                className="object-cover"
              />
            </div>
          </section>

          {/* One form, one submit button per photo. A submit button's own
              name/value is what gets posted, so the grid needs no client
              state and no controlled selection — the same multi-submit
              pattern MembersSection uses for claim/add. The last button
              posts an empty coverId, which the action reads as "clear". */}
          <form action={setGroupCover}>
            <input type="hidden" name="groupId" value={groupId} />

            <p className="mb-3 text-label font-semibold text-secondary">
              Pick one of ours
            </p>
            {/* Two columns, not three. The sheet is ~390px wide on a phone and
                ~430px on desktop, so three columns produced 130px thumbnails —
                small for judging a photograph, which is the entire task here —
                and with four covers it left one orphaned alone on a second row.
                Two gives a clean 2x2 at the current count and roughly 200px
                each. Revisit if COVERS grows past six. */}
            <ul className="grid grid-cols-2 gap-2">
              {COVERS.map((cover) => {
                const selected = cover.src === current.src;
                return (
                  <li key={cover.id}>
                    <button
                      type="submit"
                      name="coverId"
                      value={cover.id}
                      aria-label={coverLabel(cover.id)}
                      aria-current={selected ? "true" : undefined}
                      className={`relative block aspect-[16/9] w-full overflow-hidden rounded-lg border transition-transform duration-fast ease-entrance hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                        selected
                          ? "border-accent ring-2 ring-accent"
                          : "border-subtle"
                      }`}
                    >
                      <Image
                        src={cover.src}
                        alt=""
                        fill
                        sizes="200px"
                        className="object-cover"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Reachable whether or not a cover was ever chosen: clearing an
                already-absent choice is a no-op delete, which is cheaper than
                threading "has a choice" down here to hide a button. */}
            <div className="mt-4">
              <Button type="submit" name="coverId" value="" variant="secondary" size="sm">
                Use the default
              </Button>
            </div>
          </form>

          <section>
            <p className="mb-1 text-label font-semibold text-secondary">
              Or use your own
            </p>
            {isAnonymous ? (
              // Stated up front rather than as an error after they have picked
              // a file. Both the server action and the Storage policy refuse
              // this regardless; this is only so nobody finds out the hard way.
              <p className="text-label text-muted">
                Guest accounts can&apos;t upload photos — pick one above, or sign
                up with email to use your own.
              </p>
            ) : (
              <form action={uploadGroupCover} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="groupId" value={groupId} />
                <div className="min-w-0 flex-1">
                  {/* accept stays broad on purpose: the authoritative list is
                      ALLOWED_COVER_TYPES in lib/actions/groupCovers.ts, which
                      rejects SVG server-side. This attribute is only the file
                      picker's default filter, never the check. */}
                  <label
                    htmlFor={uploadInputId}
                    className="mb-1 block text-label font-semibold text-secondary"
                  >
                    Photo
                  </label>
                  <input
                    id={uploadInputId}
                    type="file"
                    name="cover"
                    accept="image/png,image/jpeg,image/webp"
                    required
                    className="input-field touch-target w-full text-label"
                  />
                  <p className="mt-1 text-micro text-muted">
                    PNG, JPEG or WEBP, up to 2MB. A wide photo works best.
                  </p>
                </div>
                <Button type="submit" variant="secondary" pendingText="Uploading…">
                  Upload
                </Button>
              </form>
            )}
          </section>
        </div>
      </Sheet>
    </>
  );
}
