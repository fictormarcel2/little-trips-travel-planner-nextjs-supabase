// Manual check — no test runner is configured in this repo. Run with:
//   node components/ui/pillStyles.test.mjs
//
// pillStyles.ts is plain TS with no JSX/types beyond a function signature,
// so it's read as text and the emitted class strings are asserted directly
// rather than transpiling — avoids adding a build step for four asserts.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const src = readFileSync(fileURLToPath(new URL("./pillStyles.ts", import.meta.url)), "utf8");

function extractConst(name) {
  const m = src.match(new RegExp(`const ${name} =\\s*\\n?\\s*"([^"]+)"`));
  assert.ok(m, `could not find const ${name} in pillStyles.ts`);
  return m[1];
}

const base = extractConst("BASE");
const active = extractConst("ACTIVE");
const inactive = extractConst("INACTIVE");

const pillClasses = (isActive) => [base, isActive ? active : inactive].join(" ");

// 1. The two states must differ.
assert.notEqual(pillClasses(true), pillClasses(false));

// 2. Every hover: class has a matching focus-visible: class (buttonStyles.ts's
//    rule: hover feedback is never hover-only).
for (const output of [pillClasses(true), pillClasses(false)]) {
  const classes = output.split(/\s+/);
  const hovers = classes.filter((c) => c.startsWith("hover:"));
  const focusVisibles = new Set(classes.filter((c) => c.startsWith("focus-visible:")));
  for (const hover of hovers) {
    const suffix = hover.slice("hover:".length);
    assert.ok(
      focusVisibles.has(`focus-visible:${suffix}`),
      `hover:${suffix} has no matching focus-visible:${suffix}`,
    );
  }
}

// 3. Both outputs contain the focus ring classes.
for (const output of [pillClasses(true), pillClasses(false)]) {
  assert.match(output, /focus-visible:ring-2/);
  assert.match(output, /focus-visible:ring-accent/);
}

// 4. Neither output contains a raw palette step.
const rawPalette = /(cream|terracotta|dustyrose|sage|ink)-\d/;
assert.doesNotMatch(pillClasses(true), rawPalette);
assert.doesNotMatch(pillClasses(false), rawPalette);

console.log("pillStyles.test.mjs: all checks passed");
