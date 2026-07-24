import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { HouseholdScreen } from "@/features/household/HouseholdScreen";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/household")({
  head: () => ({
    meta: [
      { title: "בני הבית — Tori" },
      { name: "description", content: "ניהול בני הבית, אורחים ומטפלים." },
      { property: "og:title", content: "בני הבית — Tori" },
      { property: "og:description", content: "ניהול בני הבית ב‑Tori." },
    ],
  }),
  component: () => (
    <AppShell title={t("nav.household")}>
      <HouseholdScreen />
    </AppShell>
  ),
});
