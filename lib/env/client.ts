// Centralized, validated access to every NEXT_PUBLIC_* env var — safe to
// import from client components, Server Components, Route Handlers, or
// middleware alike, since none of these are secret. Do NOT add anything
// here that isn't meant to ship in the client bundle; see lib/env/server.ts
// for the secret counterpart, kept in a separate file (not just a separate
// export) because a single `server-only`-guarded module would make the
// whole module — including these non-secret vars — fail to import from
// client code.
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Check .env.local against .env.local.example.`
    );
  }
  return value;
}

export const clientEnv = {
  supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: requireEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),
  googleMapsApiKey: requireEnv(
    "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  ),
  // Not required: hCaptcha is currently paused (see
  // components/groups/JoinAsGuest.tsx's HCAPTCHA_ENABLED flag and
  // CLAUDE.md's "CAPTCHA — currently paused" section) — the app must keep
  // working with this unset.
  hcaptchaSiteKey: process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY,
};
