import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
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

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/onboarding">{t("home.startOnboarding")}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/household">{t("home.goHousehold")}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/child">{t("home.goChild")}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/follow-ups">מעקבים</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
