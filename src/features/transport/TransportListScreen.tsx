import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { useTransport } from "@/lib/useTransport";
import { transportRepo, type TransportViewState } from "@/data/transportRepo";
import { TransportCard } from "./TransportCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/design-system/EmptyState";
import { ErrorState } from "@/components/design-system/ErrorState";
import { PermissionDeniedState } from "@/components/design-system/PermissionDeniedState";
import { SectionHeader } from "@/components/design-system/SectionHeader";

type Tab = "all" | "unassigned" | "pending" | "active" | "history";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "all", label: "הכל" },
  { id: "unassigned", label: "ללא אחראי" },
  { id: "pending", label: "ממתין לאישור" },
  { id: "active", label: "בטיפול" },
  { id: "history", label: "היסטוריה" },
];

const VIEW_OPTIONS: Array<{ value: TransportViewState; label: string }> = [
  { value: "normal", label: "רגיל" },
  { value: "empty", label: "ריק" },
  { value: "loading", label: "טעינה" },
  { value: "error", label: "שגיאה" },
  { value: "permission_denied", label: "אין הרשאה" },
];

export function TransportListScreen() {
  const { view, rides } = useTransport();
  const [tab, setTab] = useState<Tab>("all");

  const filtered = rides.filter((r) => {
    if (tab === "all") return !["completed", "cancelled", "transferred"].includes(r.status);
    if (tab === "unassigned") return r.status === "unassigned";
    if (tab === "pending") return r.status === "pending_acceptance";
    if (tab === "active") return r.status === "accepted" || r.status === "en_route";
    if (tab === "history") return ["completed", "cancelled", "transferred"].includes(r.status);
    return true;
  });

  const unassignedCount = rides.filter((r) => r.status === "unassigned").length;
  const pendingCount = rides.filter((r) => r.status === "pending_acceptance").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border/70 bg-muted/40 p-2 text-xs text-muted-foreground">
        <span className="font-medium">תצוגת הדגמה:</span>
        <select
          aria-label="בחירת מצב תצוגה"
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          value={view}
          onChange={(e) => transportRepo.setView(e.target.value as TransportViewState)}
        >
          {VIEW_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <SectionHeader title={<span>הסעות</span>} />
        <Button asChild size="sm" className="h-11 gap-1">
          <Link to="/transport/new">
            <Plus className="h-4 w-4" aria-hidden />
            הסעה חדשה
          </Link>
        </Button>
      </div>

      {(unassignedCount > 0 || pendingCount > 0) && view === "normal" ? (
        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/transport/unassigned"
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground min-h-11"
          >
            <span className="truncate">ללא אחראי</span>
            <span className="shrink-0 rounded-full bg-warning/25 px-2 py-0.5 text-xs font-bold tabular-nums">
              {unassignedCount}
            </span>
          </Link>
          <Link
            to="/transport/pending"
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-info/40 bg-info/10 p-3 text-sm text-info min-h-11"
          >
            <span className="truncate">ממתין לאישור</span>
            <span className="shrink-0 rounded-full bg-info/25 px-2 py-0.5 text-xs font-bold tabular-nums">
              {pendingCount}
            </span>
          </Link>
        </div>
      ) : null}

      <div role="tablist" aria-label="סינון הסעות" className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`h-11 rounded-full px-3 text-sm ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === "loading" ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          טוען הסעות…
        </div>
      ) : view === "error" ? (
        <ErrorState
          title="לא הצלחנו לטעון את ההסעות"
          description="בדקו את החיבור ונסו שוב."
          action={
            <Button variant="outline" size="sm" onClick={() => transportRepo.setView("normal")}>
              נסו שוב
            </Button>
          }
        />
      ) : view === "permission_denied" ? (
        <PermissionDeniedState
          title="אין הרשאה לצפייה בהסעות"
          description="פנו למנהל/ת הבית כדי לקבל הרשאה."
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="אין הסעות בקטגוריה זו" description="הוסיפו הסעה חדשה או החליפו טאב." />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((r) => (
            <li key={r.id}>
              <TransportCard ride={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
