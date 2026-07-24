import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-muted-foreground">
          {t("app.name")} · {t("app.tagline")}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
          {t("home.title")}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">{t("home.subtitle")}</p>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">
          <span
            className="inline-block h-2 w-2 rounded-full bg-primary"
            aria-hidden="true"
          />
          {t("home.healthy")}
        </span>
      </div>
    </main>
  );
}
