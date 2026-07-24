import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/design-system/EmptyState";
import { ErrorState } from "@/components/design-system/ErrorState";
import { SectionHeader } from "@/components/design-system/SectionHeader";
import { useNotifications } from "@/lib/useNotifications";
import * as repo from "@/data/notificationsRepo";
import type { Notification } from "@/domain/notification";
import { NotificationRow } from "./NotificationRow";

type Bucket = "today" | "yesterday" | "earlier";

function bucketOf(iso: string): Bucket {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYesterday = startToday - 24 * 60 * 60 * 1000;
  const t = d.getTime();
  if (t >= startToday) return "today";
  if (t >= startYesterday) return "yesterday";
  return "earlier";
}

const BUCKET_LABEL: Record<Bucket, string> = {
  today: "היום",
  yesterday: "אתמול",
  earlier: "מוקדם יותר",
};

interface Groups {
  today: Notification[];
  yesterday: Notification[];
  earlier: Notification[];
}

function groupByDay(list: Notification[]): Groups {
  const g: Groups = { today: [], yesterday: [], earlier: [] };
  for (const n of list) g[bucketOf(n.createdAt)].push(n);
  const sortDesc = (a: Notification, b: Notification) =>
    a.createdAt < b.createdAt ? 1 : -1;
  g.today.sort(sortDesc);
  g.yesterday.sort(sortDesc);
  g.earlier.sort(sortDesc);
  return g;
}

export function NotificationsScreen() {
  const { all, loading, error } = useNotifications();
  const navigate = useNavigate();
  const [lockPreview, setLockPreview] = useState(false);

  const unread = useMemo(() => all.filter((n) => !n.readAt), [all]);
  const read = useMemo(() => all.filter((n) => n.readAt), [all]);

  const onAction = (n: Notification) => {
    // Marks read then navigates to the entity's home if a route is set.
    repo.markRead(n.id);
    if (n.action.href) navigate({ to: n.action.href });
  };

  if (error) {
    return (
      <div className="p-4">
        <ErrorState
          title="לא הצלחנו לטעון את מרכז ההתראות"
          description={error}
          action={
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              נסה שוב
            </Button>
          }
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3 p-4" aria-busy="true">
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Switch
            id="lock-preview"
            checked={lockPreview}
            onCheckedChange={setLockPreview}
          />
          <Label htmlFor="lock-preview" className="text-sm text-muted-foreground">
            תצוגת מסך נעילה (הסתרת פרטים רגישים)
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => repo.markAllRead()}
            disabled={unread.length === 0}
          >
            סימון הכל כנקרא
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/notifications/preferences">
              <Settings2 className="ms-1 h-4 w-4" aria-hidden="true" />
              העדפות
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="unread" dir="rtl">
        <TabsList>
          <TabsTrigger value="unread">
            חדשות{unread.length ? ` (${unread.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="read">נקראו</TabsTrigger>
        </TabsList>
        <TabsContent value="unread">
          <NotificationList
            list={unread}
            emptyTitle="אין התראות חדשות"
            emptyDescription="שקט. נעדכן אותך כשמשהו יזדקק לתשומת לב."
            onAction={onAction}
            lockScreenPreview={lockPreview}
          />
        </TabsContent>
        <TabsContent value="read">
          <NotificationList
            list={read}
            emptyTitle="אין התראות שנקראו"
            emptyDescription="התראות שנסמנו כנקראו יופיעו כאן."
            onAction={onAction}
            lockScreenPreview={lockPreview}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationList({
  list,
  emptyTitle,
  emptyDescription,
  onAction,
  lockScreenPreview,
}: {
  list: Notification[];
  emptyTitle: string;
  emptyDescription: string;
  onAction: (n: Notification) => void;
  lockScreenPreview: boolean;
}) {
  const groups = useMemo(() => groupByDay(list), [list]);
  const isEmpty = list.length === 0;
  if (isEmpty) {
    return (
      <EmptyState
        className="mt-4"
        icon={<Bell className="h-8 w-8" aria-hidden="true" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }
  return (
    <div className="mt-3 space-y-6">
      {(["today", "yesterday", "earlier"] as Bucket[]).map((b) =>
        groups[b].length > 0 ? (
          <section key={b} className="space-y-2">
            <SectionHeader title={BUCKET_LABEL[b]} />
            <div className="space-y-2">
              {groups[b].map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onMarkRead={(id) => repo.markRead(id)}
                  onAction={onAction}
                  lockScreenPreview={lockScreenPreview}
                />
              ))}
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}
