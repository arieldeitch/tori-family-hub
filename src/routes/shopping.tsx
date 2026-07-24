import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/shopping")({
  head: () => ({
    meta: [
      { title: "קניות — Tori" },
      { name: "description", content: "רשימות קניות משותפות למשק הבית." },
      { property: "og:title", content: "קניות — Tori" },
      { property: "og:description", content: "רשימות קניות משותפות ב‑Tori." },
    ],
  }),
  component: ShoppingLayout,
});

function ShoppingLayout() {
  return (
    <AppShell title={t("nav.shopping")}>
      <Outlet />
    </AppShell>
  );
}
