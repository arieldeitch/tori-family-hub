import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/errands")({
  head: () => ({
    meta: [
      { title: "סידורים — Tori" },
      {
        name: "description",
        content: "ניהול סידורים הקשורים למיקום או ליציאה — ללא מפות וללא מעקב.",
      },
      { property: "og:title", content: "סידורים — Tori" },
      {
        property: "og:description",
        content: "רשימת סידורים משפחתית עם קיבוץ לפי אזור, אדם או יום.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Outlet />,
});
