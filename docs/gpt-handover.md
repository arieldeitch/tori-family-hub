# GPT Handover

Continuity for GPT conversations about Tori. Read alongside [`claude-context.md`](./claude-context.md) and [`project-status.md`](./project-status.md).

## Current continuity state

- **Lovable is complete** — the prototype was built there.
- **GitHub is connected.**
- **Claude Code is active.**
- The **Repository Acceptance Audit is complete.**
- **WP0 (Foundation Fixes) and WP1 (Knowledge Pack) are complete and merged to `main`.**
- **WP2 (Supabase Local Workflow) implementation is complete** on `wp2-supabase-local-workflow`. **PR #3 → base `main` is OPEN and not yet merged**; both checks (`verify`, `database`) are green.
- **Supabase is set up local-only**: locked CLI dev dependency (`2.109.1`) + `@supabase/supabase-js` (`2.110.8`), `supabase/` (config + empty foundation migration + business-empty seed), a typed infrastructure-only client, `db:*` scripts, and a CI `database` job. Local `project_id = tori-family-hub`, app URL `http://localhost:8080`, ports remapped to `553xx`. **No remote project, no business schema, no Auth, no RLS**, and the client is not wired to any module. **162/162 tests pass**; gates green.
- **The next action after WP2 is WP3** (Identity & Household Schema) — but **PR #3 must be merged first**.

## Resume checklist (after reboot)

1. `git checkout main && git pull --ff-only`, then confirm **PR #3** is merged (if not, merge it — do not start WP3 before it lands).
2. If continuing WP2 review: `git checkout wp2-supabase-local-workflow`.
3. To run Supabase locally: start Docker, `bun run supabase:start`, then copy the URL + publishable key from `bun run supabase:status` into `.env.local` (git-ignored).
4. Sanity gates: `bun install --frozen-lockfile` → `typecheck` → `lint` → `test` (162) → `build`.
5. Then begin **WP3** per [`todo.md`](./todo.md).

## Ground rules for any GPT-authored task

- The PRD ([`01-product-requirements.md`](./01-product-requirements.md)) is the single business source of truth.
- Do not start a business module before Identity, Household, and RLS are stable.
- Every schema change requires a migration; every RLS change requires positive and negative tests.
- No service role in the browser; `localStorage` is not a source of truth.
- Update the state docs at the end of every task.

See [`todo.md`](./todo.md) for the WP2 → WP5 order.
