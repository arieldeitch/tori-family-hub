import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import { buildWorkboxOptions } from "./src/lib/pwa/workboxOptions";

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
        // Routing rules live in src/lib/pwa/workboxOptions.ts so their invariants
        // can be unit-tested. In short: the offline page is a FALLBACK, never a
        // destination, and there is deliberately NO navigateFallback. See the
        // comments there and docs/PWA.md for what went wrong when there was one.
        workbox: buildWorkboxOptions({ globDirectory: pwaGlobDirectory }),
      }),
    ],
  },
});
