import { uploadAvatar } from "@/lib/actions/memberProfiles";
import { Button } from "@/components/ui/Button";

export function AvatarUpload({
  profileId,
  groupId,
}: {
  profileId: string;
  groupId: string;
}) {
  const inputId = `avatar-${profileId}`;
  return (
    <form action={uploadAvatar} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="groupId" value={groupId} />
      {/* A real label, not a bare file input. `accept` stays "image/*" on
          purpose — the authoritative allow-list is ALLOWED_AVATAR_TYPES in
          lib/actions/memberProfiles.ts, which rejects SVG server-side; this
          attribute is only the file picker's default filter. */}
      <label htmlFor={inputId} className="text-label font-semibold text-secondary">
        Your photo
      </label>
      {/* min-h-11 + py-1 sit on the INPUT, not on the file: button. The whole
          input box opens the picker — the pseudo button is only its visible
          part — so the hit target is this element's own height, and
          file:min-h-9 alone measured 36px in the 390px sweep. py-1 centres the
          36px button inside the 44px target instead of pinning it to the top. */}
      <input
        id={inputId}
        type="file"
        name="avatar"
        accept="image/*"
        required
        className="min-h-11 min-w-0 flex-1 basis-48 py-1 text-label text-secondary file:mr-3 file:min-h-9 file:rounded-full file:border file:border-strong file:bg-surface-sunken file:px-3.5 file:text-label file:font-semibold file:text-primary"
      />
      <Button type="submit" variant="secondary" size="sm" pendingText="Uploading…">
        Upload
      </Button>
    </form>
  );
}
