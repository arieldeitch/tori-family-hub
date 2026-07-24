# Tori

Hebrew-first (RTL) family coordination app — mobile-first PWA prototype built with TanStack Start, React 19, TypeScript, Tailwind v4, and shadcn/ui.

**Status:** UX/prototype stage. All data is held in in-memory mock repositories and is lost on refresh. No backend, no authentication, no real persistence.

## Stack

- React 19 + TypeScript (strict) + Vite 8
- TanStack Start / TanStack Router (Lovable default — do not swap for react-router-dom)
- Tailwind CSS v4 (via `@tailwindcss/vite`, tokens in `src/styles.css`)
- shadcn/ui primitives + custom design system in `src/components/design-system/`
- TanStack Query
- Vitest + React Testing Library + jsdom
- `vite-plugin-pwa` (app-shell-only)

## Requirements

- Bun (project uses `bun.lock`; CI uses `oven-sh/setup-bun@v2`)
- Node 20+ compatible

## Scripts

| Script | Purpose |
| ------ | ------- |
| `bun run dev` | Vite dev server |
| `bun run build` | Production build (Nitro / Cloudflare Worker) |
| `bun run build:dev` | Development-mode build |
| `bun run preview` | Preview built output |
| `bun run typecheck` | `tsgo --noEmit` |
| `bun run lint` | ESLint |
| `bun run test` | Vitest (single run) |
| `bun run test:watch` | Vitest watch |
| `bun run format` | Prettier |

## Environment

Copy `.env.example` to `.env.local`. Only public `VITE_*` values live there. No secrets are committed.

## Documentation

Start with `docs/CLAUDE_HANDOVER.md`. See also:

- `docs/LOVABLE_CURRENT_STATE.md` — what exists today (facts only)
- `docs/LOVABLE_ARCHITECTURE.md` — layering, boundaries, patterns
- `docs/LOVABLE_DECISIONS.md` — key ADRs
- `docs/LOVABLE_KNOWN_LIMITATIONS.md`
- `docs/LOVABLE_NEXT_STEPS.md`
- `docs/LOVABLE_CHANGELOG.md`
- `docs/PWA.md`

## License

Proprietary — internal project.
