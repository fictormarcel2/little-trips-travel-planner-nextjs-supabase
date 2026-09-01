"use server";

import { createClient } from "@/lib/supabase/server";
import { redeemInvite } from "@/lib/actions/groups";

const REASON_MESSAGES: Record<string, string> = {
  "not-found": "This invite link doesn't exist.",
  revoked: "This invite link has been revoked.",
  expired: "This invite link has expired.",
};

/**
 * Establishes an anonymous session (if the visitor doesn't already have one)
 * and redeems the invite token under it. Deliberately invoked from a client
 * component (see components/JoinAsGuest.tsx) rather than called directly
 * during a Server Component's render: cookies() can only be written from a
 * genuine Server Action/Route Handler execution context, and a plain
 * same-process function call from inside RSC render doesn't count as one
 * even if the callee is marked "use server" — the anonymous session's
 * cookie would silently fail to persist, and the very next navigation would
 * find no session and bounce back to a dead end.
 */
export async function joinAnonymously(
  token: string,
  captchaToken: string | null
): Promise<{ ok: true; groupId: string } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user: existing },
  } = await supabase.auth.getUser();

  if (!existing) {
    // captchaToken is only required while Bot and Abuse Protection is
    // enabled on this Supabase project's Auth settings — currently paused,
    // see components/JoinAsGuest.tsx.
    const { error } = await supabase.auth.signInAnonymously(
      captchaToken ? { options: { captchaToken } } : undefined
    );
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  const result = await redeemInvite(token);
  if (!result.ok) {
    return { ok: false, error: REASON_MESSAGES[result.reason] ?? "This invite link is no longer valid." };
  }
  return { ok: true, groupId: result.groupId };
}
