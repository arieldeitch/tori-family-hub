import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { FollowUpListScreen } from "@/features/follow-ups/FollowUpListScreen";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/follow-ups/")({
  head: () => ({
    meta: [
      { title: "מעקבים — Tori" },
      {
        name: "description",
        content:
          "ניהול נושאים שנסחבים מול גורמים חיצוניים: בנק, ביטוח, עירייה, אחריות ובעלי מקצוע.",
      },
      { property: "og:title", content: "מעקבים — Tori" },
      {
        property: "og:description",
        content: "מי מחזיק בכדור, מה הפעולה האחרונה, ומתי לחזור.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: () => (
    <AppShell title={t("nav.followUps")}>
      <FollowUpListScreen />
    </AppShell>
  ),
});

