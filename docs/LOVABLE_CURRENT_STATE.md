# Tori — Current State (facts only)

Snapshot after the Git-readiness / handover pass. All statements are verified against the repository.

## Stack

- React 19.2 + TypeScript 5.8 (strict) + Vite 8
- TanStack Start 1.168 / TanStack Router 1.170 / TanStack Query
- Tailwind CSS 4.2 via `@tailwindcss/vite`, tokens in `src/styles.css` (OKLCH)
- shadcn/ui primitives (`src/components/ui/*`) + Tori DS wrappers (`src/components/design-system/*`)
- Vitest 4.1 + React Testing Library + jsdom
- `vite-plugin-pwa` (generateSW)
- Package manager: Bun (`bun.lock` committed)
- Build target: Cloudflare Workers (Nitro, `nodejs_compat`)

## App shell

- `<html lang="he" dir="rtl">` set in `src/routes/__root.tsx`
- Root error boundary via `errorComponent` on root route
- Heebo font loaded via `<link>` in root route (Tailwind v4 cannot `@import` remote URLs)
- `AppShell` + `AppHeader` + `BottomNav` (mobile) + `DesktopSidebar` (≥lg) + `QuickAddSheet`

## Modules implemented (mock-only)

Today, Tasks (one-off + templates + trash/soft-delete), Follow-ups, Shifts (pure engine + UI), Calendar (agenda/mobile + grid/desktop), Transport, Shopping, Errands, Notifications (+ preferences), Household + Onboarding + Child Mode, Search (cross-module), Design-system showcase.

## Routes

41 files under `src/routes/`. See `docs/CLAUDE_HANDOVER.md#routes` for the enumerated list.

## Repositories (all in-memory)

`householdRepo`, `peopleDirectory`, `tasksRepo`, `templatesRepo`, `childTasksRepo`, `followUpRepo`, `shoppingRepo`, `transportRepo`, `errandsRepo`, `calendarRepo`, `shiftsRepo`, `notificationsRepo`, `todayRepo` (derived).

## Domain modules (pure, tested)

`task`, `followUp`, `shopping`, `transport`, `errand`, `calendar`, `notification`, `recurrence`, `shifts`, `today`, `household`.

## Quick Add

Sheet supports: Task, Shopping item, Transport ride, Calendar event, Errand, Follow-up. Each dialog validates minimally, retains input on failure, updates the shared mock repo, then shows success.

## Search

`/search` — cross-module text search over tasks, follow-ups, shopping items, transport rides, errands, calendar events; results grouped by category with `StatusBadge`.

## PWA

App-shell only. See `docs/PWA.md`. Registration guarded to prod + top window only.

## i18n

Hebrew only. Scaffolding (`lib/i18n.ts` + `locales/he.ts`) allows adding locales later.

## Tests

`bun run test`: **162 passed / 162 (19 files)**. Includes 3 timezone-determinism regression tests for the shift engine (UTC, Asia/Jerusalem, negative-offset and +14 zones) and 4 Supabase public-env validation tests (WP2).

## Verification (WP0 pass)

- `bun run typecheck` (`tsc --noEmit`) → 0 errors
- `bun run lint` → 0 errors, 6 warnings (all inside `src/components/ui/*`, upstream shadcn `react-refresh/only-export-components`)
- `bun run test` → 158/158 passed
- `bun run build` → success (client + server + PWA service worker), no Workbox glob warning; precaches the real app-shell assets (~140 entries)
- Reproducible on Windows, Linux and CI: `.gitattributes` enforces LF, and `typecheck` no longer depends on the un-installed `tsgo` binary.

## Explicitly NOT connected

- Supabase is **local-only scaffold** (WP2): local stack + infrastructure client exist, but no business schema, no remote project, and the client is not wired to any module. Business data is still 100% in-memory mocks.
- No authentication (Supabase Auth, OAuth, PIN-as-credential)
- No RLS, no server-side validation
- No `createServerFn` handlers, no `src/routes/api/*` routes
- No email, push, cron, storage, analytics, error reporting
- No real persistence — refresh resets to seeds
- No E2E tests

## Git readiness

- `.gitignore` covers `node_modules`, `dist`, `dist-ssr`, `.output`, `.vinxi`, `.tanstack/**`, `.nitro`, `.wrangler/`, `.dev.vars`, `*.local`, logs, editor files.
- `.gitattributes` enforces LF (`* text=auto eol=lf`) so line endings stay consistent regardless of `core.autocrlf`; binary assets marked `binary`.
- `bun.lock` committed.
- `.env.example` contains only public `VITE_*` values, no secrets.
- No `.env` file present in the repo. No service role key, tokens, or PINs in source, docs, or CI.
- CI runs `install --frozen-lockfile` → `typecheck` → `lint` → `test` → `build` on push to `main` and all PRs.
