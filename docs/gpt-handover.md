# GPT Handover

Continuity for GPT conversations about Tori. Read alongside [`claude-context.md`](./claude-context.md) and [`project-status.md`](./project-status.md).

## Current continuity state

- **Lovable is complete** — the prototype was built there.
- **GitHub is connected.**
- **Claude Code is active.**
- The **Repository Acceptance Audit is complete.**
- **WP0 (Foundation Fixes) and WP1 (Knowledge Pack) are complete and merged to `main`.**
- **WP2 (Supabase Local Workflow) is complete** on `wp2-supabase-local-workflow` (PR base `main`).
- **Supabase is set up local-only**: locked CLI dev dependency, `supabase/` (config + empty foundation migration + business-empty seed), a typed infrastructure-only client, `db:*` scripts, and a CI `database` job. **No remote project, no business schema, no Auth, no RLS**, and the client is not wired to any module. **162/162 tests pass**; gates green.
- **The next action after WP2 is WP3** (Identity & Household Schema).

## Ground rules for any GPT-authored task

- The PRD ([`01-product-requirements.md`](./01-product-requirements.md)) is the single business source of truth.
- Do not start a business module before Identity, Household, and RLS are stable.
- Every schema change requires a migration; every RLS change requires positive and negative tests.
- No service role in the browser; `localStorage` is not a source of truth.
- Update the state docs at the end of every task.

See [`todo.md`](./todo.md) for the WP2 → WP5 order.
