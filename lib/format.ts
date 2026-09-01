/**
 * Display formatting that must not depend on where the code happens to run.
 *
 * `Number.prototype.toLocaleString()` with no locale argument resolves against
 * the *host's* default — the server's under Node, the browser's on the client.
 * A rating count therefore rendered as "1,284" on a card (a Server Component)
 * and as "1.284" in the add-place preview (a Client Component) for the same
 * place on the same German machine.
 *
 * Worse, it is a hydration mismatch waiting to happen: any of these call sites
 * moving inside a "use client" boundary would start rendering one string on
 * the server and a different one in the browser, which React reports as
 * "Text content does not match server-rendered HTML" — exactly the class of
 * bug components/groups/InviteLink.tsx shipped with.
 *
 * Pinning the locale removes both problems at once. `en-US` rather than the
 * user's own because every string this app writes around these numbers is
 * English ("1,284 Google reviews") and a mixed-convention line reads as a bug.
 */
const COUNT_FORMAT = new Intl.NumberFormat("en-US");

/** Thousands-separated count, identical on server and client. */
export function formatCount(value: number): string {
  return COUNT_FORMAT.format(value);
}

/**
 * Dates had the same host-dependence problem and a consistency problem on top
 * of it. The group page rendered a trip's date through
 * `toLocaleDateString(undefined, { month: "short", … })` as "Sep 5, 2026" and,
 * a section below, an invite's expiry through a bare `toLocaleDateString()` as
 * "8/24/2026" — two conventions for the same kind of value on one screen, one
 * of them the ambiguous all-numeric form that means different days either side
 * of the Atlantic.
 *
 * Two shapes, both spelled-out month, so a date is never ambiguous:
 *   formatDate     → "Sep 5, 2026"       (DATE columns: planned_date)
 *   formatDateLong → "Sat, Sep 5, 2026"  (DATE columns: planned trip dates,
 *                                         where the weekday is the point)
 *   formatTimestamp→ "Sep 5, 2026"       (timestamptz columns: created_at,
 *                                         expires_at; identical visual shape
 *                                         to formatDate but UTC-pinned)
 *
 * **The split: DATE vs timestamptz columns must use different time zones.**
 *
 * DATE columns (`planned_date`) are stored without timezone info and read back
 * as `${d}T00:00:00`, i.e. local midnight. The time zone is deliberately *not*
 * pinned, so formatting in the same local zone returns the day that was stored.
 * Forcing UTC would render the day *before* for every reader east of Greenwich.
 *
 * timestamptz columns (`created_at`, `expires_at`) are absolute points in time.
 * A timestamp "2026-09-05T23:30:00Z" is different calendar days in different
 * timezones. Without pinning the zone, it renders as "Sep 5" on a UTC server
 * and "Sep 6" in a browser east of Greenwich — a hydration mismatch React
 * reports as "Text content does not match" (error #418/#425). formatTimestamp
 * pins `timeZone: "UTC"` to ensure the same string renders everywhere.
 */
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const DATE_FORMAT_LONG = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const TIMESTAMP_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** "Sep 5, 2026". Accepts an ISO timestamp or a Date. For DATE columns (planned_date). */
export function formatDate(value: string | Date): string {
  return DATE_FORMAT.format(typeof value === "string" ? new Date(value) : value);
}

/** "Sat, Sep 5, 2026" — for dates where the weekday carries the meaning. For DATE columns. */
export function formatDateLong(value: string | Date): string {
  return DATE_FORMAT_LONG.format(typeof value === "string" ? new Date(value) : value);
}

/** "Sep 5, 2026" — for timestamptz columns (created_at, expires_at), with UTC pinned. */
export function formatTimestamp(value: string | Date): string {
  return TIMESTAMP_FORMAT.format(typeof value === "string" ? new Date(value) : value);
}

/**
 * A `planned_date` DATE column ("2026-09-05") as a Date at *local* midnight.
 * `new Date("2026-09-05")` parses as UTC midnight, which renders as the 4th
 * for anyone behind UTC — the bug this `T00:00:00` suffix exists to avoid.
 */
export function parsePlannedDate(plannedDate: string): Date {
  return new Date(`${plannedDate}T00:00:00`);
}

/**
 * Check if a timestamptz has expired relative to a given time in milliseconds.
 * Pass `Date.now()` (or a mocked value in tests) as `now` to keep the function
 * pure and testable, and to make the server/client split visible at the call site.
 */
export function isExpired(iso: string, now: number): boolean {
  return new Date(iso).getTime() < now;
}
