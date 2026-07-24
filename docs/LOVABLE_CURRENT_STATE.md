# Tori — Current State

## Stack (existing, kept)
- React 19 + TypeScript (strict)
- TanStack Start / TanStack Router (Lovable default — replaces the "React Router" mention in the brief)
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- shadcn/ui component primitives under `src/components/ui`
- TanStack Query
- Vitest + React Testing Library + jsdom (added)

## App shell
- `lang="he"` and `dir="rtl"` set on the root `<html>` in `src/routes/__root.tsx`.
- Root-level Error Boundary via `errorComponent` on the root route.
- Temporary route at `/` renders a Hebrew RTL welcome confirming the app runs.

## Modular folder layout (`src/`)
- `app/` — app-level composition (providers, shell helpers)
- `components/` — shared UI components (incl. shadcn `ui/`)
- `features/` — feature modules
- `domain/` — pure domain models & rules
- `application/` — use-cases
- `data/` — repositories
- `infrastructure/` — logging, config adapters
- `lib/` — small framework-agnostic utilities (incl. `i18n.ts`)
- `locales/` — translation dictionaries (`he.ts`)
- `test/` — Vitest setup + smoke tests
- `routes/` — TanStack file-based routes

Import alias `@/*` → `src/*`.

## i18n
Minimal `t()` helper reading from `src/locales/he.ts`. Only Hebrew for now; structure allows adding locales later.

## Scripts
`dev`, `build`, `build:dev`, `preview`, `lint`, `typecheck`, `test`, `test:watch`, `format`.

## Explicitly NOT done (per prompt scope)
- No Supabase / backend
- No authentication
- No schema or migrations
- No business modules (today/tasks/calendar/shopping/transport)
- No product screens
- No PWA
