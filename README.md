# Tori

**Tori is a Family Operations Hub** — Hebrew-first (RTL), mobile-first. The product promise: *the house knows who does what.* The Today screen is the center of the product.

> ⚠️ **No business backend wired in yet.** All business data lives in in-memory mock repositories and is lost on refresh. The Identity & Household schema exists (WP3) with **RLS enforced and positive and negative tests** (WP4), and the **Family Pilot slice does real Supabase Auth sign-in and real household reads** (WP5A) — but **no business module reads or writes the database**. Roles, child mode and PIN in the UI are UX guards only — not security.

## Status

- Prototype built in Lovable; GitHub connected; Claude Code active.
- **WP0 (foundation fixes)** and **WP1 (Knowledge Pack)** complete and merged to `main`.
- **WP2 (Supabase Local Workflow)** — complete and **merged to `main`** (PR #3): locked Supabase CLI dev dependency + `@supabase/supabase-js`, `supabase/` (config + empty foundation migration + business-empty seed), a typed infrastructure client, `db:*` scripts, and a CI `database` job. It shipped local-only; WP3, WP4, WP5A and ADR-037 have since added schema, RLS, Auth and a hosted project.
- **Current gate results (re-verified 2026-07-30):** **210/210 tests pass across 24 test files**; typecheck clean; lint **0 errors / 7 warnings**; `build`, `routes:check`, `check:client-secrets`, `check:pilot-privacy` and `pilot:test:hosted-guard` all green. The database suites were not re-run on that date — see [`docs/project-status.md`](./docs/project-status.md).
- **Post-WP2 consistency pass** — the committed generated route tree (`src/routeTree.gen.ts`) is in sync with the generator and CI verifies its freshness (see [`docs/decisions.md`](./docs/decisions.md), ADR-022).
- **WP3 (Identity & Household Schema)** — complete and merged: enums `household_role` + `household_membership_status` and tables `households`, `member_profiles`, `household_members`, `household_invitations`, with household consistency enforced by composite foreign keys. **RLS is enabled with zero policies and no client grants** (ADR-023) — the tables are unreachable until WP4. **102 pgTAP tests** run in CI.
- **WP4 (Identity & Household RLS)** — complete and merged: three `SECURITY DEFINER` authorization helpers in a non-exposed `private` schema, minimum **column-level** grants, six RLS policies, and negative-access tests. `anon` holds nothing; membership and invitation mutations are RPC-only; `date_of_birth`, `token_hash` and `auth_user_id` are unreachable by clients. **181 structural + 117 behavioural pgTAP tests and 34 Auth-backed integration assertions** run in CI.
- **Current milestone: Family Pilot — Weekly Child Chores.** A narrow vertical slice letting a real household see and complete weekly chores, Sunday→Saturday, with a deterministic child rotation. In-app user management is deferred **for the pilot only**; the long-term Auth, PIN, invitation and permission requirements stand. Scope in [`docs/PILOT_WEEKLY_CHORES.md`](./docs/PILOT_WEEKLY_CHORES.md), decisions in ADR-033…ADR-036.
- **Published Lovable builds configure themselves from a tracked root `.env`** containing only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` — both public by design, and allowlist-enforced so nothing else can be added (ADR-038). Local development still overrides them with the ignored `.env.local`.
- **The pilot runs hosted** (ADR-037): **Lovable hosts the frontend only** and **Supabase is the exclusive backend** (PostgreSQL, Auth, RLS, migrations). There is no Lovable Cloud database. Normal family use requires neither Docker nor localhost; Docker and the local Supabase stack remain development and CI infrastructure. The hosted project is explicitly non-production.
- **WP5A (pilot access and local bootstrap) is complete**: an environment-guarded idempotent local bootstrap, one authenticated adult identity, four member profiles, a local sign-in at `/pilot/signin` and a profile selector. It required **no migration and no RLS change**. Next: WP5B — task and recurrence foundation.
- WP4.5 (Identity RPCs) and WP4.6 (Auth account deletion — still blocking before production onboarding) remain required but are no longer next. See [`docs/todo.md`](./docs/todo.md).

> Pilot household data is **local and uncommitted**: real names live only in a git-ignored `pilot-household.local.json` (template: `pilot-household.example.json`). Never place them in a migration, the shared seed, a committed fixture or a source constant — ADR-034.

## Stack

From `package.json`:

- React 19 + TypeScript 5.8 (strict) + Vite 8
- TanStack Start / TanStack Router / TanStack Query (Lovable default — do not swap for react-router-dom)
- Tailwind CSS v4 (`@tailwindcss/vite`, tokens in `src/styles.css`, OKLCH)
- shadcn/ui primitives + a custom design system in `src/components/design-system/`
- Vitest + React Testing Library + jsdom
- `vite-plugin-pwa` (app-shell-only)
- Build target: Cloudflare Workers via Nitro (`nodejs_compat`)

## Package manager & commands

Package manager: **Bun** (`bun.lock` committed; CI uses `oven-sh/setup-bun@v2`). Node 20+ compatible.

| Command | Purpose |
| ------ | ------- |
| `bun install --frozen-lockfile` | Reproducible install |
| `bun run dev` | Vite dev server |
| `bun run build` | Production build (Nitro / Cloudflare Worker) |
| `bun run build:dev` | Development-mode build |
| `bun run preview` | Preview built output |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | ESLint |
| `bun run test` | Vitest (single run) |
| `bun run test:watch` | Vitest watch |
| `bun run routes:check` | Assert the committed `src/routeTree.gen.ts` is current — run **after** `bun run build`, which regenerates it (ADR-022) |
| `bun run format` | Prettier |
| `bun run supabase:start` / `:stop` / `:status` | Local Supabase stack (Docker) |
| `bun run db:reset` | Reset local DB → run migrations + `seed.sql` |
| `bun run db:types` | Regenerate `src/infrastructure/supabase/database.types.ts` |
| `bun run db:smoke` | Public-key-only local REST health check |
| `bun run db:test:structure` | Structural + policy-catalog pgTAP (no fixtures needed) |
| `bun run db:test:auth-suite` | Auth fixtures → behavioural RLS pgTAP → integration tests → cleanup |
| `bun run check:client-secrets` | Fail if service-role material reaches `src/` or the build output |
| `bun run db:verify` | Reset → types current → smoke → structural pgTAP → full Auth-backed suite |

## Environment

Copy `.env.example` to `.env.local`. Only public `VITE_*` values live there. No secrets are committed.

## Local Supabase (development)

WP2 added the local Supabase workflow, WP3 the Identity & Household schema, and WP4 the RLS policies and minimum grants. The local stack is now the **development and CI** environment; the hosted non-production project is the pilot runtime (ADR-037). The pilot slice performs real Auth and real household reads; **no business module is wired to the database** — those still use mock repositories. Access is column-level only: `anon` holds nothing, `authenticated` reads its own household, and every membership or invitation mutation remains RPC-only.

1. Start Docker Desktop (or a compatible engine).
2. `bun run supabase:start` — starts the local stack (Supabase CLI is a locked dev dependency; run via `bunx supabase`).
3. `bun run supabase:status` — copy the local API URL + publishable key into `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). **Never** put the service role key in the repo or in client code.
4. `bun run db:reset` applies migrations + seed; `bun run db:types` regenerates the DB types; `bun run db:smoke` checks connectivity.

