import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "משימות — Tori" },
      { name: "description", content: "ניהול משימות חד־פעמיות של המשפחה." },
      { property: "og:title", content: "משימות — Tori" },
      { property: "og:description", content: "ניהול משימות חד־פעמיות של המשפחה ב‑Tori." },
    ],
  }),
  component: () => <Outlet />,
});
