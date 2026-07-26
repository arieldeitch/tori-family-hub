# Supabase — local workflow (WP2), Identity & Household schema (WP3), RLS (WP4)

Local-first Supabase for Tori. **Local development only — there is no remote project and no Auth.** The app still runs entirely on in-memory mock repositories; the Supabase client is infrastructure scaffold only (see `src/infrastructure/supabase/`).

WP3 added the Identity & Household schema (`households`, `member_profiles`, `household_members`, `household_invitations`). **WP4 enforced RLS on it**: three `SECURITY DEFINER` helpers in a non-exposed `private` schema, minimum **column-level** grants and six policies, shipped in one migration. `anon` holds nothing; `household_members` and `household_invitations` are client-read-only; `date_of_birth`, `token_hash` and `auth_user_id` are ungranted. See `../docs/06-security-and-permissions.md` for the policy matrix and `../docs/decisions.md` (ADR-027…ADR-032).

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
| `bun run db:test:structure` | pgTAP in `tests/database/` — structure, policy catalog, GRANT matrix, helper properties. No fixtures. |
| `bun run db:test:rls` | pgTAP in `tests/rls/` — behavioural RLS. **Requires fixtures.** |
| `bun run db:test:auth-suite` | Fixtures → `db:test:rls` → publishable-key integration tests → cleanup. |
| `bun run db:verify` | Reset → types → smoke → structural pgTAP → Auth-backed suite → pilot bootstrap suite. |

### Hosted pilot (ADR-037)

| Script | What it does |
| --- | --- |
| `bun run pilot:bootstrap:hosted` | Converge the **approved hosted** project on the pilot household. |
| `bun run pilot:status:hosted` | Report hosted convergence (counts and shape only). |
| `bun run pilot:test:hosted-guard` | Guard tests — every rejection path, no credentials, no network. |

Hosted commands require `TORI_PILOT_MODE=hosted-preview` **and** a project reference in the source allowlist **and** a hosted URL that resolves to that same reference. A declared mode alone is never sufficient, and the local guard grants no hosted access. Migrations reach the hosted project with `supabase db push --linked` — **never** a remote reset.

### Family Pilot (WP5A) — local only

| Script | What it does |
| --- | --- |
| `bun run pilot:bootstrap` | Idempotently converge the local DB on the pilot household from `pilot-household.local.json`. |
| `bun run pilot:status` | Report the converged state (counts and roles only — never a name). |
| `bun run pilot:cleanup` | Remove only the configured pilot household and its single Auth identity. |
| `bun run pilot:test` | Guard, convergence, idempotency and cleanup tests against a **placeholder** household. |

All four fail closed unless `TORI_PILOT_MODE=local` **and** the Supabase target independently proves to be the local CLI stack. The password comes from `TORI_PILOT_PASSWORD` and is never written to the configuration file. Real household data lives only in the git-ignored `pilot-household.local.json` (ADR-034).

> The structural pgTAP suite asserts a **freshly reset** database. After `pilot:bootstrap`, run `pilot:cleanup` or `db:reset` before running `db:test:structure` on its own. `db:verify` resets first and is the supported entry point.

## Rules

- `supabase/migrations/` is the **only** way to change schema. No manual changes in Studio/Dashboard as a substitute for a migration (see `../docs/decisions.md`).
- Never commit secrets. Only the public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` belong in the app; put them in a git-ignored `.env.local` (copy from `../.env.example`).
- The service role key must never reach browser/client code.
- **Never write to `auth.users` with SQL** — reference it by foreign key only. Test users are created through the Auth admin API (WP4).
- Every `CREATE TABLE public.*` ships `ENABLE ROW LEVEL SECURITY` in the same migration. A table must never exist in a reachable state without policies.
- Authorization helpers belong in `private`, never `public` — `public` is exposed as the Data API. They take no user id (ADR-027).
- Never grant a client INSERT/UPDATE/DELETE on `household_members` or `household_invitations` (ADR-028).
- The service-role key is server-side only: never in a `VITE_*` variable, client code, build output or `.env.local` written by CI (ADR-030).

## Files

- `config.toml` — local stack configuration (tracked).
- `migrations/` — schema migrations (tracked): WP2 empty foundation, WP3 Identity & Household schema, WP4 RLS/grants/helpers.
- `seed.sql` — post-reset seed (tracked; **business-empty on purpose**). Fixtures live in the tests and are rolled back; the Household A/B dataset needs real Auth users and arrives with WP4.
- `tests/database/` — structural + policy-catalog pgTAP (tracked). Runs **before** any fixture exists, because it asserts the seed is business-empty.
- `tests/rls/` — behavioural RLS pgTAP (tracked). Requires Auth-backed fixtures. Every behavioural test asserts `current_user = 'authenticated'` first, because pgTAP connects as a `BYPASSRLS` owner.

Every pgTAP file is wrapped in `begin … rollback`, so tests are transactional, independent and leave no residue.
- `.gitignore` — ignores CLI temp/branch state and local env files.
