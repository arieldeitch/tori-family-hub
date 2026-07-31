import { describe, expect, it } from "vitest";
import { buildWorkboxOptions, isHandledNavigation, OFFLINE_FALLBACK_URL } from "./workboxOptions";

// Regression guard for the hosted outage: the service worker served the offline
// page for every navigation while the connection was perfectly fine, because
// `navigateFallback` builds a NavigationRoute that unconditionally answers every
// navigation from the precache and is matched before any runtimeCaching route.
//
// These assertions are about ROUTING SHAPE, so they hold without a build.

function navigationRoute(options = buildWorkboxOptions({ globDirectory: ".output/public" })) {
  const route = options.runtimeCaching.find(
    (entry) => entry.options.cacheName === "html-navigations",
  );
  if (!route) throw new Error("no html-navigations route");
  return route;
}

function matches(pathname: string, mode: string, sameOrigin = true): boolean {
  const route = navigationRoute();
  return route.urlPattern({
    request: { mode, destination: "document" } as unknown as Request,
    url: new URL(`https://tori.example${pathname}`),
    sameOrigin,
  });
}

describe("workbox options", () => {
  it("declares NO navigateFallback — this is the whole bug", () => {
    // A NavigationRoute would answer every navigation from the precache and win
    // over the NetworkFirst route below, which is exactly what pinned the hosted
    // app on the offline screen.
    expect(
      buildWorkboxOptions({ globDirectory: ".output/public" }).navigateFallback,
    ).toBeUndefined();
  });

  it("handles navigations with NetworkFirst, so a reachable server always wins", () => {
    const route = navigationRoute();
    expect(route.handler).toBe("NetworkFirst");
    expect(route.options.networkTimeoutSeconds).toBe(3);
  });

  it("reaches the offline page only through precacheFallback", () => {
    // precacheFallback runs only after the handler has genuinely failed, which is
    // the difference between a fallback and a destination.
    expect(navigationRoute().options.precacheFallback).toEqual({
      fallbackURL: OFFLINE_FALLBACK_URL,
    });
  });

  it("matches ordinary navigations", () => {
    expect(matches("/", "navigate")).toBe(true);
    expect(matches("/today", "navigate")).toBe(true);
    expect(matches("/tasks/abc", "navigate")).toBe(true);
  });

  it("never handles non-navigation requests with the navigation route", () => {
    expect(matches("/today", "cors")).toBe(false);
    expect(matches("/assets/app.js", "no-cors")).toBe(false);
  });

  it("never handles server routes or the OAuth callback", () => {
    expect(matches("/api/anything", "navigate")).toBe(false);
    expect(matches("/~oauth", "navigate")).toBe(false);
    expect(matches("/~oauth/callback", "navigate")).toBe(false);
  });

  it("treats a cross-origin navigation as handled — the exclusions are same-origin paths", () => {
    expect(matches("/api/anything", "navigate", false)).toBe(true);
  });

  it("keeps the worker replaceable so a bad deploy cannot pin itself", () => {
    const options = buildWorkboxOptions({ globDirectory: ".output/public" });
    expect(options.skipWaiting).toBe(true);
    expect(options.clientsClaim).toBe(true);
    expect(options.cleanupOutdatedCaches).toBe(true);
  });

  it("precaches from the directory it is given", () => {
    expect(buildWorkboxOptions({ globDirectory: "dist/client" }).globDirectory).toBe("dist/client");
  });
});

describe("isHandledNavigation", () => {
  it("excludes same-origin server paths only", () => {
    expect(isHandledNavigation("/api/x", true)).toBe(false);
    expect(isHandledNavigation("/~oauth", true)).toBe(false);
    expect(isHandledNavigation("/today", true)).toBe(true);
    expect(isHandledNavigation("/api/x", false)).toBe(true);
  });

  it("does not exclude paths that merely contain the prefixes later on", () => {
    expect(isHandledNavigation("/tasks/api/x", true)).toBe(true);
  });
});
