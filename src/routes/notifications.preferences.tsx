import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { PreferencesScreen } from "@/features/notifications/PreferencesScreen";

export const Route = createFileRoute("/notifications/preferences")({
  head: () => ({
    meta: [
      { title: "העדפות התראות — Tori" },
      { name: "description", content: "ניהול העדפות התראות: קטגוריות, שעות שקטות, סיכומים והסלמה." },
      { property: "og:title", content: "העדפות התראות — Tori" },
      { property: "og:description", content: "בקרה עדינה על מה שקופץ ומתי." },
    ],
  }),
  component: PreferencesPage,
});

function PreferencesPage() {
  return (
    <AppShell title="העדפות התראות">
      <PreferencesScreen />
    </AppShell>
  );
}
