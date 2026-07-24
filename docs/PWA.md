# PWA — App Shell (basic)

Tori includes a **basic, app-shell-only** PWA so the frame of the app can
launch from the home screen and show a graceful offline page. The PWA is
built with `vite-plugin-pwa` (`generateSW`) and is intentionally minimal.

## What works

- Installable on Android/iOS home screen (manifest + icons + theme).
- Offline **app shell**: if the network is unavailable, users see a calm
  Hebrew/RTL offline page (`public/offline.html`) instead of a browser
  error.
- `NetworkFirst` for HTML navigations with a 3-second network timeout — no
  cache-first HTML, so users don't get stuck on a stale shell.
- `CacheFirst` only for same-origin hashed JS/CSS/images.
- Autoupdate: `registerType: "autoUpdate"` + `skipWaiting` + `clientsClaim`.
- Guarded registration wrapper (`src/lib/pwa/register.ts`) that refuses to
  register in:
  - dev (`!import.meta.env.PROD`),
  - iframes,
  - Lovable preview hosts (`id-preview--*`, `preview--*`,
    `*.lovableproject.com`, `*.lovableproject-dev.com`,
    `*.beta.lovable.dev`),
  - any URL with `?sw=off` (kill switch).
  In every refused context it also unregisters existing `/sw.js`
  registrations to keep browsers clean.

## What is NOT production-ready

- **Icons are placeholders**, generated for demo. Replace with real brand
  assets before launch.
- **No background sync.** Local edits stay local until the app is open and
  the user retries. UI never claims otherwise (`PendingSyncBadge` says
  "ממתין לסנכרון" — not "will sync in the background").
- **No offline business logic.** The app shell loads offline but the
  business features assume a working backend.
- **No push notifications.** Web push / FCM messaging worker are out of
  scope for this milestone.
- Not yet audited on real iOS + Android installs; behavior may vary by
  browser (particularly install prompts and maskable icon crops).

## Privacy & safety

- No sensitive user data is cached as a persistent strategy. Only static
  app-shell assets, images, and short-TTL HTML shells are cached.
- No tokens are cached by the service worker.
- `localStorage` is **not** used as a source of truth anywhere.
- Post-logout data isolation is not applicable yet (no auth). When auth is
  added, the sign-out flow must also clear caches for any per-user views.

## Files

- `vite.config.ts` — `VitePWA` plugin block (manifest, workbox rules).
- `public/offline.html` — offline app-shell fallback.
- `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`,
  `apple-touch-icon.png` — placeholder icons.
- `src/lib/pwa/register.ts` — the single guarded registration wrapper.
- `src/routes/__root.tsx` — head links (`manifest`, `theme-color`,
  `apple-touch-icon`) and the `useEffect` that calls the wrapper.

## Kill switch / recovery

If a returning user gets a stuck cache, appending `?sw=off` to any URL
will cause the wrapper to unregister `/sw.js` for that origin, and the
next reload serves fresh HTML from the network.

## Manual checks

- `bunx vite build` should print `PWA v1.3.0 ... files generated dist/sw.js`.
- `dist/client/manifest.webmanifest` should exist with `name`,
  `short_name`, `display: "standalone"`, `theme_color`, and 3 icons.
- `dist/client/offline.html` should exist.
- With the app served from a production build, DevTools → Application →
  Manifest should show the icons; Application → Service Workers should
  show `/sw.js` as activated.
- Registering in Lovable preview (`id-preview--*`) should be **refused**.
