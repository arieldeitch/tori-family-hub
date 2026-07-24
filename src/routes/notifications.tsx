import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "מרכז ההתראות — Tori" },
      {
        name: "description",
        content: "מרכז התראות רגוע, ממוקד פעולה. סיכומי יום, תזכורות והתראות דחופות במקום אחד.",
      },
      { property: "og:title", content: "מרכז ההתראות — Tori" },
      {
        property: "og:description",
        content: "מרכז התראות משפחתי עם קיבוץ לפי היום, אתמול ומוקדם יותר.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Outlet />,
});
