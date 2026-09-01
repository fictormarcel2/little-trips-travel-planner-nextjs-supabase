// Shared between the server (validating the model's output before storing
// it) and client components (typing `places.ai_details` for display). No
// server-only imports here on purpose.

export const PRICE_RANGES = ["$", "$$", "$$$", "$$$$", "unknown"] as const;
export type PriceRange = (typeof PRICE_RANGES)[number];

// The single AI surface for a place — powers the "Details" drawer
// (components/places/PlaceDetailsDrawer.tsx), grounded in real Google review
// text. This replaced a second, ungrounded `AiSummary` shape (and its
// /api/places/summarize route) that guessed vibe/description/recommendations
// from the place's name and category alone: the two overlapped on what they
// told the user — recommendedThings vs whatToOrder, vibe/description vs
// whatItsLike — while only one of them was actually grounded in anything, and
// each burned its own rate-limit quota. See app/api/places/details/route.ts's
// system prompt for the exact grounding rules this shape is meant to enforce.
export interface AiDetails {
  whatPeopleSay: {
    // True only when the supplied review excerpts gave clear, recurring
    // signal. When false, frequentlyPraised/commonCriticisms must both be
    // empty — enforced defensively below, not just by prompting — and
    // overallImpression should read as an honest "not enough data yet" note
    // rather than invented sentiment.
    hasEnoughReviews: boolean;
    frequentlyPraised: string[];
    commonCriticisms: string[];
    overallImpression: string;
  };
  // Specific dish/item names are allowed here ONLY when explicitly present
  // in the supplied review text — otherwise general, or empty. Rendered
  // under a category-appropriate heading ("What to order" / "What to see" /
  // "What to do"), resolved via placeRecommendationsHeading in types/place.ts.
  whatToOrder: string[];
  whatItsLike: string;
  goodToKnow: string[];
  // Optional, not required, and deliberately so: this field was carried over
  // from the retired AiSummary shape, so every `ai_details` row written
  // before that merge predates it. Requiring it would make all of those rows
  // fail validation and silently re-render as "no details yet", throwing away
  // AI output the user already paid a rate-limit slot for. New generations
  // always include it (it's in the route's required[] list) — old ones just
  // render without a price badge.
  priceRange?: PriceRange;
}

export function isValidAiDetails(value: unknown): value is AiDetails {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const wps = v.whatPeopleSay;
  if (!wps || typeof wps !== "object") return false;
  const w = wps as Record<string, unknown>;

  const isStringArray = (a: unknown, max: number) =>
    Array.isArray(a) &&
    a.length <= max &&
    a.every((t) => typeof t === "string" && t.trim().length > 0);

  if (
    typeof w.hasEnoughReviews !== "boolean" ||
    !isStringArray(w.frequentlyPraised, 4) ||
    !isStringArray(w.commonCriticisms, 4) ||
    typeof w.overallImpression !== "string" ||
    w.overallImpression.trim().length === 0 ||
    !isStringArray(v.whatToOrder, 5) ||
    typeof v.whatItsLike !== "string" ||
    v.whatItsLike.trim().length === 0 ||
    !isStringArray(v.goodToKnow, 4)
  ) {
    return false;
  }

  // Absent is valid (see the field comment above); present-but-wrong is not.
  if (
    v.priceRange !== undefined &&
    !(typeof v.priceRange === "string" && (PRICE_RANGES as readonly string[]).includes(v.priceRange))
  ) {
    return false;
  }

  // Defense in depth, not just prompt-level: a model output claiming "not
  // enough reviews" but still listing specific praised/criticized points is
  // internally inconsistent and gets rejected here rather than displayed —
  // same "never trust model output as-is" posture as the rest of this file.
  if (!w.hasEnoughReviews) {
    if ((w.frequentlyPraised as string[]).length > 0 || (w.commonCriticisms as string[]).length > 0) {
      return false;
    }
  }
  return true;
}
