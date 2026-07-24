import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import {
  Bell,
  Bus,
  ClipboardList,
  Coffee,
  Moon,
  ShoppingCart,
  ShieldAlert,
  Clock,
  UserPlus,
  MailCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { renderPreview, hasAction, type Notification, type NotificationCategory } from "@/domain/notification";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationCategory, ReactNode> = {
  morning_digest: <Coffee className="h-5 w-5" aria-hidden="true" />,
  evening_digest: <Moon className="h-5 w-5" aria-hidden="true" />,
  transport_reminder: <Clock className="h-5 w-5" aria-hidden="true" />,
  unassigned_transport: <UserPlus className="h-5 w-5" aria-hidden="true" />,
  pending_transport_acceptance: <MailCheck className="h-5 w-5" aria-hidden="true" />,
  overdue_task: <ClipboardList className="h-5 w-5" aria-hidden="true" />,
  follow_up_due: <ShieldAlert className="h-5 w-5" aria-hidden="true" />,
  urgent_shopping: <ShoppingCart className="h-5 w-5" aria-hidden="true" />,
};

export interface NotificationRowProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onAction?: (n: Notification) => void;
  /** When true, apply lock-screen redaction to sensitive items. */
  lockScreenPreview?: boolean;
}

export function NotificationRow({
  notification,
  onMarkRead,
  onAction,
  lockScreenPreview = false,
}: NotificationRowProps) {
  const unread = !notification.readAt;
  const preview = renderPreview(notification, lockScreenPreview ? "lock_screen" : "in_app");
  const rel = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: he,
  });

  return (
    <Card
      className={cn(
        "transition-colors",
        unread ? "border-primary/40 bg-primary/5" : "bg-card",
      )}
    >
      <CardContent className="flex items-start gap-3 p-4">
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            unread ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {ICONS[notification.category] ?? <Bell className="h-5 w-5" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">{preview.title}</h3>
            <time className="shrink-0 text-xs text-muted-foreground">{rel}</time>
          </div>
          {preview.body ? (
            <p className="mt-1 text-sm text-muted-foreground">{preview.body}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {hasAction(notification) ? (
              <Button
                size="sm"
                variant="default"
                onClick={() => onAction?.(notification)}
              >
                {notification.action.label}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">אין פעולה ישירה זמינה</span>
            )}
            {unread ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMarkRead(notification.id)}
              >
                סימון כנקראה
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
