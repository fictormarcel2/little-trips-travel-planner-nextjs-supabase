import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/env/server";

// Server-only Claude client. ANTHROPIC_API_KEY is never read outside this
// module, and `server-only` fails the build if anything client-side ever
// tries to import it.
export const anthropic = new Anthropic({
  apiKey: serverEnv.anthropicApiKey,
});

export const CLAUDE_MODEL = "claude-haiku-4-5";
