# Claude Code — Handover

Read this first for the **as-built implementation**. It is the source of truth for the technical/handover state of the prototype. The **business** source of truth is the Knowledge Pack — start at [`00-knowledge-pack-readme.md`](./00-knowledge-pack-readme.md) and [`01-product-requirements.md`](./01-product-requirements.md). When this document and the PRD disagree, the PRD wins and the gap is recorded in [`project-status.md`](./project-status.md).

## What exists in practice

A Hebrew (RTL), mobile-first family-coordination product. Most _business_ screens, flows and logic are still implemented against **in-memory mock repositories**; refreshing the browser resets those to seed data.

> **Correction, 2026-08-01.** "No backend, no auth, no persistence" was true of the prototype and is no longer true of the repository.
>
> - **Weekly chores is real.** `/chores` reads and writes `task_instances` / `task_assignments` in the hosted Supabase project under RLS, with deterministic `shifts.v1` rotation. It survives refresh, and it is a module inside `AppShell` — not a replacement for the app (ADR-045).
> - The Family Pilot slice (WP5A) performs real Supabase Auth sign-in and real household reads under RLS; the hosted non-production Supabase project is the runtime backend (ADR-037).
> - **Every other business module is still mock-only.** Tasks, calendar, shopping, transport, errands, follow-ups, templates, notifications: no backend, no auth gate, no persistence.
>
> See [`project-status.md`](./project-status.md) and [`ai/CURRENT_STATE.md`](./ai/CURRENT_STATE.md) for the verified current state.

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
Backed by Supabase: `/chores` (weekly chores module), `/pilot`, `/pilot/signin`
Internal: `/design-system` (noindex)

45 route files in `src/routes/`. The index route redirects a signed-in person to `/today` and a signed-out one to `/pilot/signin` — **never to a screen outside `AppShell`** (ADR-045).

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

**304 app tests across 29 files** — verified by `bun run test` on 2026-08-01. Covers domain rules, key repositories, several UI dialogs, the today-service integration, shift-engine timezone determinism (regression), Supabase public-env validation (WP2), the tracked-`.env` allowlist (ADR-038), the weekly chores view, the Workbox routing rules (ADR-042), error classification, the backend capability probe (ADR-044) and the pure `src/domain/week.ts` week maths.

Database tests are separate and need Docker:

- `bun run db:test:structure` — **310 structural pgTAP across 11 files** (schema, constraints, triggers, grants, policy catalog, helper contract).
- `bun run db:test:auth-suite` — **261 behavioural RLS pgTAP across 9 files** + **34 Auth-backed integration assertions**, with fixture setup and cleanup.
- `bun run pilot:test` — 29 pilot bootstrap assertions.
- `bun run db:verify` — runs the lot from a fresh reset.

## CI

`.github/workflows/ci.yml` — on push to `main` + all PRs. Two jobs:

- `verify`: `bun install --frozen-lockfile` → `typecheck` → `lint` → `test` → `build`.
- `database` (WP2): lean local Supabase → migrations + seed → generated-types freshness check → public-key-only smoke test → stop. No secrets, no remote project.

## PWA status

Basic app-shell PWA only. `vite-plugin-pwa` `generateSW`, `NetworkFirst` HTML, `CacheFirst` hashed assets, offline fallback page (`public/offline.html`). Guarded registration: skipped in dev and inside iframes. See `docs/PWA.md`.

**There is deliberately no `navigateFallback`** — it generates a `NavigationRoute` that answers every navigation from the precache and shadows the network-first route, which took the hosted app down with a permanent offline screen (ADR-042). Routing rules live in `src/lib/pwa/workboxOptions.ts` and are unit-tested; the offline page is reachable only via `precacheFallback`, and self-heals if it ever renders while the browser is online.

## What IS connected

- **Supabase is the backend** — the hosted non-production project `tori-family-pilot` (`nrfelnchbmofwrfajfai`), not Lovable Cloud (ADR-037). Five migrations are applied there.
- **Supabase Auth** password sign-in, with public signup disabled.
- **RLS on every business table**, with role-scoped read predicates (ADR-041) and `private` `SECURITY DEFINER` helpers.
- **Weekly chores persist**: `task_templates`, `task_instances`, `task_assignments`, `task_activity_log`, `rotation_rules`, `rotation_members`, `rotation_assignment_log`.
- Occurrences are generated by `bun run pilot:week:hosted`, idempotently, from `shifts.v1`.

