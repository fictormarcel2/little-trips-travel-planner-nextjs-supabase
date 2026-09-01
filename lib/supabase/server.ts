import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { clientEnv } from "@/lib/env/client";

/**
 * Server-side Supabase client scoped to the current request's session
 * (via cookies). Use in Server Components, Route Handlers, and Server
 * Actions. Respects RLS as the signed-in user — never bypasses it.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    clientEnv.supabaseUrl,
    clientEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — the middleware is
            // responsible for refreshing the session cookie in that case.
          }
        },
      },
    }
  );
}
