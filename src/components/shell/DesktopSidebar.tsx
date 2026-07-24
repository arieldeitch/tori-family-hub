import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { primaryNav, secondaryNav } from "./navConfig";

export function DesktopSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const renderItem = (item: (typeof primaryNav)[number]) => {
    const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
    const Icon = item.icon;
    return (
      <li key={item.key}>
        <Link
          to={item.to}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            active
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="truncate">{t(item.labelKey)}</span>
        </Link>
      </li>
    );
  };

  return (
    <aside
      aria-label={t("nav.openMenu")}
      className="hidden w-60 shrink-0 border-l border-border bg-surface lg:flex lg:flex-col"
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <span className="text-lg font-bold text-foreground">{t("app.name")}</span>
        <span className="truncate text-xs text-muted-foreground">{t("app.tagline")}</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">{primaryNav.map(renderItem)}</ul>
        <div className="my-3 h-px bg-border" role="separator" />
        <ul className="space-y-1">{secondaryNav.map(renderItem)}</ul>
      </nav>
    </aside>
  );
}
