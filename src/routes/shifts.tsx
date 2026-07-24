import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";

export const Route = createFileRoute("/shifts")({
  head: () => ({
    meta: [
      { title: "תורנויות — Tori" },
      { name: "description", content: "ניהול כללי תורנות של המשפחה עם תצוגה מקדימה." },
      { property: "og:title", content: "תורנויות — Tori" },
      {
        property: "og:description",
        content: "כללי סבב, שיבוץ קבוע לפי יום ותצוגה מקדימה של ההקצאות הבאות.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell title="תורנויות">
      <Outlet />
    </AppShell>
  ),
});
