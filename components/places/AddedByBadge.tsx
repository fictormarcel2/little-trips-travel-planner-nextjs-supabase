import { AvatarCircle } from "@/components/groups/AvatarCircle";
import { Tooltip } from "@/components/ui/Tooltip";
import type { MemberProfile } from "@/types/member";

// `places.added_by` is a raw auth.uid() — resolved to a display name/avatar
// via group_member_profiles by the itinerary page (see PlaceCard's caller).
// That resolution can come back null (the adder never claimed a profile —
// true for email-authenticated users like the group creator, who skip the
// claiming flow entirely), so this always renders *something* rather than
// silently omitting the badge.
export function AddedByBadge({
  profile,
}: {
  profile: Pick<MemberProfile, "display_name" | "avatar_url"> | null;
}) {
  const name = profile?.display_name ?? "a group member";
  return (
    <Tooltip label={`Added by ${name}`} content={`Added by ${name}`} align="end" className="shrink-0">
      {/* ring-surface, not ring-white: this sits on a card, so the ring
          separates against the card's own ground and needs to re-tint with
          it. ring-white computed as a literal white ring in both themes —
          invisible on the dark card in dark mode. PeopleSheet's avatar
          stack uses the same token for the same reason. */}
      <AvatarCircle
        name={profile?.display_name ?? "?"}
        avatarUrl={profile?.avatar_url ?? null}
        className="h-6 w-6 text-[10px] ring-2 ring-surface"
      />
    </Tooltip>
  );
}
