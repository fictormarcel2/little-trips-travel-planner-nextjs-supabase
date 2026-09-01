"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toUserError } from "@/lib/errors";
import { coverById } from "@/components/ui/images";

/**
 * Content types a cover upload may have, mapped to the extension actually
 * written to Storage.
 *
 * Deliberately an allow-list keyed by exact type, not `startsWith("image/")`.
 * That shortcut admits image/svg+xml, and an SVG in a public-read bucket is
 * scriptable markup served from our own origin — the documented reason
 * ALLOWED_AVATAR_TYPES in lib/actions/memberProfiles.ts has the same shape.
 *
 * Tighter than the avatar list by one entry: no GIF. An animated 16:9 card
 * background is not something worth inviting into the groups list.
 *
 * The extension comes from this map, never from the uploaded filename, so a
 * file called "photo.png.svg" cannot land in Storage wearing a trusted
 * extension. supabase/migrations/0007_group_covers.sql repeats both the type
 * list and a 2MiB cap on the bucket itself, so neither depends on this
 * function having run.
 */
const ALLOWED_COVER_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const BUCKET = "group-covers";

async function requireGroupMember(groupId: string) {
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

  // RLS (groups_select_members) scopes this to groups the caller belongs to,
  // so a non-member simply gets no row — the same premise the group page
  // relies on to 404. This check exists to turn that into a clear message
  // rather than an opaque failure three statements later.
  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) {
    throw new Error("Group not found");
  }

  return { supabase, user };
}

/**
 * Best-effort removal of a previously uploaded cover file.
 *
 * Called after the new cover is already saved, so failure here never fails
 * the operation the user asked for — identical in spirit to uploadAvatar()'s
 * cleanup. Without it, every switch away from an upload would leak the old
 * file into a public bucket permanently.
 *
 * ponytail: only removes files in the caller's own folder — the Storage
 * policies are uid-scoped, so member B replacing member A's uploaded cover
 * orphans A's file. Bounded at one 2MiB object per member per group, which
 * is why it is accepted rather than solved; solving it needs either a
 * group-scoped folder policy that casts a client-supplied path segment to
 * uuid, or a service-role cleanup path, and neither is worth it at this size.
 */
async function removePreviousUpload(
  supabase: ReturnType<typeof createClient>,
  previousCover: string | null,
  userId: string,
  keepPath: string | null
) {
  if (!previousCover || !previousCover.startsWith("upload:")) return;

  const path = previousCover.slice("upload:".length);
  if (path === keepPath) return;
  if (!path.startsWith(`${userId}/`)) return;

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    console.error("Failed to clean up previous group cover", error);
  }
}

async function currentCover(
  supabase: ReturnType<typeof createClient>,
  groupId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("group_covers")
    .select("cover")
    .eq("group_id", groupId)
    .maybeSingle();
  return data?.cover ?? null;
}

/**
 * Choose one of the curated covers, or clear the choice entirely.
 *
 * An empty `coverId` means "clear", which deletes the row and returns the
 * group to coverFor(id). That is a real thing a user wants — having picked a
 * photo, they should be able to stop having picked one — and it costs one
 * branch rather than a separate action.
 */
export async function setGroupCover(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const coverId = String(formData.get("coverId") ?? "").trim();

  const { supabase, user } = await requireGroupMember(groupId);
  const previous = await currentCover(supabase, groupId);

  if (!coverId) {
    const { error } = await supabase
      .from("group_covers")
      .delete()
      .eq("group_id", groupId);
    if (error) {
      throw toUserError(
        "setGroupCover clear failed",
        error,
        "Couldn't reset the cover — please try again."
      );
    }
    await removePreviousUpload(supabase, previous, user.id, null);
    revalidatePath("/groups");
    revalidatePath(`/groups/${groupId}`);
    return;
  }

  // Resolved against the registry rather than trusted as text. A client that
  // posts `../../etc` or an id that was retired last week gets a clear error
  // here; the database CHECK would catch the malformed shape regardless, but
  // it cannot know which ids actually exist in the code.
  if (!coverById(coverId)) {
    throw new Error("That cover isn't one of the available options");
  }

  const { error } = await supabase
    .from("group_covers")
    .upsert({ group_id: groupId, cover: `registry:${coverId}` }, { onConflict: "group_id" });

  if (error) {
    throw toUserError(
      "setGroupCover failed",
      error,
      "Couldn't save that cover — please try again."
    );
  }

  await removePreviousUpload(supabase, previous, user.id, null);

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
}

/** Upload a photo of the group's own as its cover. */
export async function uploadGroupCover(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const file = formData.get("cover");

  const { supabase, user } = await requireGroupMember(groupId);

  // Guests may choose a registry cover but not upload a file. Anonymous users
  // carry the same `authenticated` role as permanent ones, so this has to be
  // asserted rather than assumed — the same explicit check groups_insert_self
  // makes for group creation. The Storage policy in 0007 enforces it
  // independently; this exists to produce a sentence instead of a rejection.
  if (user.is_anonymous) {
    throw new Error(
      "Guest accounts can't upload photos — pick one of the covers above, or sign up with email."
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a photo to upload");
  }

  const ext = ALLOWED_COVER_TYPES[file.type];
  if (!ext) {
    throw new Error("Cover must be a PNG, JPEG or WEBP image");
  }

  const previous = await currentCover(supabase, groupId);

  // Path is built entirely from server-known values: the caller's own id
  // (which the Storage policy pins to the folder) and the group id. Nothing
  // from the uploaded filename reaches it. One object per member per group,
  // so re-uploading the same type overwrites in place instead of
  // accumulating — hence upsert.
  const path = `${user.id}/${groupId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) {
    throw toUserError(
      "uploadGroupCover upload failed",
      uploadError,
      "Couldn't upload that photo — please try again."
    );
  }

  const { error } = await supabase
    .from("group_covers")
    .upsert({ group_id: groupId, cover: `upload:${path}` }, { onConflict: "group_id" });

  if (error) {
    throw toUserError(
      "uploadGroupCover save failed",
      error,
      "Couldn't save that photo — please try again."
    );
  }

  // Only matters when the previous upload had a different extension: same-ext
  // re-uploads already overwrote themselves above, and `keepPath` stops this
  // deleting the file just written.
  await removePreviousUpload(supabase, previous, user.id, path);

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
}
