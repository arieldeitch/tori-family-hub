# Tori

**Tori is a Family Operations Hub** — Hebrew-first (RTL), mobile-first. The product promise: *the house knows who does what.* The Today screen is the center of the product.

> ⚠️ **No real backend yet.** All business data lives in in-memory mock repositories and is lost on refresh. There is **no business schema, no authentication, no RLS, and no real persistence**. A **local-only** Supabase dev workflow exists (WP2) but is an infrastructure scaffold — it is **not connected to any module**. Roles and PIN are UX guards only — not security.

## Status

- Prototype built in Lovable; GitHub connected; Claude Code active.
- **WP0 (foundation fixes)** and **WP1 (Knowledge Pack)** complete and merged to `main`.
- **WP2 (Supabase Local Workflow, this change)**: locked Supabase CLI dev dependency + `@supabase/supabase-js`, `supabase/` (config + empty foundation migration + business-empty seed), a typed infrastructure-only client, `db:*` scripts, and a CI `database` job. Local-only — no remote project, no schema, no Auth/RLS. **162/162 tests pass**; lint 0 errors / 6 known shadcn warnings; build and CI green.
- Next: WP3 — Identity & Household Schema (see [`docs/todo.md`](./docs/todo.md)).

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
| `bun run format` | Prettier |
| `bun run supabase:start` / `:stop` / `:status` | Local Supabase stack (Docker) |
| `bun run db:reset` | Reset local DB → run migrations + `seed.sql` |
| `bun run db:types` | Regenerate `src/infrastructure/supabase/database.types.ts` |
| `bun run db:smoke` | Public-key-only local REST health check |
| `bun run db:verify` | Reset → check types are current → smoke |

## Environment

Copy `.env.example` to `.env.local`. Only public `VITE_*` values live there. No secrets are committed.

## Local Supabase (development)

WP2 adds a **local-only** Supabase workflow. It is infrastructure scaffold — no business schema, no Auth, no RLS, and the client is not wired to any module (all modules still use mock repositories).

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
