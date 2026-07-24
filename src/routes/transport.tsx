import { createFileRoute } from "@tanstack/react-router";
import { Car } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/transport")({
  head: () => ({
    meta: [
      { title: "הסעות — Tori" },
      { name: "description", content: "תיאום הסעות, איסופים והורדות." },
      { property: "og:title", content: "הסעות — Tori" },
      { property: "og:description", content: "תיאום הסעות משפחתיות ב‑Tori." },
    ],
  }),
  component: TransportPage,
});

function TransportPage() {
  return (
    <AppShell title={t("nav.transport")}>
      <PlaceholderPage
        title={t("placeholder.transport.title")}
        description={t("placeholder.transport.description")}
        icon={<Car className="h-8 w-8" />}
      />
    </AppShell>
  );
}
