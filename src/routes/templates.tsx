import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "תבניות משימה — Tori" },
      { name: "description", content: "ניהול תבניות משימה חוזרות של המשפחה." },
      { property: "og:title", content: "תבניות משימה — Tori" },
      { property: "og:description", content: "ניהול תבניות משימה חוזרות של המשפחה ב־Tori." },
    ],
  }),
  component: () => (
    <AppShell title="תבניות">
      <Outlet />
    </AppShell>
  ),
});
