"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toUserError } from "@/lib/errors";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/constraints";

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

// Claims any slot — unclaimed, or already claimed by someone else — for
// the current user. Any group member can claim any role at any time; this
// is what makes switching devices (or just changing your mind) work without
// being permanently locked into whichever slot you first picked.
//
// A unique index allows at most one claimed slot per (group, user), so
// switching roles means releasing any existing claim first — otherwise the
// second update below would collide with it. This is two separate
// statements, not one transaction: if the release succeeds but the claim
// then fails, the user ends up simply unclaimed rather than in a broken
// state, recoverable by claiming again.
export async function claimProfile(formData: FormData) {
  const profileId = String(formData.get("profileId") ?? "");
  const groupId = String(formData.get("groupId") ?? "");
  if (!profileId || !groupId) {
    throw new Error("Missing profile");
  }

  const { supabase, user } = await requireUser();

  await supabase
    .from("group_member_profiles")
    .update({ claimed_by_user_id: null })
    .eq("group_id", groupId)
    .eq("claimed_by_user_id", user.id)
    .neq("id", profileId);

  const { data, error } = await supabase
    .from("group_member_profiles")
    .update({ claimed_by_user_id: user.id })
    .eq("id", profileId)
    .eq("group_id", groupId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw toUserError("claimProfile failed", error, "Couldn't claim that name — please try again.");
  }
  if (!data) {
    throw new Error("Couldn't claim that name — try again.");
  }

  revalidatePath(`/groups/${groupId}`);
}

// Self-service: create a new slot and claim it in the same step, for
// joiners whose name isn't already in the list.
export async function createAndClaimProfile(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!groupId || !displayName) {
    throw new Error("Name is required");
  }
  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    throw new Error(`Name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer`);
  }

  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("group_member_profiles").insert({
    group_id: groupId,
    display_name: displayName,
    claimed_by_user_id: user.id,
  });

  if (error) {
    throw toUserError("createAndClaimProfile failed", error, "Couldn't join in — please try again.");
  }

  revalidatePath(`/groups/${groupId}`);
}

// Pre-add an unclaimed placeholder slot (e.g. the creator listing who they
// expect to join), for someone else to claim later.
export async function addUnclaimedSlot(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!groupId || !displayName) {
    throw new Error("Name is required");
  }
  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    throw new Error(`Name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer`);
  }

  const { supabase } = await requireUser();

  const { error } = await supabase.from("group_member_profiles").insert({
    group_id: groupId,
    display_name: displayName,
  });

  if (error) {
    throw toUserError("addUnclaimedSlot failed", error, "Couldn't add that name — please try again.");
  }

  revalidatePath(`/groups/${groupId}`);
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

// Deliberately a strict allow-list, not a loose file.type.startsWith("image/")
// check — that pattern also admits image/svg+xml, and an SVG is a text/XML
// document that can carry a <script>. <img> rendering doesn't execute it
// (AvatarCircle is safe), but the avatars bucket is public, so the file's
// direct URL is reachable as a top-level navigation, where an SVG's script
// does run. The extension is derived from this validated type too, not from
// the client-supplied filename, so there's no path where a mislabeled file
// (e.g. an SVG renamed to "photo.png") ends up with a trusted-looking
// extension in Storage.
const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function uploadAvatar(formData: FormData) {
  const profileId = String(formData.get("profileId") ?? "");
  const groupId = String(formData.get("groupId") ?? "");
  const file = formData.get("avatar");

  if (!profileId || !groupId || !(file instanceof File) || file.size === 0) {
    throw new Error("Missing avatar file");
  }
  const ext = ALLOWED_AVATAR_TYPES[file.type];
  if (!ext) {
    throw new Error("Avatar must be a PNG, JPEG, WEBP, or GIF image");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Image is too large (max 5MB)");
  }

  const { supabase, user } = await requireUser();

  const path = `${user.id}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    throw toUserError("uploadAvatar upload failed", uploadError, "Couldn't upload that image — please try again.");
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("group_member_profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", profileId)
    .eq("group_id", groupId)
    .eq("claimed_by_user_id", user.id);
  if (updateError) {
    throw toUserError("uploadAvatar profile update failed", updateError, "Couldn't save that image — please try again.");
  }

  // Best-effort cleanup of any previous avatar(s) now that the new one is
  // live — without this, every avatar change leaks another file into the
  // public bucket forever. Failure here doesn't fail the upload itself:
  // the new avatar is already saved and working at this point.
  const { data: existingFiles } = await supabase.storage.from("avatars").list(user.id);
  const staleFiles = (existingFiles ?? [])
    .map((f) => `${user.id}/${f.name}`)
    .filter((p) => p !== path);
  if (staleFiles.length > 0) {
    const { error: removeError } = await supabase.storage.from("avatars").remove(staleFiles);
    if (removeError) {
      console.error("Failed to clean up old avatar(s)", removeError);
    }
  }

  revalidatePath(`/groups/${groupId}`);
}
