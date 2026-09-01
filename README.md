# Little Trips

A shared little-adventures planner. Groups of people (a couple, friends, family) put
together trips and add candidate places to them; an on-demand AI call produces a
structured summary (vibe, price range, and three independent 1-5 ratings: how well a
place suits a date, how well it suits a group, and overall quality). Auth is
magic-link only for group creators;
joining a group via invite link works with no signup at all.

## Setup

1. **Install dependencies**: `npm install`
2. **Create a Supabase project** at [supabase.com](https://supabase.com).
3. **Copy the env file** and fill it in: `cp .env.local.example .env.local`
4. **Apply the database schema** — see [Database](#database) below.
5. **Enable two Supabase Dashboard-only settings** (not covered by any SQL
   migration):
   - Authentication → Sign In / Providers → **Anonymous** — required for the
     "join a group with no signup" flow.
   - Authentication → Auth settings → **Bot and Abuse Protection** — currently
     left **off** in this project (see [Environment variables](#environment-variables)
     below); the app doesn't send a captcha token right now, so leaving this on
     will break anonymous joins.
6. `npm run dev` and open http://localhost:3000.

## Environment variables

All required variables are documented with comments in `.env.local.example`.
Summary:

| Variable | Where it's used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Public, RLS-scoped key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Secret — bypasses RLS entirely |
| `ANTHROPIC_API_KEY` | server only | From console.anthropic.com |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | client only | Needs **three** Google Cloud APIs enabled: Maps JavaScript API, Places API (classic), and Places API (New) — see the comment in `.env.local.example`. Must have HTTP referrer restrictions set before this ships anywhere public. |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | client only | Currently unused — hCaptcha is paused, see `CLAUDE.md` |

All of these are read through `lib/env/client.ts` (`clientEnv`, safe to import
anywhere) and `lib/env/server.ts` (`serverEnv`, guarded by the `server-only`
package so an accidental client import fails the build) rather than read ad hoc
via `process.env` around the codebase. Both throw a clear error naming the
missing variable at import time if something required isn't set, instead of
failing confusingly deep inside a request.

## Database

Schema lives in a single file, `supabase/migrations/0001_consolidated_schema.sql`
— every table, RLS policy, helper function, the `avatars` Storage bucket, and
the `api_rate_limits` cleanup cron job, as final state rather than a replay of
incremental `alter table` steps. Apply it by pasting into the Supabase SQL
editor, or `supabase db push` if the CLI is linked to your project.

There's no test framework installed. To validate a change against real Supabase
behavior (RLS policies, triggers), write a throwaway Node script and run it with
`node --env-file=.env.local <script>.mjs` from the project root — see
`CLAUDE.md`'s "Testing RLS changes" section for the exact pattern used during
development (disposable test users, minted sessions, direct PostgREST calls).
Delete the script when done; nothing like this is checked in.

## Commands

```
npm run dev         # start dev server
npm run build        # production build (also runs typecheck + lint via next build)
npm run typecheck    # tsc --noEmit
npm run lint          # next lint
```

## Architecture overview

- **`app/`** — Next.js App Router routes (Server Components, Route Handlers).
- **`components/`** — split by domain: `ui/` (generic primitives and layout
  chrome — buttons, cards, headers), `places/` (place cards, photos, search,
  AI summary panel), `groups/` (membership, invites, claiming, guest join),
  `auth/` (login form).
- **`lib/actions/`** — Server Actions (`"use server"`), the primary mutation
  path, wired directly as form `action` props rather than client-side fetch.
- **`lib/supabase/`** — the three Supabase client variants (`client.ts` for
  Client Components, `server.ts` for Server Components/Actions, `admin.ts` for
  the RLS-bypassing service-role client) — not interchangeable, see `CLAUDE.md`.
- **`lib/ai/`**, **`lib/google/`** — third-party integration code (Claude,
  Google Maps/Places).
- **`lib/env/`** — centralized, validated environment variable access.
- **`types/`** — shared domain types (`Place`, `PlaceCategory`, `AiSummary`,
  `MemberProfile`, `Group`, `Itinerary`), each defined once and imported
  everywhere rather than redefined per file.

For the *why* behind non-obvious decisions — RLS design, a Postgres
RETURNING-before-triggers gotcha, the PKCE cross-browser magic-link
limitation, the anonymous-join/member-claiming design, Google Places API
quirks discovered via live testing, and more — see **`CLAUDE.md`**, which is
maintained as the deeper architectural reference and is kept current as the
project evolves.

## Naming conventions

- Components: `PascalCase.tsx`, one component per file, named after the
  component it exports.
- Non-component modules: `camelCase.ts`.
- Route segments (`app/`): `kebab-case` folders, Next.js's own convention for
  dynamic segments (`[groupId]`) and reserved files (`page.tsx`, `route.ts`).
