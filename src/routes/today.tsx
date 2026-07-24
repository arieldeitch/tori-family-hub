import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { TodayScreen } from "@/features/today/TodayScreen";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/today")({
  head: () => ({
    meta: [
      { title: "היום — Tori" },
      { name: "description", content: "מבט על היום: משימות, אירועים, איסופים ומעקבים." },
      { property: "og:title", content: "היום — Tori" },
      { property: "og:description", content: "מבט יומי על מה שקורה במשפחה." },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  return (
    <AppShell title={t("nav.today")}>
      <TodayScreen />
    </AppShell>
  );
}
