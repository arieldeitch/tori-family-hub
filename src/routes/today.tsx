import { createFileRoute } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/today")({
  head: () => ({
    meta: [
      { title: "היום — Tori" },
      { name: "description", content: "מבט על היום: משימות, אירועים ותזכורות." },
      { property: "og:title", content: "היום — Tori" },
      { property: "og:description", content: "מבט יומי על מה שקורה במשפחה." },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  return (
    <AppShell title={t("nav.today")}>
      <PlaceholderPage
        title={t("placeholder.today.title")}
        description={t("placeholder.today.description")}
        icon={<Home className="h-8 w-8" />}
      />
    </AppShell>
  );
}
