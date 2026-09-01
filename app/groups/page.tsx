import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createGroup } from "@/lib/actions/groups";
import { Button } from "@/components/ui/Button";
import { AppShell } from "@/components/ui/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { CompanionsSpot } from "@/components/ui/SpotIllustration";
import { Reveal } from "@/components/ui/Reveal";
import { revealDelay } from "@/lib/motion";
import { SaveAccountForm } from "@/components/groups/SaveAccountForm";
import { Field } from "@/components/ui/Field";
import { formatDate } from "@/lib/format";
import { GROUP_NAME_MAX_LENGTH } from "@/lib/constraints";
import { coverImageFor } from "@/lib/covers";
import type { Group } from "@/types/group";

/**
 * A group row plus whatever cover it has chosen.
 *
 * `group_covers` is embedded rather than fetched separately: group_covers.
 * group_id is both its primary key and the foreign key to groups.id, so
 * PostgREST treats it as a to-one relation and resolves it in the same round
 * trip. Typed as possibly-an-array anyway — a to-one embed returns an object,
 * but that determination depends on PostgREST reading the constraint, and
 * being wrong about it here would silently render every cover as the fallback
 * with no error to explain why.
 */
type GroupListRow = Pick<Group, "id" | "name" | "created_at"> & {
  group_covers: { cover: string } | { cover: string }[] | null;
};

/** Normalises the embed above to the single row it logically is. */
function chosenCover(row: GroupListRow): string | null {
  const embed = row.group_covers;
  if (!embed) return null;
  return Array.isArray(embed) ? embed[0]?.cover ?? null : embed.cover;
}

export default async function GroupsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/groups");
  }

  const { data } = await supabase
    .from("groups")
    .select("id, name, created_at, group_covers(cover)")
    .order("created_at", { ascending: false });
  const groups = (data ?? []) as GroupListRow[];

  return (
    <AppShell
      email={user.email}
      pageHeader={
        <PageHeader
          title="Your groups"
          subtitle="A group is the people you plan with — a pair, a few friends, the whole family. Trips live inside one."
        />
      }
    >
      {user.is_anonymous ? (
        <section className="card mb-8 p-6">
          <SaveAccountForm />
        </section>
      ) : (
        <section className="card mb-8 p-6">
          <h2 className="mb-3 font-display text-title text-primary">Start a new group</h2>
          {/* The name input carried a placeholder and nothing else: the label
              vanished the moment anyone typed, and a screen reader announced
              an unnamed text box. `sm:items-end` lines the button up with the
              input rather than with the label above it. */}
          <form
            action={createGroup}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <Field
              id="new-group-name"
              label="Group name"
              name="name"
              required
              maxLength={GROUP_NAME_MAX_LENGTH}
              placeholder="e.g. Me & Alex"
              className="min-w-0 flex-1"
            />
            <Button type="submit" pendingText="Creating…">
              Start the group
            </Button>
          </form>
        </section>
      )}

      <section className="space-y-3">
        {/* Not one of the three the brief calls out, but it is the same
            component and would otherwise have been the one screen left with
            a bare sentence in it. Two ways in, because arriving here with no
            groups usually means one of exactly two situations. */}
        {groups.length === 0 && (
          <EmptyState
            illustration={<CompanionsSpot />}
            title="No groups yet"
            description="A group is the people you plan with, and everything else lives inside one. Start yours above, or open the invite link someone sent you."
          />
        )}
        {groups.map((g, i) => {
          const cover = coverImageFor(g.id, chosenCover(g));
          return (
            <Reveal key={g.id} delay={revealDelay(i)}>
              <Link href={`/groups/${g.id}`} className="card-link block overflow-hidden">
                {/* Cover strip: a quiet, texture-led photo from the registry
                    (§7.2), cropped to a fixed band via object-cover — the
                    notes on each COVERS entry say these have no strong focal
                    subject specifically so any crop height still works.
                    The title sits in a solid `bg-inverse` band, not a
                    translucent gradient over the photo: `--inverse`/
                    `--on-inverse` is the token pair built for exactly this
                    ("overlay ground", see Tooltip.tsx) and it holds its
                    ~16–20:1 contrast regardless of what photo is underneath
                    or which theme is active — a gradient composited over an
                    arbitrary photo could not offer that guarantee. */}
                <div className="relative h-32 w-full bg-surface-sunken">
                  <Image
                    src={cover.src}
                    alt={cover.alt}
                    fill
                    sizes="(min-width: 640px) 576px, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-inverse px-6 py-3">
                    <p
                      className="line-clamp-2 break-words font-display text-xl text-on-inverse"
                      title={g.name}
                    >
                      {g.name}
                    </p>
                  </div>
                </div>
                <p className="px-6 py-3 text-label text-muted">
                  Created {formatDate(g.created_at)}
                </p>
              </Link>
            </Reveal>
          );
        })}
      </section>
    </AppShell>
  );
}
