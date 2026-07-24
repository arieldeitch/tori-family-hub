import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { secondaryNav } from "@/components/shell/navConfig";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/more")({
  head: () => ({
    meta: [
      { title: "עוד — Tori" },
      { name: "description", content: "גישה למודולים נוספים ב‑Tori." },
      { property: "og:title", content: "עוד — Tori" },
      { property: "og:description", content: "גישה לכל המודולים של Tori." },
    ],
  }),
  component: MorePage,
});

function MorePage() {
  return (
    <AppShell title={t("nav.more")}>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t("nav.more")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("placeholder.more.description")}</p>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {secondaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <Link
                  to={item.to}
                  className="flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface p-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  <span className="text-center">{t(item.labelKey)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
