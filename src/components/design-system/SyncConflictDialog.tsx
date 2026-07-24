import * as React from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A user's deliberate choice on how to resolve a conflict.
 * There is NO fourth "silent overwrite" option — the whole point of this
 * dialog is that overwrites must be explicit.
 */
export type ConflictResolution = "keep_local" | "use_server" | "cancel";

export interface SyncConflictField {
  /** Human-readable field label (already localized). */
  label: string;
  local: React.ReactNode;
  server: React.ReactNode;
}

export interface SyncConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Entity name shown at the top ("משימה: קניות שבועיות"). */
  entityLabel: string;
  /** Server value fetched at the moment of the conflict. */
  fields: SyncConflictField[];
  /** Called with the user's explicit choice. `cancel` also fires on ESC / overlay. */
  onResolve: (choice: ConflictResolution) => void;
  /** Called when the user asks to retry syncing without choosing yet. */
  onRetry?: () => void;
  isRetrying?: boolean;
}

/**
 * Sync conflict dialog. Shows local vs server side-by-side and forces a
 * conscious choice. Closing the dialog counts as "cancel" — nothing is
 * written, nothing is discarded.
 */
export function SyncConflictDialog({
  open,
  onOpenChange,
  entityLabel,
  fields,
  onResolve,
  onRetry,
  isRetrying,
}: SyncConflictDialogProps) {
  const handleOpenChange = (next: boolean) => {
    if (!next) onResolve("cancel");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <AlertTriangle aria-hidden="true" className="size-5 text-warning-foreground" />
            <span>נמצאו שינויים סותרים</span>
          </DialogTitle>
          <DialogDescription className="text-right">
            {entityLabel} — יש הבדל בין מה ששמור אצלך למה שנמצא בשרת. בחר/י מה לשמור. לא נדרוס שום
            דבר בלי אישור מפורש.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.label} className="rounded-lg border border-border bg-surface p-3 text-sm">
              <p className="mb-2 font-medium text-foreground">{f.label}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <ValueBox tone="local" title="הערך אצלך (מקומי)" value={f.local} />
                <ValueBox tone="server" title="הערך העדכני בשרת" value={f.server} />
              </div>
            </div>
          ))}
        </div>

        <DialogFooter
          className={cn(
            "flex flex-col-reverse gap-2 sm:flex-row-reverse sm:items-center sm:justify-start",
          )}
        >
          <Button variant="default" onClick={() => onResolve("keep_local")}>
            שמור את שלי
          </Button>
          <Button variant="secondary" onClick={() => onResolve("use_server")}>
            השתמש בערך מהשרת
          </Button>
          {onRetry ? (
            <Button variant="outline" onClick={onRetry} disabled={isRetrying}>
              {isRetrying ? "מסנכרן…" : "נסה סנכרון מחדש"}
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => onResolve("cancel")}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ValueBox({
  tone,
  title,
  value,
}: {
  tone: "local" | "server";
  title: string;
  value: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-2",
        tone === "local" ? "border-primary/30 bg-primary/5" : "border-info/30 bg-info/5",
      )}
    >
      <p className="mb-1 text-xs text-muted-foreground">{title}</p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}
