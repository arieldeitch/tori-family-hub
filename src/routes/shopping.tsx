import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";
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
  component: ShoppingPage,
});

function ShoppingPage() {
  return (
    <AppShell title={t("nav.shopping")}>
      <PlaceholderPage
        title={t("placeholder.shopping.title")}
        description={t("placeholder.shopping.description")}
        icon={<ShoppingCart className="h-8 w-8" />}
      />
    </AppShell>
  );
}
