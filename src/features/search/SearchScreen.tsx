// Basic cross-module search. Read-only view of the mock repositories.
// Deliberately simple: substring match (Hebrew-friendly), grouped by module,
// with badges surfacing status / category / date / member. No advanced
// filters — advanced filtering belongs in each module's own list screen.
import { useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/design-system/EmptyState";
import { StatusBadge } from "@/components/design-system/StatusBadge";
import * as tasksRepo from "@/data/tasksRepo";
import * as errandsRepo from "@/data/errandsRepo";
import * as followUpRepo from "@/data/followUpRepo";
import { transportRepo } from "@/data/transportRepo";
import { shoppingRepo } from "@/data/shoppingRepo";
import { useHousehold } from "@/lib/useHousehold";
import { CANONICAL_MEMBERS, findMember } from "@/data/peopleDirectory";
import { STATUS_LABEL as TASK_STATUS } from "@/features/tasks/labels";
import { STATUS_LABEL as FU_STATUS } from "@/features/follow-ups/labels";
import { STATUS_LABEL as SHOP_STATUS } from "@/features/shopping/labels";

function useTasks() {
  return useSyncExternalStore(
    tasksRepo.subscribe,
    () => tasksRepo.getAll(),
    () => tasksRepo.getAll(),
  );
}
function useErrands() {
  return useSyncExternalStore(
    errandsRepo.subscribe,
    () => errandsRepo.getAll(),
    () => errandsRepo.getAll(),
  );
}
function useFollowUps() {
  return useSyncExternalStore(
    followUpRepo.subscribe,
    () => followUpRepo.getAll(),
    () => followUpRepo.getAll(),
  );
}
function useTransport() {
  return useSyncExternalStore(
    transportRepo.subscribe,
    () => transportRepo.getSnapshot(),
    () => transportRepo.getSnapshot(),
  ).rides;
}
function useShopping() {
  return useSyncExternalStore(
    shoppingRepo.subscribe,
    () => shoppingRepo.getSnapshot(),
    () => shoppingRepo.getSnapshot(),
  );
}

function match(q: string, ...fields: Array<string | null | undefined>): boolean {
  if (!q) return false;
  const needle = q.trim().toLowerCase();
  return fields.some((f) => (f ?? "").toLowerCase().includes(needle));
}

function dateShort(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
}

export function SearchScreen() {
  const [q, setQ] = useState("");
  const tasks = useTasks();
  const errands = useErrands();
  const followUps = useFollowUps();
  const rides = useTransport();
  const shopping = useShopping();
  const household = useHousehold();

  const allMembers = useMemo(
    () =>
      household.members.length > 0
        ? household.members.map((m) => ({ id: m.id, name: m.name, role: m.role }))
        : CANONICAL_MEMBERS.map((m) => ({ id: m.id, name: m.name, role: m.role })),
    [household.members],
  );
  const children = allMembers.filter((m) => m.role === "child");

  const results = useMemo(() => {
    const term = q.trim();
    if (!term) return null;

    const memberHits = allMembers.filter((m) => match(term, m.name, m.role));
    const childHits = children.filter((m) => match(term, m.name));
    const taskHits = tasks.filter((t) =>
      match(
        term,
        t.title,
        t.description,
        t.status,
        TASK_STATUS[t.status],
        dateShort(t.dueAt),
        findMember(t.assignment?.memberId)?.name,
      ),
    );
    const errandHits = errands.filter((e) =>
      match(term, e.title, e.location, e.areaLabel, e.note, dateShort(e.dueAt)),
    );
    const followUpHits = followUps.filter((f) =>
      match(
        term,
        f.title,
        f.externalParty,
        FU_STATUS[f.status],
        dateShort(f.nextFollowUpAt),
        findMember(f.responsibleMemberId)?.name,
      ),
    );
    const rideHits = rides.filter((r) =>
      match(
        term,
        r.origin,
        r.destination,
        r.status,
        dateShort(r.timeAt),
        findMember(r.childMemberId)?.name,
      ),
    );
    const shopHits = shopping.items.filter((it) =>
      match(term, it.name, it.category, it.unit, SHOP_STATUS[it.status]),
    );

    return {
      members: memberHits,
      children: childHits,
      tasks: taskHits,
      errands: errandHits,
      followUps: followUpHits,
      rides: rideHits,
      shopping: shopHits,
    };
  }, [q, allMembers, children, tasks, errands, followUps, rides, shopping.items]);

  const totalHits = results
    ? results.members.length +
      results.children.length +
      results.tasks.length +
      results.errands.length +
      results.followUps.length +
      results.rides.length +
      results.shopping.length
    : 0;

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="חיפוש: משימות, בני בית, קניות, גורם חיצוני, תאריך…"
          aria-label="שדה חיפוש"
          autoFocus
        />
      </div>

      {!results ? (
        <p className="text-sm text-muted-foreground">
          התחילו להקליד כדי לחפש במשימות, בני בית, קניות, מעקבים והסעות.
        </p>
      ) : totalHits === 0 ? (
        <EmptyState title="אין תוצאות" description={`לא נמצאו התאמות לביטוי “${q}”.`} />
      ) : (
        <div className="space-y-6">
          <Section title="בני בית" count={results.members.length}>
            {results.members.map((m) => (
              <Link
                key={m.id}
                to="/household"
                className="flex items-center justify-between rounded-md border bg-card px-3 py-2 hover:bg-muted"
              >
                <span>{m.name}</span>
                <span className="text-xs text-muted-foreground">{m.role}</span>
              </Link>
            ))}
          </Section>

          <Section title="ילדים" count={results.children.length}>
            {results.children.map((m) => (
              <Link
                key={m.id}
                to="/child"
                className="flex items-center justify-between rounded-md border bg-card px-3 py-2 hover:bg-muted"
              >
                <span>{m.name}</span>
                <span className="text-xs text-muted-foreground">תצוגת ילד</span>
              </Link>
            ))}
          </Section>

          <Section title="משימות" count={results.tasks.length}>
            {results.tasks.map((t) => (
              <Link
                key={t.id}
                to="/tasks/$taskId"
                params={{ taskId: t.id }}
                className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 hover:bg-muted"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{t.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {findMember(t.assignment?.memberId)?.name ?? "ללא אחראי"} · {dateShort(t.dueAt)}
                  </div>
                </div>
                <StatusBadge kind="neutral">{TASK_STATUS[t.status]}</StatusBadge>
              </Link>
            ))}
          </Section>

          <Section title="סידורים" count={results.errands.length}>
            {results.errands.map((e) => (
              <Link
                key={e.id}
                to="/errands/$errandId"
                params={{ errandId: e.id }}
                className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 hover:bg-muted"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{e.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {e.areaLabel || e.location || "ללא אזור"} · {dateShort(e.dueAt)}
                  </div>
                </div>
              </Link>
            ))}
          </Section>

          <Section title="מעקבים" count={results.followUps.length}>
            {results.followUps.map((f) => (
              <Link
                key={f.id}
                to="/follow-ups/$caseId"
                params={{ caseId: f.id }}
                className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 hover:bg-muted"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{f.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {f.externalParty} · {dateShort(f.nextFollowUpAt)}
                  </div>
                </div>
                <StatusBadge kind="neutral">{FU_STATUS[f.status]}</StatusBadge>
              </Link>
            ))}
          </Section>

          <Section title="הסעות" count={results.rides.length}>
            {results.rides.map((r) => (
              <Link
                key={r.id}
                to="/transport/$rideId"
                params={{ rideId: r.id }}
                className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 hover:bg-muted"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {r.origin} ← {r.destination}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {findMember(r.childMemberId)?.name ?? ""} · {dateShort(r.timeAt)}
                  </div>
                </div>
                <StatusBadge kind="neutral">{r.status}</StatusBadge>
              </Link>
            ))}
          </Section>

          <Section title="פריטי קניות" count={results.shopping.length}>
            {results.shopping.map((it) => (
              <Link
                key={it.id}
                to="/shopping/$listId"
                params={{ listId: it.listId }}
                className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 hover:bg-muted"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{it.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {it.category ?? ""} · כמות {it.quantity}
                    {it.unit ? ` ${it.unit}` : ""}
                  </div>
                </div>
                <StatusBadge kind="neutral">{SHOP_STATUS[it.status]}</StatusBadge>
              </Link>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section aria-label={title}>
      <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
        {title}
        <span className="ms-2 rounded bg-muted px-1.5 py-0.5 text-xs">{count}</span>
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
