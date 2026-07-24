import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

// The Nitro client output directory differs by build environment: the Lovable
// sandbox build emits the client bundle to `dist/client`, while a normal local
// or CI build (cloudflare-module preset) emits it to `.output/public`. Detect
// the sandbox exactly the way @lovable.dev/vite-tanstack-config does, then point
// the PWA plugin's `globDirectory` at whichever directory actually holds the
// built app-shell assets. Without this, a local/CI build globs the empty default
// vite outDir and precaches nothing (the "glob doesn't match any files" warning).
const isLovableSandbox =
  process.env.LOVABLE_SANDBOX === "1" || Boolean(process.env.DEV_SERVER__PROJECT_PATH);
const pwaGlobDirectory = isLovableSandbox ? "dist/client" : ".output/public";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      // App-shell only PWA. See docs/PWA.md for the guarded registration wrapper,
      // the ?sw=off kill switch, and preview/dev safety. `injectRegister: null`
      // ensures the plugin never injects its own registration — the wrapper in
      // src/lib/pwa/register.ts is the single registrar.
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        devOptions: { enabled: false },
        filename: "sw.js",
        includeAssets: [
          "favicon.ico",
          "offline.html",
          "icons/icon-192.png",
          "icons/icon-512.png",
          "icons/icon-maskable-512.png",
          "icons/apple-touch-icon.png",
        ],
        manifest: {
          name: "Tori — מרכז התפעול המשפחתי",
          short_name: "Tori",
          description: "עוזר תפעולי רגוע למשפחה",
          lang: "he",
          dir: "rtl",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#ffffff",
          theme_color: "#2C7A7B",
          orientation: "portrait",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            {
              src: "/icons/icon-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          // App-shell only. NetworkFirst for HTML navigations, CacheFirst for hashed
          // same-origin assets. OAuth is excluded from navigation fallback.
          navigateFallback: "/offline.html",
          navigateFallbackDenylist: [/^\/api\//, /^\/~oauth/],
          // Point Workbox at the real client output dir (see `pwaGlobDirectory`
          // above) so the hashed app-shell assets are precached instead of
          // globbing an empty directory.
          globDirectory: pwaGlobDirectory,
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              // HTML navigations — always try network first so users don't get stuck
              // on stale shells. Falls back to the offline shell handled above.
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "html-navigations",
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin && ["style", "script", "worker"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "static-assets",
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin && request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "images",
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
