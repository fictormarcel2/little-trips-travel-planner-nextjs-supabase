import { addUnclaimedSlot, claimProfile, createAndClaimProfile } from "@/lib/actions/memberProfiles";
import { removeMember } from "@/lib/actions/groups";
import { AvatarUpload } from "@/components/groups/AvatarUpload";
import { AvatarCircle } from "@/components/groups/AvatarCircle";
import { MemberPreferencesSection } from "@/components/groups/MemberPreferencesSection";
import { MemberRow } from "@/components/groups/MemberRow";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Field } from "@/components/ui/Field";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/constraints";
import type { MemberProfile, MemberPreferences } from "@/types/member";

/**
 * The roster, and everything that changes it. Lives inside PeopleSheet — no
 * Surface of its own, because the sheet is already the surface (a card inside
 * a panel is the nested-frame pattern the design system rules out).
 */
export function MembersSection({
  groupId,
  profiles,
  preferencesByProfileId,
  currentUserId,
  isCreator,
}: {
  groupId: string;
  profiles: MemberProfile[];
  preferencesByProfileId: Map<string, MemberPreferences>;
  currentUserId: string;
  isCreator: boolean;
}) {
  const myProfile = profiles.find((p) => p.claimed_by_user_id === currentUserId);

  return (
    <section>
      <SectionHeading>Who&apos;s in</SectionHeading>

      {!myProfile && profiles.length > 0 && (
        <p className="mb-4 text-body text-secondary">
          Pick who you are below — or add your name if it&apos;s not listed yet.
        </p>
      )}

      {profiles.length > 0 && (
        // Hairline rules, not one framed box per member: these rows already
        // sit inside the sheet's panel, and boxing each one would be the
        // nested-card pattern §2.5 no. 5 rules out. Rows that need their own
        // surface (the expanded preferences form) step *down* into a Panel.
        <ul className="divide-y divide-subtle border-y border-subtle">
          {profiles.map((p) => {
            const isMe = p.claimed_by_user_id === currentUserId;
            return (
              // MemberRow renders the <li>. It is a client component purely
              // so it can notice `claimed` flipping and confirm the claim —
              // see the note there; the row's content stays server-rendered
              // and is passed straight through as children.
              <MemberRow key={p.id} claimed={isMe} displayName={p.display_name}>
                {/* flex-wrap plus basis-32 on the name column is what keeps
                    this readable at 360px: the action buttons drop to their
                    own line instead of squeezing a display name (up to 100
                    characters) down to a couple of glyphs. */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <AvatarCircle name={p.display_name} avatarUrl={p.avatar_url} />
                  <div className="min-w-0 flex-1 basis-32">
                    <p
                      className="truncate text-body font-semibold text-primary"
                      title={p.display_name}
                    >
                      {p.display_name}
                    </p>
                    {/* The badge is inserted the moment a claim lands, so its
                        entrance runs exactly then — a second, quieter half of
                        the confirmation, and free: no state, just a class on
                        an element that did not exist a render ago. */}
                    {isMe && (
                      <Badge tone="accent" className="animate-rise-in mt-1">
                        You
                      </Badge>
                    )}
                    {!isMe && !p.claimed_by_user_id && (
                      <Badge className="mt-1">Unclaimed</Badge>
                    )}
                  </div>

                  {!isMe && (
                    <div className="ml-auto flex shrink-0 flex-wrap gap-2">
                      {/* claimProfile releases any claim this user already
                          holds and then claims this one — two statements,
                          because a unique index allows at most one claimed
                          slot per user per group. Don't restructure this
                          call. */}
                      <form action={claimProfile}>
                        <input type="hidden" name="profileId" value={p.id} />
                        <input type="hidden" name="groupId" value={groupId} />
                        <Button type="submit" variant="secondary" size="sm" pendingText="Claiming…">
                          {p.claimed_by_user_id ? "Claim this role" : "Claim"}
                        </Button>
                      </form>
                      {isCreator && p.claimed_by_user_id && (
                        <form action={removeMember}>
                          <input type="hidden" name="memberUserId" value={p.claimed_by_user_id} />
                          <input type="hidden" name="groupId" value={groupId} />
                          {/* `danger`, which is outlined rather than filled —
                              deliberately quieter than Claim beside it — and
                              two-step, because this evicts a person from the
                              group and sits one row away from a Claim button
                              of the same size. */}
                          <ConfirmButton
                            size="sm"
                            pendingText="Removing…"
                            announcement={`Remove ${p.display_name} from this group? Press again to confirm.`}
                          >
                            Remove
                          </ConfirmButton>
                        </form>
                      )}
                    </div>
                  )}
                </div>

                {/* Your own row's extensions get the full column width rather
                    than the ~130px left beside the avatar — the preferences
                    form in particular is a full form, not a footnote. */}
                {isMe && (
                  <div className="mt-3 flex flex-col gap-3">
                    <AvatarUpload profileId={p.id} groupId={groupId} />
                    <MemberPreferencesSection
                      profileId={p.id}
                      groupId={groupId}
                      initialPreferences={preferencesByProfileId.get(p.id) ?? null}
                    />
                  </div>
                )}
              </MemberRow>
            );
          })}
        </ul>
      )}

      {/* Any group member can claim, or switch to, any role above at any
          time — anonymous or email-authenticated alike. This is
          deliberately as flexible as the rest of this app's trust model
          (any member can already edit/delete any place or itinerary): it
          means someone reopening the invite link on a second device just
          claims their name again rather than being locked out, at the cost
          of any member being able to reassign anyone's name. See
          lib/actions/memberProfiles.ts and CLAUDE.md for the full
          reasoning. */}

      {/* ── One form, one field, two submits (§5.1) ─────────────────────────
          This used to be two near-identical forms stacked on top of each
          other, each with its own label, hint, input and button — eight
          controls' worth of chrome to answer one question: whose name is
          this? Now the field asks for a name and the buttons say who it is
          for, which is the actual decision.

          The branch runs on `formAction`, which React resolves from the
          *submitter* — so both buttons post the same FormData to different
          Server Actions and no new action was written. Verified against the
          react-dom Next 14.2.35 vendors (it reads `submitterProps.formAction`
          off the submitter) and clicked through in a browser.

          Two constraints that same react-dom enforces and are easy to break:
          a button carrying a function `formAction` must be `type="submit"`
          and must NOT have a `name` — React uses the name field itself to
          encode which action to invoke.

          The form's own `action` is the fallback for a submit that arrives
          with no submitter; implicit submission (Enter in the text field)
          uses the first submit button in tree order, which is why the
          claiming one is first whenever it renders.

          "That's me" only renders when you have no claimed name yet:
          createAndClaimProfile inserts a row already claimed by you, and a
          unique index allows at most one claimed slot per user per group. */}
      <form action={addUnclaimedSlot} className="mt-6 flex flex-col gap-3">
        <input type="hidden" name="groupId" value={groupId} />
        <Field
          id={`people-add-${groupId}`}
          label="Add a name"
          hint="Then say whose it is. An unclaimed name waits for them to take it when they join."
          name="displayName"
          required
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          placeholder="Name"
        />
        <div className="flex flex-wrap gap-2">
          {!myProfile && (
            // Both buttons share a neutral pendingText: useFormStatus reports
            // the *form's* pending state, so whichever one you press, both
            // read it. A label claiming the other action ran would be a lie.
            <Button type="submit" formAction={createAndClaimProfile} pendingText="Saving…">
              That&apos;s me
            </Button>
          )}
          <Button
            type="submit"
            formAction={addUnclaimedSlot}
            variant="secondary"
            pendingText="Saving…"
          >
            Someone else
          </Button>
        </div>
      </form>
    </section>
  );
}
