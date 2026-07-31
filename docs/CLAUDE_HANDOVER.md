# Claude Code — Handover

Read this first for the **as-built implementation**. It is the source of truth for the technical/handover state of the prototype. The **business** source of truth is the Knowledge Pack — start at [`00-knowledge-pack-readme.md`](./00-knowledge-pack-readme.md) and [`01-product-requirements.md`](./01-product-requirements.md). When this document and the PRD disagree, the PRD wins and the gap is recorded in [`project-status.md`](./project-status.md).

## What exists in practice

A Hebrew (RTL), mobile-first family-coordination **prototype**. All screens, flows, and business logic are implemented against **in-memory mock repositories**. Refreshing the browser resets state to seed data. No backend, no auth, no persistence.

## Stack & versions

- Node runtime target: Cloudflare Workers (`nodejs_compat`) via Nitro
- Package manager: **Bun** (`bun.lock` committed; CI uses `oven-sh/setup-bun@v2`)
- React 19.2, TypeScript 5.8 (strict), Vite 8
- TanStack Start 1.168, TanStack Router 1.170, TanStack Query
- Tailwind CSS 4.2 (via `@tailwindcss/vite`, tokens in `src/styles.css`)
- shadcn/ui primitives (`src/components/ui/*`)
- Vitest 4.1 + React Testing Library + jsdom
- `vite-plugin-pwa` (generateSW)

## Scripts

```
bun run dev         # vite dev server
bun run build       # production build (Nitro / Cloudflare Worker)
bun run build:dev   # dev-mode build
bun run preview     # preview built output
bun run typecheck   # tsc --noEmit
bun run lint        # eslint .
bun run test        # vitest run (single)
bun run test:watch  # vitest watch
bun run format      # prettier --write .
```

## Folder structure (`src/`)

```
app/             INTENDED for app-level composition — currently EMPTY (.gitkeep only)
application/     use-cases across repos (todayService, shoppingService)
components/
  ui/            shadcn primitives (do not modify upstream files)
  design-system/ Tori wrappers (IconButton, FormField, StatusBadge, PersonAvatar,
                 EmptyState, ErrorState, MobilePageHeader, SyncConflictDialog…)
  shell/         AppShell, AppHeader, BottomNav, DesktopSidebar, QuickAddSheet
data/            in-memory repositories + peopleDirectory (subscribe-based)
domain/          pure types + rules + engines (task, followUp, shopping,
                 transport, errand, calendar, notification, recurrence, shifts,
                 today, household) — most have a .test.ts sibling (recurrence.ts has none)
features/        feature slices (one folder per module)
hooks/           only use-mobile.tsx today; the modular data hooks live under lib/
infrastructure/  supabase/ scaffold (WP2: env, client, generated types) + .gitkeep;
                 other logging/config concerns currently live under lib/
lib/             framework-agnostic utilities, i18n, pwa/register, AND the modular
                 hooks (useTasks, useToday, useShopping, …)
locales/         he.ts (only Hebrew shipped)
routes/          TanStack file-based routes (do NOT edit routeTree.gen.ts)
test/            vitest setup
styles.css       Tailwind v4 tokens (OKLCH)
```

> Structure note: `src/app/` is still an empty placeholder; `src/infrastructure/` now holds the
> WP2 Supabase scaffold under `src/infrastructure/supabase/`. The modular hooks still sit under
> `src/lib/`, not `src/hooks/` — documented, not refactored (see `project-status.md`).

## Routes

Primary (bottom nav): `/today`, `/calendar`, `/tasks`, `/shopping`, `/more`
Secondary: `/transport`, `/transport/pending`, `/transport/new`, `/transport/:rideId`, `/transport/:rideId/edit`
`/follow-ups`, `/follow-ups/:caseId`
`/errands`, `/errands/:errandId`
`/shifts`, `/shifts/new`, `/shifts/:ruleId`
`/templates`, `/templates/:templateId`, `/templates/trash`
`/tasks/:taskId`, `/tasks/unassigned`
`/shopping/:listId`
`/notifications`, `/notifications/preferences`
`/household`, `/onboarding`, `/child`, `/settings`, `/search`
Internal: `/design-system` (noindex)

