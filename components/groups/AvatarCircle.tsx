// The ring lives in the default className rather than in SHARED so a caller
// that passes its own sizing can also replace it outright — AddedByBadge
// needs ring-2 ring-white to lift its avatar off a photo, and two competing
// ring-* utilities in one class string resolve by stylesheet order, not by
// the order they were written.
const SHARED = "shrink-0 rounded-full";

export function AvatarCircle({
  name,
  avatarUrl,
  className = "h-9 w-9 text-label ring-1 ring-strong",
}: {
  name: string;
  avatarUrl: string | null;
  className?: string;
}) {
  if (avatarUrl) {
    // Supabase Storage public URLs are external — plain <img> avoids
    // configuring next/image remotePatterns for this one small use.
    //
    // alt="" for the same reason the initial below is aria-hidden: this photo
    // never appears without its owner's name being announced beside it, as
    // list text in MembersSection and as AddedByBadge's tooltip label. It read
    // alt={name}, which made the badge announce "Added by Alex, Alex" and the
    // members list read every name twice.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className={`${SHARED} object-cover ${className}`}
      />
    );
  }
  // aria-hidden because the initial is a redundant rendering of a name that
  // is always announced beside it — as list text in MembersSection, and as
  // AddedByBadge's tooltip label.
  return (
    <span
      aria-hidden
      className={`${SHARED} flex items-center justify-center bg-accent-tint font-bold text-accent-on-tint ${className}`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
