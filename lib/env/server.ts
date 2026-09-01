import "server-only";

// Centralized, validated access to server-only secrets. The `server-only`
// import fails the build if any client code ever tries to import this
// module — same guard lib/supabase/admin.ts and lib/ai/anthropic.ts already
// relied on individually before this was centralized.
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Check .env.local against .env.local.example.`
    );
  }
  return value;
}

export const serverEnv = {
  supabaseServiceRoleKey: requireEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ),
  anthropicApiKey: requireEnv("ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY),
};
