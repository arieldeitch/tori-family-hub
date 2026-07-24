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

`bun run test`: **155 passed / 155 (18 files)**, ~7s.

## Verification (this pass)

- `bun run typecheck` → 0 errors
- `bun run lint` → 0 errors, 6 warnings (all inside `src/components/ui/*`, upstream shadcn `react-refresh/only-export-components`)
- `bun run test` → 155/155 passed
- `bun run build` → success (client + server + PWA service worker)

## Explicitly NOT connected

- No Supabase / Lovable Cloud
- No authentication (Supabase Auth, OAuth, PIN-as-credential)
- No RLS, no server-side validation
- No `createServerFn` handlers, no `src/routes/api/*` routes
- No email, push, cron, storage, analytics, error reporting
- No real persistence — refresh resets to seeds
- No E2E tests

## Git readiness

- `.gitignore` covers `node_modules`, `dist`, `dist-ssr`, `.output`, `.vinxi`, `.tanstack/**`, `.nitro`, `.wrangler/`, `.dev.vars`, `*.local`, logs, editor files.
- `bun.lock` committed.
- `.env.example` contains only public `VITE_*` values, no secrets.
- No `.env` file present in the repo. No service role key, tokens, or PINs in source, docs, or CI.
- CI runs `install --frozen-lockfile` → `typecheck` → `lint` → `test` → `build` on push to `main` and all PRs.
