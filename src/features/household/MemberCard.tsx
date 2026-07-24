import type { Member } from "@/domain/household";
import { t } from "@/lib/i18n";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, Trash2 } from "lucide-react";

interface Props {
  member: Member;
  onRemove?: (id: string) => void;
  canRemove?: boolean;
}

// Color is never the ONLY identifier: name + initials always render alongside.
export function MemberCard({ member, onRemove, canRemove }: Props) {
  return (
    <Card className="flex items-center gap-3 p-3">
      <Avatar className="h-11 w-11 shrink-0 border" style={{ borderColor: member.color }}>
        <AvatarFallback
          aria-label={member.name}
          className="text-sm font-semibold"
          style={{ backgroundColor: `${member.color}22`, color: "inherit" }}
        >
          {member.initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{member.name}</p>
          <span
            aria-hidden
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: member.color }}
          />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Badge variant="secondary" className="font-normal">
            {t(`roles.${member.role}` as const)}
          </Badge>
          <Badge variant="outline" className="font-normal">
            {t(`status.${member.status}` as const)}
          </Badge>
          <span>·</span>
          <span>{member.hasLogin ? t("household.hasLogin") : t("household.noLogin")}</span>
          {member.pinEnabled ? (
            <span className="inline-flex items-center gap-1">
              <KeyRound className="h-3 w-3" aria-hidden />
              PIN
            </span>
          ) : null}
        </div>
      </div>
      {canRemove && onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("household.remove")}
          onClick={() => onRemove(member.id)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      ) : null}
    </Card>
  );
}
