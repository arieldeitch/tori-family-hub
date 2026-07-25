# Supabase — local workflow (WP2) + Identity & Household schema (WP3)

Local-first Supabase for Tori. **Local development only — there is no remote project and no Auth.** The app still runs entirely on in-memory mock repositories; the Supabase client is infrastructure scaffold only (see `src/infrastructure/supabase/`).

WP3 added the Identity & Household schema (`households`, `member_profiles`, `household_members`, `household_invitations`). Those tables are **deliberately locked down**: RLS is enabled, there are **zero policies**, and all privileges are revoked from `PUBLIC`, `anon` and `authenticated`, so nothing is reachable through the Data API. WP4 adds the minimum grants together with the complete policy set — see `../docs/decisions.md` (ADR-023).

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
| `bun run db:test` | Run the pgTAP schema tests in `tests/database/` via `supabase test db`. |
| `bun run db:verify` | Reset → check types are up to date → smoke → pgTAP tests. |

## Rules

- `supabase/migrations/` is the **only** way to change schema. No manual changes in Studio/Dashboard as a substitute for a migration (see `../docs/decisions.md`).
- Never commit secrets. Only the public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` belong in the app; put them in a git-ignored `.env.local` (copy from `../.env.example`).
- The service role key must never reach browser/client code.
- **Never write to `auth.users` with SQL** — reference it by foreign key only. Test users are created through the Auth admin API (WP4).
- Every `CREATE TABLE public.*` ships `ENABLE ROW LEVEL SECURITY` in the same migration. A table must never exist in a reachable state without policies.

## Files

- `config.toml` — local stack configuration (tracked).
- `migrations/` — schema migrations (tracked): the WP2 empty foundation migration and the WP3 Identity & Household migration.
- `seed.sql` — post-reset seed (tracked; **business-empty on purpose**). Fixtures live in the tests and are rolled back; the Household A/B dataset needs real Auth users and arrives with WP4.
- `tests/database/` — pgTAP tests (tracked). Every file is wrapped in `begin … rollback`, so tests are transactional, independent and leave no residue.
- `.gitignore` — ignores CLI temp/branch state and local env files.
