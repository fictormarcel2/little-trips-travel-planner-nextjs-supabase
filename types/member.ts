export interface MemberProfile {
  id: string;
  group_id: string;
  display_name: string;
  avatar_url: string | null;
  claimed_by_user_id: string | null;
}

// Single source of truth for the preference quiz's option sets — mirrors
// types/place.ts's PLACE_CATEGORIES {value, label} convention. Never
// hardcode these lists a second time.
export const FOOD_PREFERENCES = [
  { value: "asian", label: "Asian" },
  { value: "japanese", label: "Japanese" },
  { value: "korean", label: "Korean" },
  { value: "western", label: "Western" },
  { value: "something_new", label: "Something new" },
] as const;

export const ACTIVITY_PREFERENCES = [
  { value: "fun_lively", label: "Fun / lively" },
  { value: "chill_relaxed", label: "Chill / relaxed" },
  { value: "explorative_adventurous", label: "Explorative / adventurous" },
] as const;

export const ENVIRONMENT_PREFERENCES = [
  { value: "indoor", label: "Indoor" },
  { value: "outdoor", label: "Outdoor" },
  { value: "mix", label: "Mix" },
] as const;

export type FoodPreference = (typeof FOOD_PREFERENCES)[number]["value"];
export type ActivityPreference = (typeof ACTIVITY_PREFERENCES)[number]["value"];
export type EnvironmentPreference = (typeof ENVIRONMENT_PREFERENCES)[number]["value"];

export interface MemberPreferences {
  id: string;
  group_member_profile_id: string;
  food_preference: string[];
  activity_preference: string[];
  environment_preference: string | null;
  other_preferences: string | null;
}

// Values that mean "no strong preference". They carry no signal for a Google
// Text Search query — "mix" in particular actively misdirects it — so they are
// collected in the form but never offered as a search term.
const NO_SIGNAL_PREFERENCES = new Set<string>(["something_new", "mix"]);

const ALL_PREFERENCE_OPTIONS = [
  ...FOOD_PREFERENCES,
  ...ACTIVITY_PREFERENCES,
  ...ENVIRONMENT_PREFERENCES,
];

/**
 * The union of a group's saved preferences, as search terms for
 * PlaceRecommendationSearch's suggestion chips.
 *
 * Iterates the option lists rather than the rows so the order is the canonical
 * one (food, then activity, then environment) no matter what order Postgres
 * returns rows in — otherwise the chips would reshuffle between renders.
 */
export function preferenceSearchTerms(
  rows: Pick<
    MemberPreferences,
    "food_preference" | "activity_preference" | "environment_preference"
  >[]
): string[] {
  const chosen = new Set<string>();
  for (const row of rows) {
    for (const value of row.food_preference) chosen.add(value);
    for (const value of row.activity_preference) chosen.add(value);
    if (row.environment_preference) chosen.add(row.environment_preference);
  }

  const terms: string[] = [];
  for (const option of ALL_PREFERENCE_OPTIONS) {
    if (!chosen.has(option.value) || NO_SIGNAL_PREFERENCES.has(option.value)) continue;
    // ponytail: "Fun / lively" -> "Fun". A slashed label is a two-word gloss of
    // one idea and only the first half belongs in a query. Give the option
    // arrays an explicit `query` field if a label ever needs a term that is not
    // its own first word.
    const term = option.label.split(" / ")[0];
    if (!terms.includes(term)) terms.push(term);
  }
  return terms;
}
