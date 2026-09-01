import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 20;

/**
 * Supabase-backed sliding-window rate limiter keyed on (user, endpoint).
 * Uses the admin client because `api_rate_limits` has no client-facing RLS
 * policies at all — it's bookkeeping the server owns, not user data.
 *
 * This inserts a row per allowed request and never deletes here — a daily
 * pg_cron job (supabase/migrations/0002_rate_limit_cleanup.sql) purges rows
 * older than a day so the table doesn't grow unbounded.
 */
export async function checkAndRecordRateLimit(
  userId: string,
  endpoint: string
): Promise<{ allowed: boolean; count: number; limit: number }> {
  const admin = createAdminClient();
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count, error: countError } = await admin
    .from("api_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .gte("created_at", windowStart);

  if (countError) {
    throw new Error(countError.message);
  }

  const currentCount = count ?? 0;
  if (currentCount >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, count: currentCount, limit: MAX_REQUESTS_PER_WINDOW };
  }

  const { error: insertError } = await admin
    .from("api_rate_limits")
    .insert({ user_id: userId, endpoint });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return { allowed: true, count: currentCount + 1, limit: MAX_REQUESTS_PER_WINDOW };
}
