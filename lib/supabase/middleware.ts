import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { clientEnv } from "@/lib/env/client";

const PROTECTED_PREFIXES = ["/groups"];
const PUBLIC_ONLY_PREFIXES = ["/login"];

/**
 * Refreshes the Supabase auth session cookie on every request and applies
 * coarse route protection. Fine-grained authorization (is this user a
 * member of *this* group?) always happens again server-side per request —
 * this is just the outer gate that keeps signed-out users off protected
 * pages and bounces signed-in users away from the login screen.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    clientEnv.supabaseUrl,
    clientEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isPublicOnly = PUBLIC_ONLY_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isPublicOnly) {
    return NextResponse.redirect(new URL("/groups", request.url));
  }

  return response;
}
