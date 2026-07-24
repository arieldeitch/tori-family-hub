// PWA service-worker registration wrapper.
//
// This is the ONLY place that registers the app-shell service worker.
// It MUST refuse to register in any dev / iframe / Lovable-preview context
// and MUST support the `?sw=off` kill switch, per the PWA skill's rules.
//
// This wrapper does NOT touch third-party workers (e.g. messaging workers
// at other scopes) — it only manages the /sw.js registration.

const SW_URL = "/sw.js";

function isLovablePreviewHost(hostname: string): boolean {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

function shouldRefuse(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const url = new URL(window.location.href);
  if (url.searchParams.get("sw") === "off") return true;
  if (isLovablePreviewHost(window.location.hostname)) return true;
  return false;
}

async function unregisterMatching(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs.map(async (r) => {
        const scriptURL = r.active?.scriptURL ?? r.installing?.scriptURL ?? r.waiting?.scriptURL;
        if (scriptURL && new URL(scriptURL, window.location.href).pathname === SW_URL) {
          await r.unregister();
        }
      }),
    );
  } catch {
    // best-effort
  }
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  if (shouldRefuse()) {
    await unregisterMatching();
    return;
  }

  try {
    await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch (err) {
    // Silent — offline shell is a progressive enhancement, not required.
    if (import.meta.env.DEV) console.warn("[pwa] SW registration failed", err);
  }
}
