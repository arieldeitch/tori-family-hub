import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { primaryNav } from "./navConfig";

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label={t("nav.openMenu")}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur",
        "pb-[env(safe-area-inset-bottom)] lg:hidden",
      )}
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
        {primaryNav.map((item) => {
          const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <li key={item.key} className="flex-1">
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.25]")} aria-hidden="true" />
                <span>{t(item.labelKey)}</span>
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 h-0.5 w-8 rounded-b bg-primary"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
