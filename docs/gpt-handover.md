# GPT Handover

Continuity for GPT conversations about Tori. Read alongside [`claude-context.md`](./claude-context.md) and [`project-status.md`](./project-status.md).

## Current continuity state

- **Lovable is complete** — the prototype was built there.
- **GitHub is connected.**
- **Claude Code is active.**
- The **Repository Acceptance Audit is complete.**
- **WP0 is complete** (typecheck via `tsc`, `.gitattributes` LF, rotation timezone fix, 158/158 tests, green gates).
- **PR #1 is still open** (not yet merged).
- **WP1 is being delivered as a stacked branch** (`wp1-knowledge-pack-sync`, PR base temporarily `wp0-foundation-fixes`).
- **Supabase has not been set up yet.**
- **The next action after WP1 is WP2** (Supabase Local Workflow).

## Ground rules for any GPT-authored task

- The PRD ([`01-product-requirements.md`](./01-product-requirements.md)) is the single business source of truth.
- Do not start a business module before Identity, Household, and RLS are stable.
- Every schema change requires a migration; every RLS change requires positive and negative tests.
- No service role in the browser; `localStorage` is not a source of truth.
- Update the state docs at the end of every task.

See [`todo.md`](./todo.md) for the WP2 → WP5 order.