41 route files in `src/routes/`.

## Design system

- Tokens in `src/styles.css` (OKLCH, light + dark). Never hardcode colors in components.
- Font: **Heebo** loaded via `<link>` in `src/routes/__root.tsx`.
- Family palette limited to 7 calm colors, exposed via `domain/household.ts::pickColor`.
- Accessibility invariants enforced by wrappers (see `LOVABLE_ARCHITECTURE.md#key-patterns`).
- Live showcase at `/design-system`.

## Mock repositories (all in-memory)

`householdRepo`, `peopleDirectory` (id source of truth + alias table), `tasksRepo`, `templatesRepo`, `childTasksRepo`, `followUpRepo`, `shoppingRepo`, `transportRepo`, `errandsRepo`, `calendarRepo`, `shiftsRepo`, `notificationsRepo`, `todayRepo` (derived, subscribes to the others).

Consumers use `useSyncExternalStore` against each repo's `subscribe()`.

## Domain logic (pure, tested)

Each `src/domain/*.ts` module owns its state machine or engine:

- `task.ts` — 10-status state machine, `transitionTask()`.
- `followUp.ts` — statuses + hard rule: `waiting_external` requires `nextFollowUpAt` or `followUpDisabledReason` (enforced in domain **and** `followUpRepo`).
- `shopping.ts` — normalization, `findSimilarOpen()` (no auto-merge).
- `transport.ts` — ride lifecycle (`unassigned` → `accepted` → `en_route` → `completed`).
- `errand.ts` — task-backed errand with location/area.
- `calendar.ts` — event helpers.
- `notification.ts` — dedup, quiet hours, redaction.
- `recurrence.ts` — deterministic instance generation.
- `shifts.ts` — pure assignment engine (fixed_sequence, weekday_fixed, manual) with "why?" explanation.
- `today.ts` — pure content selection for `/today`.
- `household.ts` — roles + visibility rules.

## Tests

**210 app tests across 24 files.** Runs via `bun run test`. Covers domain rules, key repositories, several UI dialogs, the today-service integration, shift-engine timezone determinism (regression), Supabase public-env validation (WP2) and the tracked-`.env` allowlist (ADR-038).

Database tests are separate and need Docker:

- `bun run db:test:structure` — **302 structural pgTAP across 11 files** (schema, constraints, triggers, grants, policy catalog).
- `bun run db:test:auth-suite` — **211 behavioural RLS pgTAP across 8 files** + **34 Auth-backed integration assertions**, with fixture setup and cleanup.
- `bun run pilot:test` — 29 pilot bootstrap assertions.
- `bun run db:verify` — runs the lot from a fresh reset.

## CI

`.github/workflows/ci.yml` — on push to `main` + all PRs. Two jobs:
- `verify`: `bun install --frozen-lockfile` → `typecheck` → `lint` → `test` → `build`.
- `database` (WP2): lean local Supabase → migrations + seed → generated-types freshness check → public-key-only smoke test → stop. No secrets, no remote project.

## PWA status

Basic app-shell PWA only. `vite-plugin-pwa` `generateSW`, `NetworkFirst` HTML, `CacheFirst` hashed assets, offline fallback page (`public/offline.html`). Guarded registration: skipped in dev and inside iframes. See `docs/PWA.md`.

## What is NOT connected

- Supabase is **local-only scaffold** (WP2): local stack + infrastructure client exist, but no business schema, no remote project, and nothing is wired to the modules. No Lovable Cloud.
- No authentication (Supabase Auth, OAuth, magic link, …).
- No RLS, no server-side validation.
- No `createServerFn` handlers, no `src/routes/api/*` routes.
- No email, no push notifications, no cron.
- No file storage.
- No analytics, no error reporting (Sentry).
- No E2E tests.

## What is mock only

Every business entity: tasks, templates, follow-ups, transport rides, errands, calendar events, shopping lists/items, shift rules, notifications, households, members. All fixtures live in the repo files under `src/data/`.

