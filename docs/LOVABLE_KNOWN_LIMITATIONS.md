# Known Limitations

## Persistence
- **No persistence.** All data lives in in-memory JS objects (`src/data/*Repo.ts`). Any browser refresh resets to seeded demo data.
- No localStorage/IndexedDB fallback. Deliberate — chosen to avoid coupling UX to a store that will be replaced by Supabase.

## Auth & security
- **No authentication.** Household/role/child-mode selection are UX guards only.
- **PIN is not a credential.** No hashing, no rate limit, no server check.
- **No RLS, no server validation.** Every "permission" check is client-side and bypassable via devtools.

## Backend
- No Supabase, no server functions (`createServerFn`), no `src/routes/api/*` endpoints.
- No email, no notifications, no cron. Notification screen is UI-only.

## PWA
- App-shell only. No offline data, no background sync, no push notifications.
- Service worker registration is skipped in dev and in iframes.

## i18n
- Hebrew only. `t()` scaffolding present but no other locales bundled.

## Testing
- 155 unit/integration tests, mostly domain + a few repo/UI. No E2E (Playwright/Cypress). No visual regression.
- Accessibility is enforced via DS wrapper invariants; not audited with axe.

## Design system
- 6 ESLint `react-refresh/only-export-components` warnings inside `src/components/ui/*` (shadcn upstream). Left intentionally — patching upstream shadcn adds maintenance cost.

## Data model
- People id aliasing (`peopleDirectory` alias table) exists to bridge legacy transport ids. Should be removed once transport seed data is regenerated against canonical ids.

## Build
- Targets Cloudflare Workers (`nodejs_compat`). Node-only npm packages will fail — see `server-runtime` guidance before adding dependencies.
