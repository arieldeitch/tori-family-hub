# Project Status

**Verified facts only.** When a canonical requirement differs from the code, the gap is recorded here and in [`todo.md`](./todo.md) — the requirement is not rewritten and the code is not changed outside a dedicated task. Business truth lives in [`01-product-requirements.md`](./01-product-requirements.md).

_Last updated: post-WP2 consistency pass, after WP2 was merged to `main`. On top of WP0 + WP1._

## Current snapshot (resume here)

Point-in-time state so work can resume without relying on chat history.

- **`main` contains WP0 + WP1 + WP2.** PR #3 (`wp2-supabase-local-workflow` → `main`) was **merged** as merge commit `9e691c9`, with both checks (`verify`, `database`) green. WP2 is closed.
- **Done & merged to `main`:** WP0 (foundation fixes), WP1 (knowledge pack), WP2 (Supabase local workflow).
- **Next step: WP3 — Identity & Household Schema** — no longer blocked. Scope in [`todo.md`](./todo.md).
- **Quality gates (local):** typecheck 0 · lint 0 errors / 6 shadcn warnings · **test 162/162 across 19 files** · build ✓ · `routes:check` ✓.
- **WP2 facts:** Supabase CLI `2.109.1` (locked dev dep), `@supabase/supabase-js` `2.110.8` (runtime), package manager **Bun 1.3.14**. Local `project_id = tori-family-hub`, app dev URL `http://localhost:8080`, Supabase local ports remapped to the **553xx** range (to avoid clashing with another local stack). Foundation migration: `supabase/migrations/20260724153731_wp2_foundation.sql` (empty). `supabase/seed.sql` has no business data. Generated types: `src/infrastructure/supabase/database.types.ts`. Client is scaffold only. Public env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. No service role in frontend, no remote link, no `db push`. CI has a separate `database` job; `db:verify` = reset + type freshness + smoke.
- **Local stack:** stopped at session closeout. To resume: start Docker, then `bun run supabase:start` (ports `553xx`), copy URL + publishable key from `bun run supabase:status` into `.env.local`.

## Where the project is

