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

## Design System (prompt 2)
- Route: `/design-system` (internal, `noindex`, not linked from main nav).
- Font: **Heebo** loaded via `<link>` in `src/routes/__root.tsx`; `--font-sans` token points to it.
- Semantic tokens in `src/styles.css` (light + dark, oklch): `background`, `surface`, `foreground`, `muted-foreground`, `border`, `primary`, `ring`, `success`, `warning`, `error`, `info`, `overdue`, `blocked` (+ shadcn baseline).
- Family palette (limited to 7 calm colors) exposed via `domain/household.ts::pickColor`. Identification is redundant with initials + name via `PersonAvatar` / `FamilyMemberChip`.
- Global rules in `styles.css`: `:focus-visible` ring, `prefers-reduced-motion` reset, `font-family` on `html,body`.
- New wrappers under `src/components/design-system/` (composed on top of shadcn — nothing replaced):
  `IconButton`, `FormField`, `StatusBadge`, `PersonAvatar`, `FamilyMemberChip`,
  `ConfirmationDialog`, `EmptyState`, `ErrorState`, `PermissionDeniedState`,
  `OfflineState`, `SyncStatusIndicator`, `SectionHeader`, `MobilePageHeader`.
- Sheet uses shadcn Radix primitive; opens from `side="right"` for RTL affordance.
- Accessibility invariants enforced in the wrappers: `IconButton` requires `aria-label`, min tap target `44×44`; `FormField` wires `htmlFor`/`aria-describedby`/`aria-invalid`; `StatusBadge` always carries a glyph so meaning is not color-only.

## App Shell (prompt 3)
- Shell components in `src/components/shell/`: `AppShell` (layout wrapper), `AppHeader`, `BottomNav` (mobile), `DesktopSidebar` (>=lg), `QuickAddSheet`, `PlaceholderPage`, `navConfig.ts`.
- Primary nav: `/today`, `/calendar`, `/tasks`, `/shopping`, `/more`. Secondary (sidebar + `/more`): `/transport`, `/follow-ups`, `/household`, `/notifications`, `/settings`, `/child`.
- `/` redirects to `/today`. `/child`, `/onboarding`, `/design-system` render standalone (no shell).
- Quick Add opens a bottom Sheet with 7 options; unimplemented ones show a toast (no fake success). "נושא למעקב" routes to the existing `/follow-ups` module.
- Placeholders show title + description + `EmptyState`; no mock data.
- Safe area: `env(safe-area-inset-top)` on header, `env(safe-area-inset-bottom)` on bottom nav and main padding.
