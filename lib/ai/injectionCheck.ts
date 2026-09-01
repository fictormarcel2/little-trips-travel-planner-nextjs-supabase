// Shared, cheap prompt-injection heuristic used by every Route Handler that
// sends user- (or public review-) sourced free text to Claude. Never blocks
// a request — delimiters + system-prompt framing at each call site are the
// actual defense; this only makes attempts observable in logs, since no
// input-side check can fully neutralize a sufficiently creative attempt.
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(the\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(all\s+)?(the\s+)?(previous|prior|above)/i,
  /you\s+are\s+now\s+/i,
  /new\s+instructions?\s*:/i,
  /system\s*prompt/i,
  /act\s+as\s+(a|an)\s+/i,
  /\bDAN\b/,
];

export function findInjectionAttempt(
  fields: Record<string, string | null | undefined>
): string | null {
  for (const [field, value] of Object.entries(fields)) {
    if (value && INJECTION_PATTERNS.some((pattern) => pattern.test(value))) {
      return field;
    }
  }
  return null;
}
