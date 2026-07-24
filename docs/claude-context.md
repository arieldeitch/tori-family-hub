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

## Repo state after WP0

- `typecheck` uses `tsc --noEmit`; `.gitattributes` enforces LF.
- Rotation-engine timezone bug fixed, with regression tests.
- **158 of 158 tests pass.**
- Quality gates are green: typecheck, lint (0 errors, 6 known shadcn warnings), test, build, CI.
- PWA is app-shell-only; precache includes app-shell assets.
- Supabase has not been set up yet. No Auth, RLS, migrations, or persistence.

## Current stage

**WP1 (Knowledge Pack Sync) is the current stage.** It adds documentation only — no code changes.

## Hard rules

- The PRD is the source of truth. Do not rewrite a requirement to match the code; record the gap in [`project-status.md`](./project-status.md) and [`todo.md`](./todo.md).
- **Do not start a business module before Identity, Household, and RLS are stable.**
- Every schema change requires a migration.
- Every RLS change requires positive **and** negative tests.
- No service role in the browser; no `localStorage` as a source of truth; no success before persistence.
- At the end of every task, update [`project-status.md`](./project-status.md), [`todo.md`](./todo.md), [`claude-context.md`](./claude-context.md), and [`gpt-handover.md`](./gpt-handover.md).
- Respect the global Architecture Review Rule: produce an Approval Brief before any change touching Supabase auth, `auth.users`, RLS, schema, migrations, env vars, service_role keys, deployment, or production data.

## Next after WP1

WP2 — Supabase Local Workflow (see [`todo.md`](./todo.md)).
