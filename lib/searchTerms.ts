/**
 * Query-text helpers for PlaceRecommendationSearch's preference chips.
 *
 * Plain TS in lib/ rather than inside the component so the check next to it
 * (`node --experimental-strip-types lib/searchTerms.test.mjs`) can import them
 * — Node can strip types, but not JSX. No class strings live here, so the
 * tailwind-purge caveat in components/ui/pillStyles.ts does not apply.
 */

/**
 * Adds `term` to the query text, or takes it back out if it is already there.
 *
 * Whole-word and case-insensitive, with the text left as the single source of
 * truth: a chip reads as pressed if and only if its word is present, so typing
 * the word by hand lights the chip up and deleting it releases it. Every term
 * `preferenceSearchTerms()` produces is a single word, which is what makes a
 * word-level match exact.
 */
export function toggleTerm(text: string, term: string): string {
  const words = text.split(/\s+/).filter(Boolean);
  const at = words.findIndex((w) => w.toLowerCase() === term.toLowerCase());
  if (at >= 0) {
    words.splice(at, 1);
  } else {
    words.push(term);
  }
  return words.join(" ");
}

export function hasTerm(text: string, term: string): boolean {
  return text.split(/\s+/).some((w) => w.toLowerCase() === term.toLowerCase());
}
