import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redeemInvite } from "@/lib/actions/groups";
import { JoinAsGuest } from "@/components/groups/JoinAsGuest";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { buttonClasses } from "@/components/ui/buttonStyles";

// The other half of the invite screen, and the half people are most likely to
// hit unhappy: a revoked link, an expired one, a typo. StatusScreen carries
// the same Persuade grammar as JoinAsGuest — left-aligned, brand tag, display
// heading — and, unlike before, two real ways out instead of a lone "Go home".
function InvalidInvite({ reason }: { reason: string }) {
  return (
    <StatusScreen
      title="This invite won't open"
      description={`${reason} Ask whoever invited you for a fresh link — they can generate one from the group page.`}
      actions={
        <>
          <Link href="/" className={buttonClasses({ variant: "primary" })}>
            Go to Little Trips
          </Link>
          <Link href="/login" className={buttonClasses({ variant: "secondary" })}>
            Log in
          </Link>
        </>
      }
    />
  );
}

export default async function JoinPage({
  params,
}: {
  params: { token: string };
}) {
  // Token lookup happens with the service-role client so it works whether
  // or not the visitor is signed in yet or already a member — the token
  // itself is the unguessable secret being checked here, not RLS.
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("group_invites")
    .select("group_id, revoked, expires_at, groups ( name )")
    .eq("token", params.token)
    .maybeSingle();

  if (!invite) {
    return <InvalidInvite reason="This invite link doesn't exist." />;
  }
  if (invite.revoked) {
    return <InvalidInvite reason="This invite link has been revoked." />;
  }
  const isExpired = invite.expires_at
    ? new Date(invite.expires_at).getTime() < Date.now()
    : false;
  if (isExpired) {
    return <InvalidInvite reason="This invite link has expired." />;
  }

  const groupName =
    (invite.groups as unknown as { name: string } | null)?.name ?? "a group";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // No form, no email — sign the visitor in anonymously and redeem the
    // invite in one client-triggered step. See lib/actions/anonymousJoin.ts
    // for why this can't happen directly in this Server Component.
    return <JoinAsGuest token={params.token} groupName={groupName} />;
  }

  const result = await redeemInvite(params.token);
  if (!result.ok) {
    return <InvalidInvite reason="This invite link is no longer valid." />;
  }
  redirect(`/groups/${result.groupId}`);
}
