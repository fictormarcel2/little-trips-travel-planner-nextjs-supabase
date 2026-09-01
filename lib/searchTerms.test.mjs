// Manual check — no test runner is configured in this repo. Run with:
//   node --experimental-strip-types lib/searchTerms.test.mjs
//
// Covers the two pieces of real logic behind the preference chips: the
// query-text toggle here, and preferenceSearchTerms()'s dedup/filter/order in
// types/member.ts.

import assert from "node:assert/strict";
import { toggleTerm, hasTerm } from "./searchTerms.ts";
import { preferenceSearchTerms } from "../types/member.ts";

// toggleTerm — add, remove, and leave the rest of the text alone.
assert.equal(toggleTerm("", "Asian"), "Asian");
assert.equal(toggleTerm("dinner", "Asian"), "dinner Asian");
assert.equal(toggleTerm("dinner Asian", "Asian"), "dinner");
assert.equal(toggleTerm("dinner Asian spot", "Asian"), "dinner spot");
// Case-insensitive, so a hand-typed word releases the chip rather than
// doubling it.
assert.equal(toggleTerm("cheap asian", "Asian"), "cheap");
// Whitespace is normalised, never doubled up on removal.
assert.equal(toggleTerm("  dinner   Asian  ", "Asian"), "dinner");
// A word that merely contains the term is not the term.
assert.equal(toggleTerm("Asiana", "Asian"), "Asiana Asian");

// hasTerm — drives the chip's aria-pressed state.
assert.equal(hasTerm("dinner Asian", "asian"), true);
assert.equal(hasTerm("Asiana lounge", "Asian"), false);
assert.equal(hasTerm("", "Asian"), false);

// preferenceSearchTerms — union across members, canonical order, slashed
// labels reduced to their first word.
assert.deepEqual(
  preferenceSearchTerms([
    { food_preference: ["korean"], activity_preference: [], environment_preference: null },
    {
      food_preference: ["asian", "korean"],
      activity_preference: ["chill_relaxed"],
      environment_preference: "outdoor",
    },
  ]),
  ["Asian", "Korean", "Chill", "Outdoor"]
);

// "Something new" and "Mix" mean "no strong preference" and are never offered.
assert.deepEqual(
  preferenceSearchTerms([
    {
      food_preference: ["something_new"],
      activity_preference: [],
      environment_preference: "mix",
    },
  ]),
  []
);

// No rows, and rows with nothing set, both yield no chips at all.
assert.deepEqual(preferenceSearchTerms([]), []);
assert.deepEqual(
  preferenceSearchTerms([
    { food_preference: [], activity_preference: [], environment_preference: null },
  ]),
  []
);

console.log("searchTerms: all assertions passed");
