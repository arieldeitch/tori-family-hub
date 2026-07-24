import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import {
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  FamilyMemberChip,
  FormField,
  IconButton,
  MobilePageHeader,
  OfflineState,
  PermissionDeniedState,
  PersonAvatar,
  SectionHeader,
  StatusBadge,
  SyncStatusIndicator,
  type StatusKind,
  type SyncStatus,
} from "@/components/design-system";

export const Route = createFileRoute("/design-system")({
  component: DesignSystemShowcase,
  head: () => ({
    meta: [
      { title: "Design System · Tori" },
      { name: "description", content: "מפרט הרכיבים וטוקנים של Tori — פנימי." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const TOKENS = [
  { name: "background", var: "--color-background" },
  { name: "surface", var: "--color-surface" },
  { name: "foreground", var: "--color-foreground" },
  { name: "muted-foreground", var: "--color-muted-foreground" },
  { name: "border", var: "--color-border" },
  { name: "primary", var: "--color-primary" },
  { name: "ring", var: "--color-ring" },
  { name: "success", var: "--color-success" },
  { name: "warning", var: "--color-warning" },
  { name: "error", var: "--color-error" },
  { name: "info", var: "--color-info" },
  { name: "overdue", var: "--color-overdue" },
  { name: "blocked", var: "--color-blocked" },
];

const FAMILY = [
  { name: "אמא", color: "#7BA7C7", role: "owner" },
  { name: "אבא", color: "#C79A7B", role: "adult" },
  { name: "נועה", color: "#8CB48C", role: "child" },
  { name: "יובל", color: "#C77B9E", role: "child" },
  { name: "סבתא", color: "#B49B7B", role: "guest" },
];

const STATUSES: { kind: StatusKind; label: string }[] = [
  { kind: "neutral", label: "טיוטה" },
  { kind: "success", label: "בוצע" },
  { kind: "info", label: "בטיפול" },
  { kind: "warning", label: "לתשומת לב" },
  { kind: "error", label: "נכשל" },
  { kind: "overdue", label: "באיחור" },
  { kind: "blocked", label: "חסום" },
];

const SYNC_STATES: { status: SyncStatus; label: string }[] = [
  { status: "synced", label: "מסונכרן" },
  { status: "syncing", label: "מסנכרן…" },
  { status: "offline", label: "לא מקוון" },
  { status: "error", label: "שגיאת סנכרון" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 md:p-6">
      <SectionHeader title={title} as="h2" />
      <div className="mt-2">{children}</div>
    </section>
  );
}

function DesignSystemShowcase() {
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24">
      <MobilePageHeader
        title="Design System"
        subtitle="מפרט פנימי · Tori"
        trailing={<IconButton aria-label="התראות" icon={<Bell />} />}
      />

      <div className="mt-4 space-y-6">
        <Section title="Tokens">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TOKENS.map((tok) => (
              <div
                key={tok.name}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2"
              >
                <span
                  className="size-10 rounded-md border border-border"
                  style={{ backgroundColor: `var(${tok.var})` }}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{tok.name}</div>
                  <code className="text-xs text-muted-foreground">{tok.var}</code>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="צבעי בני משפחה (מוגבל)">
          <div className="flex flex-wrap gap-2">
            {FAMILY.map((m) => (
              <FamilyMemberChip key={m.name} name={m.name} color={m.color} role={m.role} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            {FAMILY.map((m) => (
              <div key={m.name} className="flex flex-col items-center gap-1">
                <PersonAvatar name={m.name} color={m.color} size="lg" />
                <span className="text-xs text-muted-foreground">{m.name}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap gap-2">
            <Button>ראשי</Button>
            <Button variant="secondary">משני</Button>
            <Button variant="outline">מסגרת</Button>
            <Button variant="ghost">רפאים</Button>
            <Button variant="destructive">מחיקה</Button>
            <Button disabled>מושבת</Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <IconButton aria-label="הוסף" icon={<Plus />} variant="default" />
            <IconButton aria-label="מחק" icon={<Trash2 />} variant="outline" />
            <IconButton aria-label="התראות" icon={<Bell />} />
          </div>
        </Section>

        <Section title="שדות טופס">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField id="ds-name" label="שם" hint="שם מלא של בן המשפחה" required>
              <Input placeholder="לדוגמה: נועה" />
            </FormField>
            <FormField id="ds-email" label="אימייל" error="כתובת לא תקינה">
              <Input type="email" defaultValue="foo@" />
            </FormField>
            <FormField id="ds-note" label="הערה" hint="עד 500 תווים" className="md:col-span-2">
              <Textarea placeholder="פרטים נוספים…" />
            </FormField>
            <FormField id="ds-role" label="תפקיד">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="בחר תפקיד" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">בעלים</SelectItem>
                  <SelectItem value="adult">מבוגר</SelectItem>
                  <SelectItem value="child">ילד</SelectItem>
                  <SelectItem value="guest">אורח/מטפל</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="ds-cb" />
                <Label htmlFor="ds-cb">אשר תנאי שימוש</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="ds-sw" />
                <Label htmlFor="ds-sw">התראות דחיפה</Label>
              </div>
              <RadioGroup defaultValue="day" className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="ds-r1" value="day" />
                  <Label htmlFor="ds-r1">יום</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="ds-r2" value="week" />
                  <Label htmlFor="ds-r2">שבוע</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </Section>

        <Section title="סטטוסים">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <StatusBadge key={s.kind} kind={s.kind}>
                {s.label}
              </StatusBadge>
            ))}
          </div>
        </Section>

        <Section title="Cards + Tabs">
          <Tabs defaultValue="today">
            <TabsList>
              <TabsTrigger value="today">היום</TabsTrigger>
              <TabsTrigger value="week">השבוע</TabsTrigger>
              <TabsTrigger value="all">הכל</TabsTrigger>
            </TabsList>
            <TabsContent value="today" className="mt-3">
              <Card>
                <CardHeader>
                  <CardTitle>קניות לסופ״ש</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-2">
                  <FamilyMemberChip name="אמא" color="#7BA7C7" />
                  <StatusBadge kind="overdue">באיחור</StatusBadge>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="week">שבוע ריק.</TabsContent>
            <TabsContent value="all">רשימה מלאה.</TabsContent>
          </Tabs>
        </Section>

        <Section title="Overlays">
          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button>פתח Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>כותרת חלון</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">גוף החלון בעברית.</p>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary">פתח Sheet</Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>מגירת RTL</SheetTitle>
                </SheetHeader>
                <p className="mt-3 text-sm text-muted-foreground">
                  המגירה נפתחת מהצד הימני, המתאים לכיוון קריאה עברי.
                </p>
              </SheetContent>
            </Sheet>

            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              אישור פעולה
            </Button>
            <ConfirmationDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              title="למחוק את הפריט?"
              description="הפעולה בלתי הפיכה."
              confirmLabel="מחק"
              cancelLabel="ביטול"
              tone="destructive"
              onConfirm={() => {
                setConfirmOpen(false);
                toast.success("נמחק");
              }}
            />

            <Button variant="outline" onClick={() => toast("הודעה קצרה")}>
              Toast
            </Button>
          </div>
        </Section>

        <Section title="States">
          <div className="grid gap-4 md:grid-cols-2">
            <EmptyState
              title="אין עדיין משימות"
              description="הוסף משימה ראשונה כדי להתחיל."
              action={<Button size="sm">הוסף משימה</Button>}
            />
            <ErrorState
              title="שגיאה בטעינה"
              description="נסה שוב בעוד רגע."
              action={
                <Button size="sm" variant="outline">
                  נסה שוב
                </Button>
              }
            />
            <PermissionDeniedState
              title="אין הרשאה"
              description="פנה למנהל משק הבית."
            />
            <OfflineState title="לא מקוון" description="השינויים ישמרו וישלחו כשהחיבור יחזור." />
          </div>
        </Section>

        <Section title="Sync + Skeleton">
          <div className="flex flex-wrap gap-3">
            {SYNC_STATES.map((s) => (
              <SyncStatusIndicator key={s.status} status={s.status} label={s.label} />
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </Section>

        <Section title="טיפוגרפיה">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">כותרת ראשית H1</h1>
            <h2 className="text-2xl font-semibold">כותרת H2</h2>
            <h3 className="text-xl font-semibold">כותרת H3</h3>
            <p className="text-base text-foreground">
              פסקה רגילה. הטקסט מוצג עם הפונט Heebo לתמיכה מיטבית בעברית.
            </p>
            <p className="text-sm text-muted-foreground">
              טקסט משני להסברים ותיאורים.
            </p>
          </div>
        </Section>
      </div>
    </main>
  );
}
