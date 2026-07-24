# Project Status

**Verified facts only.** When a canonical requirement differs from the code, the gap is recorded here and in [`todo.md`](./todo.md) — the requirement is not rewritten and the code is not changed outside a dedicated task. Business truth lives in [`01-product-requirements.md`](./01-product-requirements.md).

_Last updated: after WP1 (Knowledge Pack Sync), on top of WP0._

## Where the project is

- Prototype was built in Lovable.
- GitHub is connected.
- Claude Code is active.
- The Repository Acceptance Audit is complete.
- **WP0 is complete** on branch `wp0-foundation-fixes`.
- **PR #1 is open and not yet merged.**
- **WP1** (this Knowledge Pack) is delivered as a **stacked branch** (`wp1-knowledge-pack-sync`) whose PR temporarily targets `wp0-foundation-fixes`; the base becomes `main` after PR #1 merges.

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

## Not yet present

- Supabase.
- Real Auth.
- Migrations.
- RLS.
- Persistence after refresh.
- Full production deployment.
- Full E2E.
- Business backend.

Roles and PIN are **UX guards only** and are not security.

## Additional verified facts

- There are **41 route files** under `src/routes/`, but not all are standalone navigation screens (`__root.tsx` is the root layout; several are pathless layout wrappers).
- `src/app/` and `src/infrastructure/` may be empty (they currently contain only `.gitkeep`).
- The modular hooks currently live mostly under `src/lib/` (e.g. `useTasks`, `useToday`), not `src/hooks/` (which holds only `use-mobile.tsx`).
- A temporary alias exists in the people directory for transport IDs (`peopleDirectory` `ALIAS_TO_CANONICAL`, `m1..m4`).
- The PWA is app-shell-only.

## Gaps between requirements and implementation

These are documented, not fixed, in WP1 (no code changes). Each is tracked in [`todo.md`](./todo.md).

| Requirement (PRD) | Current implementation | Gap type |
| --- | --- | --- |
| Supabase backend; PostgreSQL is the source of truth | In-memory mock repositories; state resets on refresh | Not yet implemented |
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
