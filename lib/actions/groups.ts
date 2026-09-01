"use server";

import { randomBytes, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toUserError } from "@/lib/errors";
import { GROUP_NAME_MAX_LENGTH } from "@/lib/constraints";

export async function createGroup(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Group name is required");
  }
  if (name.length > GROUP_NAME_MAX_LENGTH) {
    throw new Error(`Group name must be ${GROUP_NAME_MAX_LENGTH} characters or fewer`);
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  if (user.is_anonymous) {
    // RLS (groups_insert_self) independently blocks this too — this check
    // just turns it into a clear message instead of a raw Postgres error.
    throw new Error("Guest accounts can't create new groups — sign up with email to create your own.");
  }

  // Generate the id ourselves and skip .select() after insert: the
  // on_group_created trigger adds the creator to group_members in an
  // AFTER INSERT trigger, which Postgres fires *after* it evaluates the
  // groups SELECT policy for a RETURNING clause — so `.insert().select()`
  // here would spuriously fail RLS even though the insert itself is fine.
  const id = randomUUID();
  const { error } = await supabase
    .from("groups")
    .insert({ id, name, created_by: user.id });

  if (error) {
    throw toUserError("createGroup failed", error, "Couldn't create the group — please try again.");
  }

  revalidatePath("/groups");
  redirect(`/groups/${id}`);
}

const INVITE_EXPIRY_OPTIONS = {
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  never: null,
} as const;

export async function createInvite(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const expiryChoice = String(formData.get("expiry") ?? "7d") as keyof typeof INVITE_EXPIRY_OPTIONS;
  if (!groupId) {
    throw new Error("Missing group");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // RLS (group_invites_insert_creator) independently enforces that only the
  // group's creator may insert an invite — this membership check just lets
  // us fail with a clear error instead of an opaque RLS rejection.
  const { data: group } = await supabase
    .from("groups")
    .select("id, created_by")
    .eq("id", groupId)
    .single();

  if (!group || group.created_by !== user.id) {
    throw new Error("Only the group creator can create invite links");
  }

  const durationMs = INVITE_EXPIRY_OPTIONS[expiryChoice] ?? INVITE_EXPIRY_OPTIONS["7d"];
  const expiresAt = durationMs ? new Date(Date.now() + durationMs).toISOString() : null;
  const token = randomBytes(24).toString("base64url");

  const { error } = await supabase.from("group_invites").insert({
    group_id: groupId,
    token,
    created_by: user.id,
    expires_at: expiresAt,
  });

  if (error) {
    throw toUserError("createInvite failed", error, "Couldn't create the invite link — please try again.");
  }

  revalidatePath(`/groups/${groupId}`);
}

export async function revokeInvite(formData: FormData) {
  const inviteId = String(formData.get("inviteId") ?? "");
  const groupId = String(formData.get("groupId") ?? "");
  if (!inviteId || !groupId) {
    throw new Error("Missing invite");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Explicit check, same pattern as createInvite — RLS
  // (group_invites_update_creator) independently enforces this too, but
  // without this the action would silently no-op for a non-creator instead
  // of surfacing a clear error, and the caller would have no way to tell
  // whether the revoke actually happened.
  const { data: group } = await supabase
    .from("groups")
    .select("id, created_by")
    .eq("id", groupId)
    .maybeSingle();
  if (!group || group.created_by !== user.id) {
    throw new Error("Only the group creator can revoke invite links");
  }

  const { error } = await supabase
    .from("group_invites")
    .update({ revoked: true })
    .eq("id", inviteId)
    .eq("group_id", groupId);

  if (error) {
    throw toUserError("revokeInvite failed", error, "Couldn't revoke that invite — please try again.");
  }

  revalidatePath(`/groups/${groupId}`);
}

export type JoinResult =
  | { ok: true; groupId: string }
  | { ok: false; reason: "not-found" | "revoked" | "expired" };

/**
 * Validates an invite token server-side (expiry + revocation) using the
 * service-role client — this is the only path by which a row is ever
 * inserted into group_members outside the auto-membership trigger, exactly
 * because ordinary users have no client-facing insert policy on that table.
 */
export async function redeemInvite(token: string): Promise<JoinResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/join/${token}`)}`);
  }

  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("group_invites")
    .select("id, group_id, revoked, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return { ok: false, reason: "not-found" };
  }
  if (invite.revoked) {
    return { ok: false, reason: "revoked" };
  }
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const { error } = await admin
    .from("group_members")
    .upsert(
      { group_id: invite.group_id, user_id: user.id },
      { onConflict: "group_id,user_id", ignoreDuplicates: true }
    );

  if (error) {
    throw toUserError("redeemInvite failed", error, "Couldn't join that group — please try again.");
  }

  revalidatePath("/groups");
  return { ok: true, groupId: invite.group_id };
}

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return { supabase, user };
}

// Releases any group_member_profiles claim the given user holds in this
// group first — leaving/being removed shouldn't leave a claimed name
// pointing at someone no longer in the group. Best-effort: failure here
// doesn't block the membership removal itself.
async function releaseProfileClaim(
  supabase: SupabaseClient,
  groupId: string,
  userId: string
) {
  await supabase
    .from("group_member_profiles")
    .update({ claimed_by_user_id: null })
    .eq("group_id", groupId)
    .eq("claimed_by_user_id", userId);
}

// Removes your own membership. The creator can't leave their own group this
// way — group_members_delete_self_or_creator (RLS) would technically allow
// it, but a creatorless group leaves group_invites permanently
// unmanageable (its policies are creator-scoped, not membership-scoped).
// Deleting the group entirely is the intended path for a creator who wants
// out.
export async function leaveGroup(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  if (!groupId) {
    throw new Error("Missing group");
  }

  const { supabase, user } = await requireUser();

  const { data: group } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) {
    throw new Error("Group not found");
  }
  if (group.created_by === user.id) {
    throw new Error("As the creator, you can't leave your own group — delete it instead if you want to close it down.");
  }

  await releaseProfileClaim(supabase, groupId, user.id);

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  if (error) {
    throw toUserError("leaveGroup failed", error, "Couldn't leave the group — please try again.");
  }

  revalidatePath("/groups");
  redirect("/groups");
}

// Creator-only: removes someone else's membership.
export async function removeMember(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const memberUserId = String(formData.get("memberUserId") ?? "");
  if (!groupId || !memberUserId) {
    throw new Error("Missing member");
  }

  const { supabase, user } = await requireUser();

  const { data: group } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .maybeSingle();
  if (!group || group.created_by !== user.id) {
    throw new Error("Only the group creator can remove members");
  }
  if (memberUserId === user.id) {
    throw new Error("You can't remove yourself this way — delete the group instead if you want to close it down.");
  }

  await releaseProfileClaim(supabase, groupId, memberUserId);

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", memberUserId);

  if (error) {
    throw toUserError("removeMember failed", error, "Couldn't remove that member — please try again.");
  }

  revalidatePath(`/groups/${groupId}`);
}
