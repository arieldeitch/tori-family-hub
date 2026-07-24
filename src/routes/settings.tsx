import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "הגדרות — Tori" },
      { name: "description", content: "העדפות אישיות והגדרות משק הבית." },
      { property: "og:title", content: "הגדרות — Tori" },
      { property: "og:description", content: "העדפות והגדרות ב‑Tori." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell title={t("nav.settings")}>
      <PlaceholderPage
        title={t("placeholder.settings.title")}
        description={t("placeholder.settings.description")}
        icon={<SettingsIcon className="h-8 w-8" />}
      />
    </AppShell>
  );
}
