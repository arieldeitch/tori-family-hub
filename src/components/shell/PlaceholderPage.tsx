import type { ReactNode } from "react";
import { EmptyState } from "@/components/design-system/EmptyState";
import { t } from "@/lib/i18n";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("placeholder.comingSoon")}
        </p>
        <h2 className="mt-1 text-2xl font-bold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <EmptyState icon={icon} title={t("placeholder.comingSoon")} description={description} />
    </div>
  );
}
