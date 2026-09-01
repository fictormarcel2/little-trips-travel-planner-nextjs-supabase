import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Requires an actual same-origin relative path — rejects anything that
// could resolve to a different host once prefixed with `origin` (an
// absolute URL like "https://evil.example", or a protocol-relative one like
// "//evil.example"). The current `${origin}${next}` construction happens to
// produce an unparseable URL for the absolute-URL case anyway (string
// concatenation, not URL resolution), but that's incidental, not a
// guarantee — this makes the safety explicit instead of relying on that.
function isSafeRedirectPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\");
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  const next = rawNext && isSafeRedirectPath(rawNext) ? rawNext : "/groups";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
