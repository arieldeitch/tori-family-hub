# Tori

**Tori is a Family Operations Hub** — Hebrew-first (RTL), mobile-first. The product promise: *the house knows who does what.* The Today screen is the center of the product.

> ⚠️ **No real backend yet.** All data lives in in-memory mock repositories and is lost on refresh. There is **no Supabase, no authentication, no RLS, and no real persistence**. Roles and PIN are UX guards only — not security.

## Status

- Prototype built in Lovable; GitHub connected; Claude Code active.
- **WP0 (foundation fixes) complete**: `typecheck` via `tsc`, `.gitattributes` LF policy, rotation-engine timezone fix, PWA precache fix. **158/158 tests pass**; lint 0 errors / 6 known shadcn warnings; build and CI green.
- **WP1 (this change)**: canonical Knowledge Pack added under `docs/` (documentation only).
- Next: WP2 — Supabase Local Workflow (see [`docs/todo.md`](./docs/todo.md)).

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

## Environment

Copy `.env.example` to `.env.local`. Only public `VITE_*` values live there. No secrets are committed.

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
