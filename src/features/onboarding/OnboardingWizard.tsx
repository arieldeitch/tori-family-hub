import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { t } from "@/lib/i18n";
import { householdRepo } from "@/data/householdRepo";
import { useHousehold } from "@/lib/useHousehold";
import { MemberCard } from "@/features/household/MemberCard";
import { AddMemberDialog } from "@/features/household/AddMemberDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STEPS = ["welcome", "name", "tz", "owner", "members", "summary"] as const;
type Step = (typeof STEPS)[number];

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { household, members } = useHousehold();
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Jerusalem");
  const [locale, setLocale] = useState("he-IL");
  const [ownerName, setOwnerName] = useState("");

  const idx = STEPS.indexOf(step);
  const progress = ((idx + 1) / STEPS.length) * 100;

  function next() {
    setStep(STEPS[Math.min(idx + 1, STEPS.length - 1)]!);
  }
  function back() {
    setStep(STEPS[Math.max(idx - 1, 0)]!);
  }

  function commitHousehold() {
    if (!household) {
      householdRepo.createHousehold({ name: name.trim() || "בית", timezone, locale });
    }
  }
  function commitOwner() {
    if (!members.some((m) => m.role === "owner") && ownerName.trim()) {
      householdRepo.addMember({ name: ownerName.trim(), role: "owner", status: "active" });
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 py-8">
      <header className="mb-6">
        <p className="text-xs text-muted-foreground">
          {t("onboarding.step")} {idx + 1} {t("onboarding.of")} {STEPS.length}
        </p>
        <Progress value={progress} className="mt-2 h-1.5" />
      </header>

      <main className="flex-1">
        {step === "welcome" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold">{t("onboarding.welcome.title")}</h1>
            <p className="text-muted-foreground">{t("onboarding.welcome.body")}</p>
            <Button onClick={next} className="w-full">
              {t("onboarding.welcome.cta")}
            </Button>
          </div>
        )}

        {step === "name" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold">{t("onboarding.householdName.title")}</h1>
            <div className="space-y-2">
              <Label htmlFor="hh-name">{t("onboarding.householdName.title")}</Label>
              <Input
                id="hh-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("onboarding.householdName.placeholder")}
                autoFocus
              />
            </div>
          </div>
        )}

        {step === "tz" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold">{t("onboarding.tzLocale.title")}</h1>
            <div className="space-y-2">
              <Label htmlFor="tz">{t("onboarding.tzLocale.timezone")}</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="tz">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Jerusalem">Asia/Jerusalem</SelectItem>
                  <SelectItem value="Europe/London">Europe/London</SelectItem>
                  <SelectItem value="America/New_York">America/New_York</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc">{t("onboarding.tzLocale.locale")}</Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger id="loc">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="he-IL">עברית (ישראל)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === "owner" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold">{t("onboarding.owner.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("onboarding.owner.subtitle")}</p>
            <div className="space-y-2">
              <Label htmlFor="owner">{t("memberForm.name")}</Label>
              <Input
                id="owner"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder={t("onboarding.owner.namePlaceholder")}
                autoFocus
              />
            </div>
          </div>
        )}

        {step === "members" && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold">{t("onboarding.members.title")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("onboarding.members.subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AddMemberDialog
                kind="adult"
                trigger={<Button variant="secondary">{t("onboarding.members.addAdult")}</Button>}
              />
              <AddMemberDialog
                kind="child"
                trigger={<Button variant="secondary">{t("onboarding.members.addChild")}</Button>}
              />
              <AddMemberDialog
                kind="guest"
                trigger={<Button variant="secondary">{t("onboarding.members.addGuest")}</Button>}
              />
            </div>
            <div className="space-y-2">
              {members.filter((m) => m.role !== "owner").length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("onboarding.members.empty")}</p>
              ) : (
                members
                  .filter((m) => m.role !== "owner")
                  .map((m) => <MemberCard key={m.id} member={m} />)
              )}
            </div>
          </div>
        )}

        {step === "summary" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold">{t("onboarding.summary.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("onboarding.summary.subtitle")}</p>
            <Card className="space-y-2 p-4 text-sm">
              <div>
                <span className="text-muted-foreground">שם הבית:</span>{" "}
                <b>{household?.name ?? name}</b>
              </div>
              <div>
                <span className="text-muted-foreground">אזור זמן:</span>{" "}
                {household?.timezone ?? timezone}
              </div>
              <div>
                <span className="text-muted-foreground">שפה:</span> {household?.locale ?? locale}
              </div>
              <div>
                <span className="text-muted-foreground">בני בית:</span> {members.length}
              </div>
            </Card>
          </div>
        )}
      </main>

      <footer className="mt-6 flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={back} disabled={idx === 0}>
          {t("onboarding.back")}
        </Button>
        <div className="flex gap-2">
          {step === "members" ? (
            <Button variant="ghost" onClick={next}>
              {t("onboarding.skip")}
            </Button>
          ) : null}
          {step === "summary" ? (
            <Button onClick={() => navigate({ to: "/household" })}>{t("onboarding.finish")}</Button>
          ) : (
            <Button
              onClick={() => {
                if (step === "name") commitHousehold();
                if (step === "tz") commitHousehold();
                if (step === "owner") commitOwner();
                next();
              }}
              disabled={
                (step === "name" && !name.trim()) || (step === "owner" && !ownerName.trim())
              }
            >
              {t("onboarding.next")}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
