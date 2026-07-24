import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, SectionHeader } from "@/components/design-system";
import { useTemplates } from "@/data/templatesRepo";
import { TemplateWizard } from "./TemplateWizard";
import { Plus, Trash2 } from "lucide-react";

export function TemplateListScreen() {
  const templates = useTemplates();
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <div className="p-4 space-y-4">
      <SectionHeader
        title="תבניות משימה"
        description="הגדרות חוזרות ליצירת מופעים בזמן אמת"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/templates/trash">
                <Trash2 className="ms-1 size-4" /> סל שחזור
              </Link>
            </Button>
            <Button size="sm" onClick={() => setWizardOpen(true)}>
              <Plus className="ms-1 size-4" /> תבנית חדשה
            </Button>
          </div>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          title="אין עדיין תבניות"
          description="תבנית מגדירה מתי המשימה חוזרת ומי מעורב. אפשר להתחיל עם 'תבנית חדשה'."
          actions={<Button onClick={() => setWizardOpen(true)}>יצירת תבנית</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    <Link
                      to="/templates/$templateId"
                      params={{ templateId: t.id }}
                      className="hover:underline"
                    >
                      {t.title}
                    </Link>
                  </CardTitle>
                  {t.adultsOnly ? <Badge variant="secondary">מבוגרים בלבד</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                {t.humanRule ? <div>⏱ {t.humanRule}</div> : <div>ללא חזרה</div>}
                {t.participantMemberIds?.length ? (
                  <div>משתתפים: {t.participantMemberIds.length}</div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}