- Prototype was built in Lovable.
- GitHub is connected.
- Claude Code is active.
- The Repository Acceptance Audit is complete.
- **WP0 (Foundation Fixes), WP1 (Knowledge Pack) and WP2 (Supabase Local Workflow) are complete and merged to `main`** (PR #1, PR #2 and PR #3).
- A local-first Supabase dev environment now exists: `supabase/` (config, one empty foundation migration, business-empty seed) plus an infrastructure-only typed client. It is **not connected to any business module** — all modules still use the in-memory mock repositories.

## Verified state after WP0

- `typecheck` uses `tsc --noEmit`.
- `.gitattributes` enforces LF line endings.
- The rotation-engine timezone bug is fixed.
- Regression tests were added for several timezones.
- **158 of 158 tests pass.**
- `lint` passes with 0 errors and 6 known shadcn warnings.
- `build` passes.
- The PWA precache includes app-shell assets.
- CI is green.

## Verified state after WP2

- Supabase CLI is a **locked dev dependency** (`supabase`), `@supabase/supabase-js` a runtime dependency. Run via `bunx supabase`.
- `supabase/` is in Git: `config.toml` (ports remapped to the 553xx range to avoid clashing with other local stacks; `auth.site_url = http://localhost:8080`), one empty foundation migration, and a business-empty `seed.sql`.
- The local stack starts, `bun run db:reset` applies migrations + seed cleanly, `bun run db:types` regenerates `src/infrastructure/supabase/database.types.ts`, and `bun run db:smoke` passes a public-key-only REST health check.
- A typed infrastructure client (`src/infrastructure/supabase/`) exists with lazy, Zod-validated public env — **infrastructure scaffold only, not wired to any business module**.
- CI has a separate `database` job validating migrations, seed, type freshness, and the smoke test. No secrets, no remote project.
- **162 of 162 tests pass** across 19 test files (158 + 4 new public-env validation tests).
- `typecheck`, `lint` (0 errors, 6 known warnings), and `build` remain green.

## Verified state after the post-WP2 consistency pass

- **`src/routeTree.gen.ts` is committed generated runtime source and is now in sync with the generator.** Previously, `vite build` regenerated the file with a TanStack Start `Register` module augmentation that was missing from the committed version, so every build left an unexpected tracked diff. The regenerated file is committed, and generation is a verified fixed point (two consecutive builds produce an identical file).
- **CI now fails if the committed route tree is stale.** The `verify` job runs `bun run routes:check` immediately after `build`; the check asserts the build left `src/routeTree.gen.ts` untouched. See [`decisions.md`](./decisions.md) ADR-022.
- No dependency was added — the project's own build is the generator.
- Documentation counts were re-verified against the repository (tests, test files, route files, CI jobs).

## Not yet present

- Supabase **business schema** (no households/profiles/memberships/tasks/etc. — only an empty foundation migration).
- Real Auth (the scaffold client has Auth intentionally inert).
- RLS / policies.
- Persistence after refresh (modules still use mock repositories).
- A remote Supabase project (local-only).
- Full production deployment.
- Full E2E.
- Business backend.

Roles and PIN are **UX guards only** and are not security.

## Additional verified facts

- There are **41 route modules** (`.tsx`) under `src/routes/` — 42 tracked files in total, since `src/routes/README.md` is documentation, not a route. Not all 41 are standalone navigation screens: `__root.tsx` is the root layout, and several are layout wrappers paired with an `.index.tsx` child (e.g. `tasks.tsx` + `tasks.index.tsx`).
- `src/routeTree.gen.ts` is **generated** from `src/routes/` by TanStack Start during `vite build`. It is committed and CI-verified — never edit it by hand (ADR-022).
- `src/app/` is empty (`.gitkeep` only). `src/infrastructure/` now contains the Supabase scaffold under `src/infrastructure/supabase/` (WP2); the `.gitkeep` remains.
- The modular hooks currently live mostly under `src/lib/` (e.g. `useTasks`, `useToday`), not `src/hooks/` (which holds only `use-mobile.tsx`).
- A temporary alias exists in the people directory for transport IDs (`peopleDirectory` `ALIAS_TO_CANONICAL`, `m1..m4`).
- The PWA is app-shell-only.

## Gaps between requirements and implementation

These are documented, not fixed, in WP1 (no code changes). Each is tracked in [`todo.md`](./todo.md).

| Requirement (PRD) | Current implementation | Gap type |
| --- | --- | --- |
| Supabase backend; PostgreSQL is the source of truth | Local Supabase workflow + scaffold client exist (WP2), but no business schema and no connection to modules; modules still use in-memory mocks | In progress (WP2 scaffold; schema/connection in WP3+) |
| Auth + child limited sessions | No auth; role/child selection is UX-only | Not yet implemented |
| RLS on every family table | No database, no RLS | Not yet implemented |
| Permissions enforced on server | Client-side guards only; bypassable via devtools | Technical debt / mock only |
| Persistent tasks, transport, follow-ups, shopping, etc. | Mock repos, lost on refresh | Mock only |
| Sensitive actions via RPC/server | Performed in-memory in the client | Not yet implemented |
| Notifications via worker (intent, dedupe, escalation) | Notification screen is UI-only; no delivery | Mock only |
| Full offline sync with `client_operation_id` | App-shell-only PWA; no offline data or sync queue | Not yet implemented |
| Architecture `src/app/`, `src/infrastructure/` populated; hooks under `src/hooks/` | Both dirs empty; hooks under `src/lib/` | Technical debt (documented; no refactor in WP1) |
| `peopleDirectory` canonical IDs | Temporary transport-ID alias table still present | Technical debt |
| PWA `sw.js` in the deployed output dir | Generated to `dist/`, not `.output/public` in local/CI builds | Technical debt (deferred; see [`LOVABLE_KNOWN_LIMITATIONS.md`](./LOVABLE_KNOWN_LIMITATIONS.md)) |
