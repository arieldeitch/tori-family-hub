import { Link } from "@tanstack/react-router";
import { Bell, Plus, Search } from "lucide-react";
import { t } from "@/lib/i18n";
import { IconButton } from "@/components/design-system/IconButton";
import { PersonAvatar } from "@/components/design-system/PersonAvatar";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  title: string;
  householdName?: string;
  onQuickAdd: () => void;
}

export function AppHeader({ title, householdName, onQuickAdd }: AppHeaderProps) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-2 backdrop-blur"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
        {householdName ? (
          <p className="truncate text-xs text-muted-foreground">
            <span className="sr-only">{t("nav.householdContext")}: </span>
            {householdName}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" onClick={onQuickAdd} className="hidden gap-1 sm:inline-flex">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("nav.quickAdd")}
        </Button>
        <IconButton
          aria-label={t("nav.quickAdd")}
          icon={<Plus />}
          onClick={onQuickAdd}
          className="sm:hidden"
        />
        <Link
          to="/search"
          aria-label="חיפוש"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </Link>
        <Link
          to="/notifications"
          aria-label={t("nav.notificationsLabel")}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
        </Link>
        <Link
          to="/settings"
          aria-label={t("nav.profileLabel")}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full"
        >
          <PersonAvatar name={householdName ?? t("app.name")} size="sm" />
        </Link>
      </div>
    </header>
  );
}
