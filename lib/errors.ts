import "server-only";

// Logs the real error server-side and returns a safe, generic Error for the
// client — raw Postgres/Supabase error text (constraint names, column
// names, internal detail) should never reach the UI verbatim. Used across
// every Server Action and Route Handler that touches the database, in
// place of the previous `throw new Error(error.message)` pattern.
export function toUserError(
  context: string,
  error: unknown,
  fallback = "Something went wrong — please try again."
): Error {
  console.error(context, error);
  return new Error(fallback);
}
