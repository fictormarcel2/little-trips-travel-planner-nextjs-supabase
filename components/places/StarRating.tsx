// Real star rating pulled from Google at add-time — not AI-generated, and
// not gated behind generating an AI summary first (unlike the Duo/Group/
// Quality badges this ultimately replaced).
//
// Renders as SVG rather than the "★"/"☆" glyphs this used to use, for two
// reasons: glyphs can't be half-filled (the old version ran the rating
// through Math.round, so 4.4 and 4.6 both drew four solid stars and a rating
// of 4.5 was unrepresentable), and the glyph pair was being drawn by whatever
// fallback font the browser happened to pick, which is outside this app's
// type system entirely.
//
// Fractional fill is done by overlaying a clipped copy of the same row rather
// than by an SVG gradient, so there are no generated element ids to collide
// when several of these render on one page.

import { formatCount } from "@/lib/format";

const STAR_PATH =
  "M12 2.6l2.9 5.88 6.49.95-4.7 4.58 1.11 6.46L12 17.42l-5.8 3.05 1.1-6.46-4.69-4.58 6.49-.95L12 2.6z";

const SIZES = {
  sm: { star: 13, gap: 1 },
  lg: { star: 18, gap: 2 },
} as const;

function StarRow({
  size,
  filled,
}: {
  size: keyof typeof SIZES;
  filled: boolean;
}) {
  const { star, gap } = SIZES[size];
  return (
    <span className="flex" style={{ gap: `${gap}px` }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width={star}
          height={star}
          viewBox="0 0 24 24"
          aria-hidden
          className="shrink-0"
        >
          {/* Both states carry the same stroke, so the filled star occupies
              exactly the outline star's footprint. Dropping the stroke on the
              filled one would inset it by half a stroke width and leave a
              hairline gap along the split of a half-filled star. */}
          <path
            d={STAR_PATH}
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

export function StarRating({
  rating,
  ratingCount,
  size = "sm",
}: {
  rating: number | null;
  ratingCount: number | null;
  size?: keyof typeof SIZES;
}) {
  if (rating == null) return null;

  // Snap to the nearest half, the way Google and TripAdvisor both present a
  // star rating — the exact average still shows as a number beside it, so
  // nothing is lost by not drawing, say, 87% of a fifth star.
  const snapped = Math.min(5, Math.max(0, Math.round(rating * 2) / 2));
  const { star, gap } = SIZES[size];
  const rowWidth = star * 5 + gap * 4;

  return (
    <span
      // text-accent, the token, rather than the terracotta-600 it resolves to
      // today: the stars are a graphic carrying the rating, so they follow the
      // accent role and a future contrast change to it reaches them too.
      className="inline-flex text-accent"
      role="img"
      aria-label={`Rated ${rating.toFixed(1)} out of 5${
        ratingCount != null ? ` from ${formatCount(ratingCount)} Google reviews` : " on Google"
      }`}
    >
      {/* `block` is load-bearing, not tidiness: width/height are ignored on an
          inline box, and this only happens to work today because the parent is
          inline-flex and blockifies its children. */}
      <span
        className="relative block shrink-0"
        style={{ width: `${rowWidth}px`, height: `${star}px` }}
      >
        <StarRow size={size} filled={false} />
        <span
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${(snapped / 5) * rowWidth}px` }}
        >
          <span className="block" style={{ width: `${rowWidth}px` }}>
            <StarRow size={size} filled />
          </span>
        </span>
      </span>
    </span>
  );
}

// The compact inline form used where a rating sits alongside other metadata
// (the details drawer header), as opposed to PlaceCard's prominent block.
export function StarRatingInline({
  rating,
  ratingCount,
}: {
  rating: number | null;
  ratingCount: number | null;
}) {
  if (rating == null) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <StarRating rating={rating} ratingCount={ratingCount} size="sm" />
      <span aria-hidden className="text-body font-semibold text-primary">
        {rating.toFixed(1)}
      </span>
      {ratingCount != null && (
        <span aria-hidden className="text-label text-secondary">
          ({formatCount(ratingCount)})
        </span>
      )}
    </span>
  );
}
