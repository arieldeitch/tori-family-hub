import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "התראות — Tori" },
      { name: "description", content: "מרכז ההתראות של המשפחה." },
      { property: "og:title", content: "התראות — Tori" },
      { property: "og:description", content: "מרכז ההתראות ב‑Tori." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <AppShell title={t("nav.notifications")}>
      <PlaceholderPage
        title={t("placeholder.notifications.title")}
        description={t("placeholder.notifications.description")}
        icon={<Bell className="h-8 w-8" />}
      />
    </AppShell>
  );
}
