import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "לוח שנה — Tori" },
      { name: "description", content: "לוח שנה משפחתי משותף." },
      { property: "og:title", content: "לוח שנה — Tori" },
      { property: "og:description", content: "לוח שנה משפחתי משותף ב‑Tori." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  return (
    <AppShell title={t("nav.calendar")}>
      <PlaceholderPage
        title={t("placeholder.calendar.title")}
        description={t("placeholder.calendar.description")}
        icon={<CalendarDays className="h-8 w-8" />}
      />
    </AppShell>
  );
}
