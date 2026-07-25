# Claude Code — Working Context

Operational instructions for Claude Code working on Tori.

## Mandatory reading order

1. [`00-knowledge-pack-readme.md`](./00-knowledge-pack-readme.md)
2. [`01-product-requirements.md`](./01-product-requirements.md) — **the business source of truth**
3. [`decisions.md`](./decisions.md)
4. [`02-ux-ui-guidelines.md`](./02-ux-ui-guidelines.md) → [`09-testing-strategy.md`](./09-testing-strategy.md)
5. [`project-status.md`](./project-status.md)
6. [`todo.md`](./todo.md)
7. [`CLAUDE_HANDOVER.md`](./CLAUDE_HANDOVER.md) and the `LOVABLE_*` docs — as-built implementation, not the PRD.

## Repo state after WP2

- WP0 + WP1 are merged to `main`; WP2 (Supabase Local Workflow) is on `wp2-supabase-local-workflow`.
- `typecheck` uses `tsc --noEmit`; `.gitattributes` enforces LF.
- Rotation-engine timezone bug fixed, with regression tests.
- **162 of 162 tests pass** (158 + 4 public-env validation tests).
- Quality gates are green: typecheck, lint (0 errors, 6 known shadcn warnings), test, build, CI.
- PWA is app-shell-only; precache includes app-shell assets.
- **Supabase is local-only scaffold:** locked CLI dev dep, `supabase/` (config + empty foundation migration + business-empty seed), a typed infrastructure client (`src/infrastructure/supabase/`, Auth inert), `db:*` scripts, and a CI `database` job. **No business schema, no Auth, no RLS, no remote project, and the client is NOT wired to any module.** Run the stack with `bun run supabase:start` (Docker required).

## Current stage

**WP2 implementation is complete; PR #3 (`wp2-supabase-local-workflow` → `main`) is OPEN and not yet merged** (both checks green). The local Supabase stack is **stopped** at session closeout — restart with Docker + `bun run supabase:start` (ports `553xx`).

The next stage is **WP3 — Identity & Household Schema** (see [`todo.md`](./todo.md)), but **only after PR #3 merges**. WP3 is the first work package that introduces business schema — it must ship migrations plus the Identity/Household foundation (tables, enums, constraints, indexes, generated types, schema tests), not ad-hoc tables. Full RLS + negative tests are WP4.

## Hard rules

- The PRD is the source of truth. Do not rewrite a requirement to match the code; record the gap in [`project-status.md`](./project-status.md) and [`todo.md`](./todo.md).
- **Do not start a business module before Identity, Household, and RLS are stable.**
- Every schema change requires a migration.
- Every RLS change requires positive **and** negative tests.
- No service role in the browser; no `localStorage` as a source of truth; no success before persistence.
- At the end of every task, update [`project-status.md`](./project-status.md), [`todo.md`](./todo.md), [`claude-context.md`](./claude-context.md), and [`gpt-handover.md`](./gpt-handover.md).
- Respect the global Architecture Review Rule: produce an Approval Brief before any change touching Supabase auth, `auth.users`, RLS, schema, migrations, env vars, service_role keys, deployment, or production data.

## Next after WP2

WP3 — Identity & Household Schema (see [`todo.md`](./todo.md)). Do not start it in this task.
