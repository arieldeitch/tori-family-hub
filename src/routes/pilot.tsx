// Family Pilot — layout route (WP5A).
//
// Deliberately unguarded: it hosts both the sign-in screen and the protected
// landing. Guarding here would redirect the sign-in page to itself.
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/pilot")({
  head: () => ({
    meta: [
      { title: "פיילוט משפחתי — Tori" },
      { name: "description", content: "פיילוט מקומי לניהול מטלות שבועיות." },
      // Local, non-production surface: keep it out of any index.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PilotLayout,
});

function PilotLayout() {
  return <Outlet />;
}
