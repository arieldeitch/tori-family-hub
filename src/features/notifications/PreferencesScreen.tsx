import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/design-system/SectionHeader";
import * as repo from "@/data/notificationsRepo";
import { usePreferences } from "@/lib/useNotifications";
import type { NotificationCategory } from "@/domain/notification";

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  morning_digest: "סיכום בוקר",
  evening_digest: "סיכום ערב",
  transport_reminder: "תזכורות להסעות",
  unassigned_transport: "איסופים ללא אחראי",
  pending_transport_acceptance: "בקשות שיבוץ ממתינות",
  overdue_task: "משימות באיחור",
  follow_up_due: "מעקבים שהגיע זמנם",
  urgent_shopping: "קניות דחופות",
};

export function PreferencesScreen() {
  const prefs = usePreferences();

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/notifications">
            <ArrowRight className="ms-1 h-4 w-4" aria-hidden="true" />
            חזרה למרכז ההתראות
          </Link>
        </Button>
      </div>

      <section className="space-y-2">
        <SectionHeader
          title="קטגוריות"
          description="כיבוי קטגוריה יעצור את כל ההתראות מסוג זה."
        />
        <Card>
          <CardContent className="divide-y p-0">
            {(Object.keys(CATEGORY_LABEL) as NotificationCategory[]).map((c) => (
              <div key={c} className="flex items-center justify-between gap-3 px-4 py-3">
                <Label htmlFor={`cat-${c}`} className="text-sm">
                  {CATEGORY_LABEL[c]}
                </Label>
                <Switch
                  id={`cat-${c}`}
                  checked={prefs.categoryEnabled[c]}
                  onCheckedChange={(v) =>
                    repo.updatePreferences({
                      categoryEnabled: { ...prefs.categoryEnabled, [c]: v },
                    })
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-2">
        <SectionHeader
          title="שעות שקטות"
          description="במהלך החלון הזה נשקיט התראות. סיכומי בוקר וערב עדיין יגיעו במועדם."
        />
        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
            <div className="flex items-center justify-between gap-3 sm:col-span-3">
              <Label htmlFor="qh-enabled" className="text-sm">
                הפעלה
              </Label>
              <Switch
                id="qh-enabled"
                checked={prefs.quietHours.enabled}
                onCheckedChange={(v) =>
                  repo.updatePreferences({
                    quietHours: { ...prefs.quietHours, enabled: v },
                  })
                }
              />
            </div>
            <TimeField
              id="qh-start"
              label="התחלה"
              value={prefs.quietHours.startHHMM}
              onChange={(v) =>
                repo.updatePreferences({
                  quietHours: { ...prefs.quietHours, startHHMM: v },
                })
              }
            />
            <TimeField
              id="qh-end"
              label="סיום"
              value={prefs.quietHours.endHHMM}
              onChange={(v) =>
                repo.updatePreferences({
                  quietHours: { ...prefs.quietHours, endHHMM: v },
                })
              }
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-2">
        <SectionHeader title="סיכומים יומיים" />
        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
            <TimeField
              id="morning"
              label="סיכום בוקר בשעה"
              value={prefs.morningDigestHHMM}
              onChange={(v) => repo.updatePreferences({ morningDigestHHMM: v })}
            />
            <TimeField
              id="evening"
              label="סיכום ערב בשעה"
              value={prefs.eveningDigestHHMM}
              onChange={(v) => repo.updatePreferences({ eveningDigestHHMM: v })}
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-2">
        <SectionHeader title="תזכורות להסעות" />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">מרחק זמן מהאיסוף</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="offset" className="text-sm">
                דקות לפני האיסוף
              </Label>
              <Input
                id="offset"
                type="number"
                min={0}
                max={240}
                value={prefs.transportReminderOffsetMinutes}
                onChange={(e) =>
                  repo.updatePreferences({
                    transportReminderOffsetMinutes: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-2">
        <SectionHeader
          title="הסלמה למשפחה"
          description="אם לא ניתנה תגובה לאחר זמן מה, נעדכן שותפ/ה או את שאר בני הבית."
        />
        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 sm:col-span-2">
              <Label htmlFor="esc-enabled" className="text-sm">
                הפעלה
              </Label>
              <Switch
                id="esc-enabled"
                checked={prefs.familyEscalation.enabled}
                onCheckedChange={(v) =>
                  repo.updatePreferences({
                    familyEscalation: { ...prefs.familyEscalation, enabled: v },
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="esc-delay" className="text-sm">
                המתנה בכל שלב (דקות)
              </Label>
              <Input
                id="esc-delay"
                type="number"
                min={1}
                max={240}
                disabled={!prefs.familyEscalation.enabled}
                value={prefs.familyEscalation.stageDelayMinutes}
                onChange={(e) =>
                  repo.updatePreferences({
                    familyEscalation: {
                      ...prefs.familyEscalation,
                      stageDelayMinutes: Math.max(1, Number(e.target.value) || 1),
                    },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground">
        הערה: מרכז ההתראות בשלב זה הוא הדגמה בזיכרון בלבד — אין push, worker, אימייל או SMS.
      </p>
    </div>
  );
}

function TimeField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <Input
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir="ltr"
        className="text-start"
      />
    </div>
  );
}