## What is NOT connected

- No `createServerFn` handlers, no `src/routes/api/*` routes — the client talks to PostgREST directly, and authorization is RLS.
- **No scheduler.** The occurrence window is generated by a manual script run; it currently reaches 2026-08-22 and then the weekly view empties.
- No RPC layer yet for identity (WP4.5) and no Auth account deletion (WP4.6 — still blocks production).
- No email, no push notifications, no cron.
- No file storage.
- No analytics, no error reporting (Sentry).
- No E2E tests in the repository. Live verification has been done ad hoc with Playwright installed **outside** the repo.

## What is still mock only

Everything except weekly chores and pilot identity: tasks, templates, follow-ups, transport rides, errands, calendar events, shopping lists/items, shift rules, notifications, household/member browsing. Those fixtures live under `src/data/` and are in-memory — they reset on refresh, and `localStorage`/`IndexedDB` are **not** used as a fallback.

Swapping a module to Supabase means a migration with grants and policies, positive **and** negative RLS tests, and no success state before persistence is confirmed — a zero-row update is a refusal, not a success.

## Security debts (must resolve before production)

1. Replace UX-only role guards with Supabase Auth + `user_roles` table + `has_role` SECURITY DEFINER function. **Roles must live in a separate table**, never on a profile row.
2. Every new `public.*` table needs explicit `GRANT` + `ENABLE ROW LEVEL SECURITY` + policies in the same migration.
3. Move `waiting_external` invariant + task/follow-up/transport state transitions into DB triggers or server functions so they cannot be bypassed via devtools.
4. PIN, if kept, must be hashed server-side with rate limiting. Currently plain UX.
5. No service role key in the app. Server-side privileged calls must go through `createServerFn` handlers that first verify caller identity.
6. Any webhook/public endpoint under `src/routes/api/public/*` must verify signatures.

## Recommended order for Claude Code

Steps 1–3 of the original plan are done. Lovable Cloud was **never** enabled and never will be — the dedicated Supabase project is the exclusive backend (ADR-037).

1. **Read** [`ai/CLAUDE_INSTRUCTIONS.md`](./ai/CLAUDE_INSTRUCTIONS.md), then [`ai/CURRENT_STATE.md`](./ai/CURRENT_STATE.md) and [`ai/NEXT_STEPS.md`](./ai/NEXT_STEPS.md), before touching code.
2. **Verify the live origin is current** before believing anything is shipped. Merged ≠ deployed.
3. **Keep the occurrence window rolling** — `bun run pilot:week:hosted`.
4. **Quick chore creation and editing** (PRD §8) on top of the existing schema.
5. **WP4.5 identity RPCs**, then **WP4.6 Auth account deletion** — the latter blocks production.
6. **Swap the remaining repositories one at a time** — schema + RLS + GRANTs in one migration per module, keeping the `subscribe()` API surface.
7. **Move domain invariants server-side** (triggers or server functions).
8. **Add Playwright E2E** for the critical flows.
9. Only then: notifications (Web Push), email, production hosting.

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

- 6 ESLint `react-refresh/only-export-components` warnings in upstream shadcn files (`src/components/ui/*`). Intentional — not patching upstream. The WP0 `.gitattributes` (LF) fix cleared the Windows CRLF `prettier/prettier` noise. **6 warnings, 0 errors** in total — the stray WP5A `eslint-disable no-new` directive in `src/lib/pilot/runtimeConfig.ts` has been removed.
- `peopleDirectory` alias table is a legacy bridge for transport ids; remove after seed regeneration.
- No test covers refresh-persistence (there is none to test).
- PWA `sw.js` is generated but still written to `dist/`, not the Nitro deploy dir (`.output/public`) in a local/CI build — see `LOVABLE_KNOWN_LIMITATIONS.md#pwa`. Precache manifest is correct (WP0); deploying the SW file is deferred until hosting is configured.

## Manual actions remaining (outside Claude)

- **Publish from Lovable.** This is the current blocker: the live origin at `https://home-flow-joy.lovable.app/` serves a bundle predating PR #18, so the restored navigation and the weekly chores module are merged but not live. Git sync is already connected.
- **Provide the hosted pilot adult's password** for live sign-in verification.
- Configure GitHub Actions secrets **only if** deploy is added (none required for the current CI).
- No production domain, DNS, or production Supabase project configured — the pilot is deliberately non-production.
