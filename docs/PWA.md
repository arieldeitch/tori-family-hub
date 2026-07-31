# PWA — App Shell (basic)

Tori includes a **basic, app-shell-only** PWA so the frame of the app can
launch from the home screen and show a graceful offline page. The PWA is
built with `vite-plugin-pwa` (`generateSW`) and is intentionally minimal.

## The rule this service worker exists under

**The offline page is a FALLBACK, never a destination.** It may be shown only
after a navigation has genuinely failed — never as the normal handler for a
navigation, and never while the network is fine.

This is written down because breaking it took the hosted app down completely.
`workbox.navigateFallback: "/offline.html"` reads like "show the offline page
when offline", but Workbox turns it into

```js
registerRoute(new NavigationRoute(createHandlerBoundToURL("/offline.html"), …))
```

which serves the **precached** offline page for **every** navigation regardless
of connectivity — and, because Workbox matches routes in registration order and
this route is emitted before `runtimeCaching`, it made the `NetworkFirst`
navigation route below it dead code. The result was a permanent
"אין חיבור לרשת כרגע" on a perfectly good connection, with the application never
executing at all. See **ADR-042**.

Therefore:

- There is **no `navigateFallback`**. It is set explicitly to `undefined`,
  because vite-plugin-pwa otherwise defaults it to `"index.html"` — and this is
  a server-rendered app with no static `index.html`, so `createHandlerBoundToURL`
  would throw and take the whole worker down.
- The offline page is reached **only** via `precacheFallback` on the navigation
  route, i.e. after the network failed _and_ no cached response existed.
- The routing rules live in **`src/lib/pwa/workboxOptions.ts`**, not inline in
  `vite.config.ts`, so `workboxOptions.test.ts` can assert these invariants.
  A service worker is the one thing that keeps running after a bad deploy, so
  its routing deserves tests rather than review alone.

## What works

- Installable on Android/iOS home screen (manifest + icons + theme).
- Offline **app shell**: when a navigation genuinely fails, users see a calm
  Hebrew/RTL offline page (`public/offline.html`) instead of a browser error.
- **The offline page self-heals.** If it renders while `navigator.onLine` is
  true, it stops claiming the network is down, says the app failed to load,
  then unregisters service workers, clears caches and reloads — **once per tab**,
  so a broken server cannot become a reload loop. This is what recovers a client
  already pinned by a bad worker without the user clearing storage by hand.
- `NetworkFirst` for HTML navigations with a 3-second network timeout — no
  cache-first HTML, so users don't get stuck on a stale shell.
- `/api/*` and `/~oauth*` are never handled by the service worker.
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

- `vite.config.ts` — `VitePWA` plugin block (manifest); routing is delegated to
  the module below.
- `src/lib/pwa/workboxOptions.ts` — the workbox routing rules, unit-tested by
  `workboxOptions.test.ts`. **Never reintroduce `navigateFallback` here.**
- `public/offline.html` — offline app-shell fallback, with the self-healing
  recovery described above.
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

- **The generated worker must contain no `NavigationRoute`.** After a build:
  `grep -c NavigationRoute dist/sw.js` must be `0`, and
  `grep -c PrecacheFallbackPlugin dist/sw.js` must be `1`. This is the single
  most important check on this file.
- `bunx vite build` should print `PWA v1.3.0 ... files generated dist/sw.js`.
- `dist/client/manifest.webmanifest` should exist with `name`,
  `short_name`, `display: "standalone"`, `theme_color`, and 3 icons.
- `dist/client/offline.html` should exist.
- With the app served from a production build, DevTools → Application →
  Manifest should show the icons; Application → Service Workers should
  show `/sw.js` as activated.
- Registering in Lovable preview (`id-preview--*`) should be **refused**.
