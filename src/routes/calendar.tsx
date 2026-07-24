import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { t } from "@/lib/i18n";
import { WeekCalendarScreen } from "@/features/calendar/WeekCalendarScreen";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "לוח שבועי — Tori" },
      { name: "description", content: "לוח משפחתי שבועי — אירועים לפי יום ושעה, לפי בן משפחה." },
      { property: "og:title", content: "לוח שבועי — Tori" },
      { property: "og:description", content: "תצוגת סדר יום שבועית לכל בני הבית." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  return (
    <AppShell title={t("nav.calendar")}>
      <WeekCalendarScreen />
    </AppShell>
  );
}
