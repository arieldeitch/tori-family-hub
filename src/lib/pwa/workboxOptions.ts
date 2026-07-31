// Workbox configuration for the app-shell service worker.
//
// Extracted from vite.config.ts so the invariants below can be unit-tested. A
// service worker is the one piece of this app that keeps running after a bad
// deploy, so its routing rules deserve tests rather than review alone.
//
// THE RULE THIS FILE EXISTS TO ENFORCE:
//   The offline page is a FALLBACK, never a destination. It may only be reached
//   after a navigation genuinely failed — never as the normal handler for a
//   navigation, and never while the network is fine.
//
// The bug this replaced: `navigateFallback: "/offline.html"` reads like "show
// the offline page when offline", but Workbox turns it into
//
//   registerRoute(new NavigationRoute(createHandlerBoundToURL("/offline.html")))
//
// which serves the PRECACHED offline page for EVERY navigation regardless of
// connectivity, and — because Workbox matches routes in registration order — is
// matched before any runtimeCaching route, making those dead code. The hosted
// app showed "אין חיבור לרשת כרגע" on a healthy connection, permanently, because
// the application never got to run at all.

/** Server routes the service worker must never handle. */
export const SW_EXCLUDED_PATH_PREFIXES = ["/api/", "/~oauth"] as const;

export const OFFLINE_FALLBACK_URL = "/offline.html";

/** True when this navigation should be handled by the SW at all. */
export function isHandledNavigation(pathname: string, sameOrigin: boolean): boolean {
  if (!sameOrigin) return true;
  return !SW_EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export interface WorkboxOptionsInput {
  /** Directory holding the built client assets to precache. */
  globDirectory: string;
}

/**
 * Build the Workbox options object consumed by `VitePWA`.
 *
 * `navigateFallback` is explicitly `undefined`: vite-plugin-pwa defaults it to
 * `"index.html"`, which is wrong twice over here. This is a server-rendered
 * TanStack Start app with no static `index.html`, so the precache manifest has
 * no such entry and `createHandlerBoundToURL` would throw and take the whole
 * service worker down; and any NavigationRoute at all reintroduces the bug
 * described above.
 */
export function buildWorkboxOptions({ globDirectory }: WorkboxOptionsInput) {
  return {
    navigateFallback: undefined,
    globDirectory,
    globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
    cleanupOutdatedCaches: true,
    // A broken deploy must be replaceable without the user clearing storage by
    // hand: the new worker takes over on the next load rather than waiting for
    // every tab to close.
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        // HTML navigations: always try the network first so a reachable server
        // always wins and nobody is pinned to a stale shell.
        urlPattern: ({
          request,
          url,
          sameOrigin,
        }: {
          request: Request;
          url: URL;
          sameOrigin: boolean;
        }) => request.mode === "navigate" && isHandledNavigation(url.pathname, sameOrigin),
        handler: "NetworkFirst" as const,
        options: {
          cacheName: "html-navigations",
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
          // The ONLY route to the offline page: the network failed AND no cached
          // response existed.
          precacheFallback: { fallbackURL: OFFLINE_FALLBACK_URL },
        },
      },
      {
        urlPattern: ({ request, sameOrigin }: { request: Request; sameOrigin: boolean }) =>
          sameOrigin && ["style", "script", "worker"].includes(request.destination),
        handler: "CacheFirst" as const,
        options: {
          cacheName: "static-assets",
          expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      {
        urlPattern: ({ request, sameOrigin }: { request: Request; sameOrigin: boolean }) =>
          sameOrigin && request.destination === "image",
        handler: "CacheFirst" as const,
        options: {
          cacheName: "images",
          expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
    ],
  };
}
