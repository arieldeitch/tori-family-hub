import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "משימות — Tori" },
      { name: "description", content: "ניהול משימות משפחתיות." },
      { property: "og:title", content: "משימות — Tori" },
      { property: "og:description", content: "ניהול משימות המשפחה ב‑Tori." },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  return (
    <AppShell title={t("nav.tasks")}>
      <PlaceholderPage
        title={t("placeholder.tasks.title")}
        description={t("placeholder.tasks.description")}
        icon={<CheckSquare className="h-8 w-8" />}
      />
    </AppShell>
  );
}
