# Decisions (ADR-lite)

## D1 — TanStack Router, not react-router-dom
Lovable's modern stack ships TanStack Start. Router is fixed. Requests to "add react-router" are answered by implementing the intent with `@tanstack/react-router`.

## D2 — Hebrew + RTL as the only locale (for now)
`lang="he"`, `dir="rtl"` on the root. i18n scaffolding (`lib/i18n.ts`, `locales/he.ts`) exists so English can be added later without refactor, but only Hebrew strings ship.

## D3 — Mobile-first (360/390) with adaptive desktop
Primary layout is single-column mobile. Desktop uses `DesktopSidebar` at `lg+`. Weekly calendar uses `AgendaWeek` on mobile and `DesktopWeekGrid` on desktop — no dense mobile grid.

## D4 — Domain-first, pure logic
State machines and engines (task transitions, follow-up rules, recurrence, shifts assignment) live in `src/domain/*` as pure functions with dedicated Vitest suites. UI never bypasses them.

## D5 — Repositories are in-memory, subscription-based
Data flows via `subscribe()` + `useSyncExternalStore`. Chosen so the UX/flow can be built and tested before Supabase is wired. **No refresh persistence.**

## D6 — Design system on top of shadcn, not instead
Tokens in `src/styles.css` (OKLCH). Tori wrappers (`IconButton`, `FormField`, `StatusBadge`, `PersonAvatar`, `EmptyState`, `ErrorState`, `MobilePageHeader`, …) compose shadcn — nothing replaced.

## D7 — Font: Heebo via `<link>` in root
Loaded through `<link>` in `src/routes/__root.tsx` (Tailwind v4's Lightning CSS cannot `@import` remote URLs from `styles.css`).

## D8 — Auth is UX-only
Roles (`owner`, `adult`, `child`, `guest/carer`) and PIN are visual guards, not security. Documented explicitly so no reviewer confuses them with real auth.

## D9 — Follow-ups: `waiting_external` requires `nextFollowUpAt` or `followUpDisabledReason`
Enforced in both domain and repository layers. Non-negotiable.

## D10 — Shopping: no automatic duplicate merge
`findSimilarOpen` surfaces candidates; `mergeInto` requires explicit user confirmation.

## D11 — Soft delete with 48h restore window
Templates + tasks use a Trash with restore. Deletion is never a primary action.

## D12 — PWA is app-shell-only
`vite-plugin-pwa` `generateSW`, `NetworkFirst` HTML, `CacheFirst` hashed assets, guarded registration (prod + top window only). No background sync, no push, no offline data.

## D13 — Cloud/Supabase not enabled
No Supabase project, no auth, no RLS, no schema. Adding them is a future explicit prompt.