See [`supabase/README.md`](./supabase/README.md) and [`docs/decisions.md`](./docs/decisions.md) (ADR-021). Schema changes happen only through migrations in `supabase/migrations/`.

## Documentation

**Canonical Knowledge Pack** (business & domain source of truth) — start at [`docs/00-knowledge-pack-readme.md`](./docs/00-knowledge-pack-readme.md):

- [`docs/01-product-requirements.md`](./docs/01-product-requirements.md) — **the single business source of truth (PRD)**
- [`docs/02-ux-ui-guidelines.md`](./docs/02-ux-ui-guidelines.md) · [`docs/03-architecture.md`](./docs/03-architecture.md) · [`docs/04-development-principles.md`](./docs/04-development-principles.md)
- [`docs/05-data-model.md`](./docs/05-data-model.md) · [`docs/06-security-and-permissions.md`](./docs/06-security-and-permissions.md) · [`docs/07-notifications-and-reminders.md`](./docs/07-notifications-and-reminders.md)
- [`docs/08-rotation-engine.md`](./docs/08-rotation-engine.md) · [`docs/09-testing-strategy.md`](./docs/09-testing-strategy.md)
- [`docs/decisions.md`](./docs/decisions.md) · [`docs/project-status.md`](./docs/project-status.md) · [`docs/todo.md`](./docs/todo.md)
- [`docs/claude-context.md`](./docs/claude-context.md) · [`docs/gpt-handover.md`](./docs/gpt-handover.md)

**As-built implementation & handover** (describes the prototype, not the PRD):

- [`docs/CLAUDE_HANDOVER.md`](./docs/CLAUDE_HANDOVER.md) — implementation handover, read before touching code
- [`docs/LOVABLE_CURRENT_STATE.md`](./docs/LOVABLE_CURRENT_STATE.md) · [`docs/LOVABLE_ARCHITECTURE.md`](./docs/LOVABLE_ARCHITECTURE.md) · [`docs/LOVABLE_DECISIONS.md`](./docs/LOVABLE_DECISIONS.md)
- [`docs/LOVABLE_KNOWN_LIMITATIONS.md`](./docs/LOVABLE_KNOWN_LIMITATIONS.md) · [`docs/LOVABLE_NEXT_STEPS.md`](./docs/LOVABLE_NEXT_STEPS.md) · [`docs/LOVABLE_CHANGELOG.md`](./docs/LOVABLE_CHANGELOG.md) · [`docs/PWA.md`](./docs/PWA.md)

### Reading order

1. [`docs/00-knowledge-pack-readme.md`](./docs/00-knowledge-pack-readme.md)
2. [`docs/01-product-requirements.md`](./docs/01-product-requirements.md) (business source of truth)
3. [`docs/decisions.md`](./docs/decisions.md), then the domain docs `02`–`09`
4. [`docs/project-status.md`](./docs/project-status.md) and [`docs/todo.md`](./docs/todo.md)
5. [`docs/CLAUDE_HANDOVER.md`](./docs/CLAUDE_HANDOVER.md) and the `LOVABLE_*` docs for the as-built code

## License

Proprietary — internal project.
