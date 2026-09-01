"use server";

import { createClient } from "@/lib/supabase/server";
import { toUserError } from "@/lib/errors";

// Upgrades the *current* anonymous session to a permanent, magic-link-
// loginable account — not a separate signup. Per Supabase's own anonymous
// sign-in docs (confirmed, not assumed): "After they have been converted,
// the user id remains the same, which means that any data associated with
// the user's id would be carried over." So every existing group_members
// row, claimed group_member_profiles row, and added places for this exact
// auth.uid() keep working unchanged after conversion — nothing needs to be
// reassigned or migrated.
//
// updateUser() only sends a confirmation email here; the account isn't
// actually converted (is_anonymous doesn't flip to false) until the user
// clicks that link, which routes through the existing /auth/callback route
// unchanged — it just exchanges a code for a session regardless of what
// kind of confirmation the code represents.
//
// Called directly (not as a bare <form action>) from a client component so
// the caller can show a "check your email" state without a navigation —
// same calling convention as joinAnonymously in lib/actions/anonymousJoin.ts.
export async function linkEmail(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You need to be signed in to do this." };
  }

  // Deliberately a single generic message regardless of *why* updateUser
  // failed — Supabase returns a distinguishable error when the email is
  // already registered to another account, and passing that through
  // verbatim would let this endpoint be used to enumerate which emails
  // already have accounts here. A uniform failure message removes that
  // signal without needing to special-case the specific error.
  const { error } = await supabase.auth.updateUser({ email });
  if (error) {
    return {
      ok: false,
      error: toUserError("linkEmail failed", error, "Couldn't save that email — please try again or use a different address.").message,
    };
  }
  return { ok: true };
}
