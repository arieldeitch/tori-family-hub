# Supabase — local workflow (WP2)

Local-first Supabase scaffold for Tori. **Local development only — there is no remote project, no Auth, no business schema, and no RLS yet.** The app still runs entirely on in-memory mock repositories; the Supabase client is infrastructure scaffold only (see `src/infrastructure/supabase/`).

## Prerequisites

- Docker Desktop (or a compatible engine) running.
- Bun. The Supabase CLI is a locked dev dependency — run it via `bunx supabase …` (no global install needed).

> Ports: this stack is remapped to the **553xx** range in `config.toml` (API `55321`, DB `55322`, Studio `55323`, …) so it can coexist with other local Supabase stacks that use the default `543xx` ports. `auth.site_url` is `http://localhost:8080` to match the Vite dev server.

## Commands

| Script | What it does |
| --- | --- |
| `bun run supabase:start` | Start the local stack (Docker). |
| `bun run supabase:stop` | Stop the local stack. |
| `bun run supabase:status` | Show local service URLs and keys. |
| `bun run db:reset` | Reset the local DB → runs migrations then `seed.sql`. |
| `bun run db:types` | Regenerate `src/infrastructure/supabase/database.types.ts`. |
| `bun run db:smoke` | Hit the local REST health endpoint using the public URL + key only. |
| `bun run db:verify` | Reset → regenerate types → check they are up to date → smoke. |

## Rules

- `supabase/migrations/` is the **only** way to change schema. No manual changes in Studio/Dashboard as a substitute for a migration (see `../docs/decisions.md`).
- Never commit secrets. Only the public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` belong in the app; put them in a git-ignored `.env.local` (copy from `../.env.example`).
- The service role key must never reach browser/client code.

## Files

- `config.toml` — local stack configuration (tracked).
- `migrations/` — schema migrations (tracked; currently a single empty foundation migration).
- `seed.sql` — post-reset seed (tracked; business-empty until WP3).
- `.gitignore` — ignores CLI temp/branch state and local env files.
