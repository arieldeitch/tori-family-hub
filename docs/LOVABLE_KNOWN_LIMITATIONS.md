# Known Limitations

## Persistence
- **No persistence.** All data lives in in-memory JS objects (`src/data/*Repo.ts`). Any browser refresh resets to seeded demo data.
- No localStorage/IndexedDB fallback. Deliberate — chosen to avoid coupling UX to a store that will be replaced by Supabase.

## Auth & security
- **No authentication.** Household/role/child-mode selection are UX guards only.
- **PIN is not a credential.** No hashing, no rate limit, no server check.
- **No RLS, no server validation.** Every "permission" check is client-side and bypassable via devtools.

## Backend
- **Supabase is local-only scaffold (WP2).** A local Supabase workflow exists (`supabase/`, a typed infrastructure client under `src/infrastructure/supabase/`, `db:*` scripts, a CI `database` job), but there is **no business schema, no Auth, no RLS, and no remote project**, and the client is **not connected to any module** — modules still read/write the in-memory mocks. Requires Docker to run locally.
- No server functions (`createServerFn`), no `src/routes/api/*` endpoints.
- No email, no notifications, no cron. Notification screen is UI-only.

## PWA
- App-shell only. No offline data, no background sync, no push notifications.
- Service worker registration is skipped in dev and in iframes.
- The generated `sw.js`/`workbox-*.js` are still written to the vite `dist/` dir, not the Nitro deploy dir (`.output/public` in a local/CI build). WP0 fixed the precache glob so the manifest now lists the real app-shell assets, but wiring the SW file itself into the deployed output (so `/sw.js` resolves in production on Cloudflare) is deferred — no production hosting is configured yet, and registration is already gated to prod + top window. Revisit when deployment is set up.

## i18n
- Hebrew only. `t()` scaffolding present but no other locales bundled.

## Testing
- 158 unit/integration tests, mostly domain + a few repo/UI. No E2E (Playwright/Cypress). No visual regression.
- Accessibility is enforced via DS wrapper invariants; not audited with axe.
- Shift-engine timezone determinism is now covered by regression tests (WP0): the preview previously mixed local midnight with a UTC date key, producing different assignments per host timezone. Fixed to use the UTC calendar; tests assert identical results across UTC, Asia/Jerusalem, America/Los_Angeles and Pacific/Kiritimati.

## Design system
- 6 ESLint `react-refresh/only-export-components` warnings inside `src/components/ui/*` (shadcn upstream). Left intentionally — patching upstream shadcn adds maintenance cost.

## Data model
- People id aliasing (`peopleDirectory` alias table) exists to bridge legacy transport ids. Should be removed once transport seed data is regenerated against canonical ids.

## Build
- Targets Cloudflare Workers (`nodejs_compat`). Node-only npm packages will fail — see `server-runtime` guidance before adding dependencies.
