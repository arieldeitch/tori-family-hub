import { useState, type FormEvent, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { t } from "@/lib/i18n";
import { householdRepo } from "@/data/householdRepo";
import type { Role } from "@/domain/household";
import { useHousehold } from "@/lib/useHousehold";

type Kind = "adult" | "child" | "guest";

interface Props {
  kind: Kind;
  trigger: ReactNode;
}

// Single form covering all member kinds. Business rules:
// - child MUST NOT require email; email is not collected here for anyone.
// - PIN capability is a flag ONLY. No PIN value is ever collected or stored.
// - Guest access window / restricted children is UX prototype only; real
//   enforcement is server-side (RLS) once backend is wired.
export function AddMemberDialog({ kind, trigger }: Props) {
  const { members } = useHousehold();
  const children = members.filter((m) => m.role === "child");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [pinEnabled, setPinEnabled] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [restrictedIds, setRestrictedIds] = useState<string[]>([]);

  function reset() {
    setName("");
    setBirthDate("");
    setPinEnabled(false);
    setStart("");
    setEnd("");
    setRestrictedIds([]);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const role: Role = kind === "adult" ? "adult" : kind === "child" ? "child" : "guest";
    householdRepo.addMember({
      name: name.trim(),
      role,
      hasLogin: kind === "adult",
      status: kind === "adult" ? "invited" : kind === "guest" ? "limited" : "active",
      birthDate: kind === "child" && birthDate ? birthDate : undefined,
      pinEnabled: kind === "child" ? pinEnabled : undefined,
      accessWindow: kind === "guest" && start && end ? { start, end } : undefined,
      restrictedToChildIds: kind === "guest" ? restrictedIds : undefined,
    });
    reset();
    setOpen(false);
  }

  const titles: Record<Kind, string> = {
    adult: t("onboarding.members.addAdult"),
    child: t("onboarding.members.addChild"),
    guest: t("onboarding.members.addGuest"),
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titles[kind]}</DialogTitle>
          <DialogDescription>{t("memberForm.prototypeOnly")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="member-name">{t("memberForm.name")}</Label>
            <Input
              id="member-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {kind === "child" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="child-bd">{t("memberForm.birthDate")}</Label>
                <Input
                  id="child-bd"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="pin-cap"
                  checked={pinEnabled}
                  onCheckedChange={(v) => setPinEnabled(v === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="pin-cap" className="cursor-pointer">
                    {t("memberForm.pinCapability")}
                  </Label>
                  <p className="text-xs text-muted-foreground">{t("memberForm.pinNote")}</p>
                </div>
              </div>
            </>
          ) : null}

          {kind === "guest" ? (
            <>
              <div className="space-y-2">
                <Label>{t("memberForm.accessWindow")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="gw-from" className="text-xs text-muted-foreground">
                      {t("memberForm.from")}
                    </Label>
                    <Input
                      id="gw-from"
                      type="date"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gw-to" className="text-xs text-muted-foreground">
                      {t("memberForm.to")}
                    </Label>
                    <Input
                      id="gw-to"
                      type="date"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {children.length > 0 ? (
                <div className="space-y-2">
                  <Label>{t("memberForm.restrictChildren")}</Label>
                  <div className="space-y-1.5">
                    {children.map((c) => {
                      const checked = restrictedIds.includes(c.id);
                      return (
                        <label key={c.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) =>
                              setRestrictedIds((prev) =>
                                v === true ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                              )
                            }
                          />
                          {c.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              {t("memberForm.cancel")}
            </Button>
            <Button type="submit">{t("memberForm.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
