import { clientEnv } from "@/lib/env/client";
import { coverById, coverFor, type ImageAsset } from "@/components/ui/images";

/**
 * Resolve what a group's card should actually show.
 *
 * This is the single place that knows how to read a `group_covers.cover`
 * value, and every surface rendering a group cover goes through it — so the
 * fallback rule ("no choice, or an unresolvable choice, means coverFor") is
 * stated once instead of being re-derived per page.
 *
 * WHY THIS IS NOT IN components/ui/images.ts
 *
 * It needs clientEnv for the Storage origin, and images.ts is imported by
 * app/page.tsx — the unauthenticated landing page, which touches nothing
 * Supabase. clientEnv throws at import time when its vars are missing, so
 * putting this in the registry would make a misconfigured environment take
 * down the marketing page, which currently renders fine without any Supabase
 * config at all. Keeping the env read on this side of the line preserves
 * that, and keeps all env access inside lib/env per CLAUDE.md.
 */
export function coverImageFor(
  groupId: string,
  cover: string | null | undefined
): ImageAsset {
  if (!cover) {
    return coverFor(groupId);
  }

  if (cover.startsWith("registry:")) {
    // Unknown id degrades to the deterministic fallback rather than throwing.
    // Retiring a photo is a supported operation (delete the entry, drop the
    // file) and groups that had chosen it still hold the old key; see
    // coverById's own note.
    return coverById(cover.slice("registry:".length)) ?? coverFor(groupId);
  }

  if (cover.startsWith("upload:")) {
    const path = cover.slice("upload:".length);
    return {
      id: "upload",
      // Built from the trusted Storage origin plus a path the database CHECK
      // constraint has already pinned to `<uuid>/<uuid>.<ext>`. The stored
      // value is a path, never a URL, precisely so nothing user-supplied can
      // decide the origin this src points at — the same reasoning as
      // parsePhotoRefs()'s isSafeHttpUrl(), reached by making the unsafe
      // shape unrepresentable rather than by validating it later.
      src: `${clientEnv.supabaseUrl}/storage/v1/object/public/group-covers/${path}`,
      // Nominal. Every cover surface renders with `fill`, which ignores these
      // — but ImageAsset requires them, and an uploaded file's real
      // dimensions are not known without decoding it server-side.
      width: 1600,
      height: 900,
      alt: "",
      note: "Uploaded by a group member.",
    };
  }

  // Unreachable while the CHECK constraint holds; a row can only be one of
  // the two prefixes. Degrading rather than throwing keeps a hand-edited
  // database row from taking out the groups list.
  return coverFor(groupId);
}