## No real persistence after refresh

Confirmed. In-memory only. `localStorage`/`IndexedDB` are **not** used as a fallback.

## Security debts (must resolve before production)

1. Replace UX-only role guards with Supabase Auth + `user_roles` table + `has_role` SECURITY DEFINER function. **Roles must live in a separate table**, never on a profile row.
2. Every new `public.*` table needs explicit `GRANT` + `ENABLE ROW LEVEL SECURITY` + policies in the same migration.
3. Move `waiting_external` invariant + task/follow-up/transport state transitions into DB triggers or server functions so they cannot be bypassed via devtools.
4. PIN, if kept, must be hashed server-side with rate limiting. Currently plain UX.
5. No service role key in the app. Server-side privileged calls must go through `createServerFn` handlers that first verify caller identity.
6. Any webhook/public endpoint under `src/routes/api/public/*` must verify signatures.

## Recommended order for Claude Code

1. **Read** `docs/LOVABLE_ARCHITECTURE.md` + `docs/LOVABLE_DECISIONS.md` before touching code.
2. **Enable Lovable Cloud** (see `docs/LOVABLE_NEXT_STEPS.md#1`).
3. **Auth + `_authenticated/` gate**.
4. **Schema + RLS + GRANTs** in one migration per module.
5. **Swap repositories one at a time** — keep the `subscribe()` API surface; use Supabase realtime for change events. Suggested order in `LOVABLE_NEXT_STEPS.md#4`.
6. **Move domain invariants server-side** (triggers or server functions).
7. **Add Playwright E2E** for the critical flows.
8. Only then: notifications (Web Push), email, deploy.

## Files that must be read

- `docs/LOVABLE_CURRENT_STATE.md`
- `docs/LOVABLE_ARCHITECTURE.md`
- `docs/LOVABLE_DECISIONS.md`
- `docs/LOVABLE_KNOWN_LIMITATIONS.md`
- `docs/LOVABLE_NEXT_STEPS.md`
- `docs/PWA.md`
- `src/routes/__root.tsx`
- `src/styles.css`
- `src/domain/task.ts`, `src/domain/followUp.ts`, `src/domain/shopping.ts`, `src/domain/shifts.ts`, `src/domain/recurrence.ts`, `src/domain/today.ts`
- `src/data/peopleDirectory.ts`, `src/data/todayRepo.ts`
- `src/application/todayService.ts`, `src/application/shoppingService.ts`
- `src/components/shell/QuickAddSheet.tsx`
- `src/lib/pwa/register.ts`

## Known issues

- 6 ESLint `react-refresh/only-export-components` warnings in upstream shadcn files (`src/components/ui/*`). Intentional — not patching upstream. The WP0 `.gitattributes` (LF) fix cleared the Windows CRLF `prettier/prettier` noise.
- 1 further warning: an unused `eslint-disable no-new` directive at `src/lib/pilot/runtimeConfig.ts:95`, introduced by WP5A (`5ac99af`). Trivially fixable with `--fix`; left alone as out of scope for WP5B. **7 warnings, 0 errors** in total.
- `peopleDirectory` alias table is a legacy bridge for transport ids; remove after seed regeneration.
- No test covers refresh-persistence (there is none to test).
- PWA `sw.js` is generated but still written to `dist/`, not the Nitro deploy dir (`.output/public`) in a local/CI build — see `LOVABLE_KNOWN_LIMITATIONS.md#pwa`. Precache manifest is correct (WP0); deploying the SW file is deferred until hosting is configured.

## Manual actions remaining (outside Claude/Lovable)

- Enable Git sync in Lovable → connect GitHub repo (see `docs/LOVABLE_KNOWN_LIMITATIONS.md` / Lovable docs).
- Configure GitHub Actions secrets **only if** deploy is added (none required for the current CI).
- When Supabase is enabled: verify RLS policies in the Supabase dashboard, back up any seed data, configure OAuth providers if used.
- No production domain, DNS, or hosting configured.
