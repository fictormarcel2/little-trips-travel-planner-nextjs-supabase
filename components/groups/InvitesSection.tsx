import { createInvite, revokeInvite } from "@/lib/actions/groups";
import { InviteLink } from "@/components/groups/InviteLink";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PaperPlaneSpot } from "@/components/ui/SpotIllustration";
import { formatTimestamp, isExpired } from "@/lib/format";
import type { GroupInvite } from "@/types/group";

export type InviteSummary = Pick<
  GroupInvite,
  "id" | "token" | "expires_at" | "revoked" | "created_at"
>;

/**
 * Invite links — generate, list, revoke. Creator-only; the page decides that
 * and simply doesn't render this otherwise.
 *
 * Lifted out of app/groups/[groupId]/page.tsx, where it was ~90 lines of inline
 * JSX and its own full-width card, and moved inside PeopleSheet: inviting
 * somebody is a people operation, not a second page-level concern (§5.1). Like
 * MembersSection it carries no Surface of its own — the sheet is the surface.
 */
export function InvitesSection({
  groupId,
  invites,
}: {
  groupId: string;
  invites: InviteSummary[];
}) {
  // One `now` for the whole list, read once per render rather than per row, so
  // every badge on this screen is judged against the same instant.
  const now = Date.now();

  return (
    <section>
      <SectionHeading>Invite links</SectionHeading>

      <form action={createInvite} className="mb-6 flex flex-col gap-3">
        <input type="hidden" name="groupId" value={groupId} />
        <Field
          as="select"
          id="invite-expiry"
          label="Link lifetime"
          name="expiry"
          defaultValue="7d"
        >
          <option value="1d">Expires in 1 day</option>
          <option value="7d">Expires in 7 days</option>
          <option value="30d">Expires in 30 days</option>
          <option value="never">Never expires</option>
        </Field>
        <div>
          <Button type="submit" pendingText="Generating…">
            Generate invite link
          </Button>
        </div>
      </form>

      {invites.length === 0 ? (
        // "No invite links yet." restated the heading and stopped. The
        // useful thing to say here is what an invite link does — that
        // whoever opens it is in, without signing up for anything —
        // because that is the property that makes people comfortable
        // sending one.
        <EmptyState
          illustration={<PaperPlaneSpot />}
          title="Nobody's been invited yet"
          description="An invite link is how everyone else gets in. Whoever opens it can join and start adding places — no account, no sign-up. Generate one above and send it over."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {invites.map((invite) => {
            const expired = invite.expires_at ? isExpired(invite.expires_at, now) : false;
            const isActive = !invite.revoked && !expired;
            return (
              <li key={invite.id}>
                {/* Panel, not a bordered box inside the sheet (§2.5 no. 5).
                    The state lives in a badge, because "Revoked" and
                    "Expires 3 Sep" are the whole reason to scan this list. */}
                <Panel className="flex flex-wrap items-center gap-x-3 gap-y-3">
                  <div className="min-w-0 flex-1 basis-56">
                    <InviteLink token={invite.token} />
                  </div>
                  <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
                    {invite.revoked ? (
                      <Badge tone="critical">Revoked</Badge>
                    ) : expired ? (
                      <Badge tone="critical">Expired</Badge>
                    ) : invite.expires_at ? (
                      // formatTimestamp, not formatDate: expires_at is a
                      // timestamptz, i.e. an absolute instant, and formatDate
                      // resolves it in the host's own zone — the same
                      // server-renders-one-day/browser-renders-another split
                      // lib/format.ts documents.
                      <Badge tone="positive">
                        Expires {formatTimestamp(invite.expires_at)}
                      </Badge>
                    ) : (
                      <Badge tone="positive">Never expires</Badge>
                    )}
                    {isActive && (
                      <form action={revokeInvite}>
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <input type="hidden" name="groupId" value={groupId} />
                        {/* Revoking is permanent and silent: anyone who
                            already has this link — possibly sent to a
                            group chat days ago — simply stops being able
                            to join, with no way to un-revoke it. */}
                        <ConfirmButton
                          size="sm"
                          pendingText="Revoking…"
                          announcement="Revoke this invite link? Anyone who already has it will no longer be able to join. Press again to confirm."
                        >
                          Revoke
                        </ConfirmButton>
                      </form>
                    )}
                  </div>
                </Panel>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
