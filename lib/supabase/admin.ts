import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env/client";
import { serverEnv } from "@/lib/env/server";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely —
 * only ever import this from server-only code (Route Handlers, Server
 * Actions), and only for the specific operations that legitimately need
 * to act outside a user's own RLS-scoped access (e.g. validating and
 * redeeming an invite token before the user is a group member).
 *
 * The `server-only` import above makes any accidental client-side import
 * of this module fail the build rather than leaking the service key.
 */
export function createAdminClient() {
  return createSupabaseClient(
    clientEnv.supabaseUrl,
    serverEnv.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
