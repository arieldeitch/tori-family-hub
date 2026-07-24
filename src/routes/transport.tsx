import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/transport")({
  head: () => ({
    meta: [
      { title: "הסעות — Tori" },
      { name: "description", content: "תיאום איסופים והורדות של המשפחה." },
      { property: "og:title", content: "הסעות — Tori" },
      { property: "og:description", content: "תיאום איסופים והורדות של המשפחה ב־Tori." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell title={t("nav.transport")}>
      <Outlet />
    </AppShell>
  ),
});
