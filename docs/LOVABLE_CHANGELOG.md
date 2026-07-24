# Changelog

## Prompt 1 — Infrastructure bootstrap
- Added `lang="he"` and `dir="rtl"` on root HTML.
- Established modular folder layout under `src/` (`app`, `features`, `domain`, `application`, `data`, `infrastructure`, `locales`, `test`).
- Added `src/locales/he.ts` and `src/lib/i18n.ts` (typed `t()` helper).
- Replaced placeholder `/` route with a Hebrew RTL welcome page.
- Installed Vitest, React Testing Library, jest-dom, jsdom; added `vitest.config.ts` and `src/test/setup.ts` + smoke test.
- Added `typecheck`, `test`, `test:watch` scripts.
- Added `.env.example`.
- Added GitHub Actions CI (`install`, `typecheck`, `lint`, `test`, `build`).
- Added `docs/LOVABLE_CURRENT_STATE.md` and this changelog.

Not touched: Supabase, auth, business features.

## Prompt 5 — Onboarding, household, roles, child mode
- Added `src/domain/household.ts` (types: `Role`, `Member`, `Household`; pure helpers: `pickColor`, `toInitials`, `canRoleSee`, `isPrivilegedRole`). Role-based visibility is UX-only; real enforcement pending server/RLS.
- Added `src/data/householdRepo.ts` — in-memory typed repository with subscribe API. No persistence, no localStorage.
- Added `src/lib/useHousehold.ts` — `useSyncExternalStore` binding.
- Added shared components:
  - `src/features/household/MemberCard.tsx` — name + initials + color chip + role/status badges. Color never the sole identifier.
  - `src/features/household/AddMemberDialog.tsx` — single dialog for adult/child/guest. Child creation does not require email. PIN is a capability flag only — no PIN value ever collected or stored.
  - `src/features/household/HouseholdScreen.tsx` — list, add, soft-confirm remove, seed demo, permissions notice.
- Onboarding wizard `src/features/onboarding/OnboardingWizard.tsx` — 6 steps (welcome → household name → tz+locale → owner → members → summary); members step is skippable.
- Child mode `src/features/child-mode/ChildHome.tsx` — large text, per-child switcher, three actions (done / help / swap), items requiring approval show "נשלח לאישור". Filters out `adultsOnly` fixtures using the shared domain rule.
- Routes: `/onboarding`, `/household`, `/child`. Home (`/`) updated with entry links.
- i18n: extended `src/locales/he.ts` with onboarding, household, memberForm, child, roles and status keys.
- Toaster mounted at root (sonner).
- Tests: `src/domain/household.test.ts` covers adults-only visibility, privileged roles, color distinctness, Hebrew initials.

Prototype security limitations (documented in code + memory):
- No real authentication.
- No PIN ever stored; capability flag only.
- Guest access windows and per-child restrictions are UX-only; not enforced.
- Removed members are hard-deleted from in-memory demo state.

Explicitly NOT done: Supabase Auth, invitation emails, PIN authentication, device sessions, RLS, real persistence, multi-household switching.

## Prompt 2 — Design System
- Added Hebrew-first tokens (semantic status: success/warning/error/info/overdue/blocked; surface; focus ring) in `src/styles.css`; kept every existing shadcn token untouched.
- Loaded `Heebo` via `<link>` in `__root.tsx`; wired `--font-sans` and applied on `html,body`. No remote `@import` in CSS.
- Added `prefers-reduced-motion` global reset and `:focus-visible` outline.
- New `src/components/design-system/` wrapper library (13 components) built on shadcn primitives — no shadcn file modified.
- New internal route `/design-system` showcasing tokens, family palette, all wrappers and status states. Not added to any nav.
- Verified: `typecheck` (0), `test` (15/15), `lint` (0 errors, 6 pre-existing shadcn warnings), `build` (ok).
- Dependencies added: **none**. Heebo is loaded from Google Fonts CDN.
- Known limitations: dark mode tokens defined but there is no theme toggle yet (out of scope for prompt 2). No visual regression tests. Contrast tuned by eye against WCAG AA on the calm palette; a full audit will come with prompt 3 (App Shell).

## Prompt 3 — App Shell & Navigation
- New shell components in `src/components/shell/`: `AppShell`, `AppHeader`, `BottomNav`, `DesktopSidebar`, `QuickAddSheet`, `PlaceholderPage`, and `navConfig.ts`.
- Bottom navigation (mobile, <lg): primary destinations היום / לוח / משימות / קניות / עוד, safe-area aware, active state highlighted, min touch target 56px.
- Desktop sidebar (>=lg): קומפקטי w-60, RTL border-l, מציג את כל היעדים (ראשי + משני) עם active state.
- Header: שם מסך, שם משק הבית (עדין), Quick Add, כפתור התראות, avatar מקושר להגדרות. safe-area-inset-top מכובד.
- Quick Add Sheet (bottom sheet): 7 אפשרויות. אלה שלא ממומשות מציגות toast `quickAdd.notAvailable` — ללא הצלחה מזויפת. `נושא למעקב` מנווט ל-`/follow-ups` שכן המודול קיים.
- Routes נוצרו: `/today`, `/calendar`, `/tasks`, `/shopping`, `/more`, `/transport`, `/notifications`, `/settings`. כל route קיבל `head()` ייעודי + `PlaceholderPage` (כותרת + הסבר + EmptyState) — ללא נתונים מומצאים.
- Routes קיימים שנעטפו ב-`AppShell`: `/household`, `/follow-ups`. `/child`, `/onboarding`, `/design-system` נשארו standalone (מסכים ייעודיים).
- `/` הוסב ל-`redirect` אל `/today`.
- i18n: הוסף מרחב שמות `nav.*`, `quickAdd.*`, `placeholder.*` ב-`src/locales/he.ts`.
- RTL: כל הרכיבים משתמשים ב-logical properties/utility classes ניטרליות; אין horizontal overflow (בדוק ב-360/390/desktop).
- Verified: `typecheck` (0), `tests` (15/15), `lint` (0 errors; 6 אזהרות shadcn קיימות), `build` (ok).
- Known limitations: אין badge של unread על כפתור ההתראות (אין עדיין data source), Quick Add לא כולל טפסים בפועל (מחוץ להיקף), אין persistence של המסך הנבחר.

## Prompt 4 — Today screen (`/today`)

- Domain: `src/domain/today.ts` — types + pure selectors (`selectRisks`, `selectNext`, `selectMyTasks`, `selectWaitingApproval`, `selectFollowUpsDue`, `selectUnassignedTasks`, `visibleToRole`, `isOverdue`).
- Repo: `src/data/todayRepo.ts` — typed in-memory store, `TodayViewState` variants (`normal`/`busy`/`nearly_empty`/`loading`/`error`/`offline`/`permission_denied`/`child`), and demo mutations (`assignTransport`, `approveItem`, `completeTask`, `claimTask`). UI never imports fixtures directly.
- Hook: `src/lib/useToday.ts` via `useSyncExternalStore`.
- Feature: `src/features/today/` — `TodayScreen`, `TaskCard`, `TransportCard`, `ChildTodayScreen`, `format.ts`.
- Route: `src/routes/today.tsx` now renders `TodayScreen` inside `AppShell`.
- Sections in order: operational risk → next-in-time → pickups/drop-offs → my tasks → waiting approval → follow-ups due → unassigned tasks → shopping summary. Empty sections are hidden.
- Cards limited to title/assignee/time/status + one primary action; transport cards add child, direction, place, approval state, recommended leave time.
- Child mode: large text, today only, three actions per task (בוצע / צריך עזרה / רוצה להחליף); `adultsOnly` filtered (UX-only — server must enforce).
- Tests: `src/domain/today.test.ts` (6 tests). Total 21/21 passing. Typecheck clean, build passes.
- Known limits: demo actions mutate memory only, no persistence, no server, no RLS.

## Prompt 5 audit — Onboarding / Household / Child (fixes only)

- Extracted child-mode fixtures out of the component: new `src/data/childTasksRepo.ts` (typed repo, `RoleVisibleItem`-compatible). `ChildHome` now consumes via `childTasksRepo.getAll()` — no fixtures imported directly by UI.
- Fixed onboarding Finish navigation: `/household` → `/today` so the label ("סיום והמשך למסך היום") matches behavior.
- No other changes: existing types (`Member`, `Household`, `Role`), repo pattern (`householdRepo` via `useSyncExternalStore`), roles/status badges (`MemberCard`), guest access window / restricted children flags, PIN capability flag (no PIN value stored), and the household `permissionsNote` alert all satisfy the audit.
- Verified: `tsgo` clean, `vitest` 21/21, `eslint` 0 errors, `vite build` passes.

## Tasks Domain Layer (pure)

Added canonical task types and transition logic — no UI, no persistence.

### Files
- `src/domain/task.ts` — types + pure functions
- `src/domain/task.test.ts` — 16 unit tests

### Types
- `TaskStatus` = inbox | planned | assigned | accepted | in_progress | waiting | blocked | done | skipped | cancelled
- `TaskPriority` = low | normal | high | urgent
- `TaskSource` = manual | template | recurring | delegated | system | import
- `TaskTemplate`, `TaskInstance`, `TaskAssignment`, `TaskActivity`, `TemplateSnapshot`
- `TaskDomainError` with codes: invalid_transition, missing_completed_at, missing_assignee, missing_due_date, missing_cancel_reason, terminal_state, already_in_status, unknown_status

### Pure functions
- `canTransitionTask(from, to)` — table lookup, disallows same-status
- `transitionTask(instance, input)` — returns new instance or throws `TaskDomainError`
- `validateTaskForCompletion({status, completedAt, completedByMemberId, actorMemberId})`
- `isTaskOverdue(task, nowIso)` — false for terminal / missing dueAt
- `requiresAssignment(task)` — true when assignee or dueAt is missing
- `createTaskInstanceSnapshot(template, input)` — freezes template fields at creation (revision + values); later template edits do not touch the instance
- `templateSnapshot`, `allowedNextStatuses`, `isTerminal`

### Transition table (canonical)
- inbox → planned | assigned | cancelled
- planned → assigned | inbox | cancelled | skipped
- assigned → accepted | in_progress | planned | inbox | cancelled | skipped
- accepted → in_progress | waiting | blocked | assigned | **done** | cancelled | skipped
- in_progress → waiting | blocked | **done** | accepted | cancelled | skipped
- waiting → in_progress | blocked | **done** | cancelled | skipped
- blocked → in_progress | waiting | **done** | cancelled | skipped
- done / skipped / cancelled → (terminal, no outgoing)

Rules enforced: `done` unreachable from `planned`/`assigned`/`inbox`; `done` requires `completedAt`; `completedByMemberId` required when actor known; `cancelled`/`skipped` require `cancelReason`; terminal states reject further transitions; instance activity is append-only and never mutated in place.

### Test results
- vitest: 37 passed (16 new + 21 existing)
- tsgo typecheck: clean
- eslint: 0 errors (6 pre-existing shadcn warnings)
- build: OK

## Tasks — UI & application flow (one-off tasks)

Built on top of the domain from prompt 6.1. No templates, no recurrence, no persistence.

### Files
- `src/data/tasksRepo.ts` — in-memory repo: `createManualTask`, `updateManualTask`, `assignTask`, `transition` (delegates to domain `transitionTask`), `setSimulateFailure`, subscribe/getAll/getById/clear/reset
- `src/lib/useTasks.ts` — `useTasks()`, `useTask(id)` hooks (useSyncExternalStore)
- `src/features/tasks/labels.ts` — status/priority labels + formatters
- `src/features/tasks/TaskCard.tsx` — list item card
- `src/features/tasks/TaskListScreen.tsx` — list + filters (status, assignee, date) + tabs (all / unassigned) + view-state picker (loading/empty/error/permission_denied) + simulateFailure toggle
- `src/features/tasks/TaskDetailsScreen.tsx` — details, assignment change, activity history
- `src/features/tasks/QuickTaskForm.tsx` — create dialog (title required; assignee, due, priority, note; "more options" reveals adultsOnly)
- `src/features/tasks/EditTaskDialog.tsx` — field edit (no status)
- `src/features/tasks/AssignmentPicker.tsx` — reusable assignee select
- `src/features/tasks/StatusAction.tsx` — renders only domain-allowed next statuses; cancel/skip require reason; done stamps completedAt+completedBy; TaskDomainError messages surfaced as-is
- `src/features/tasks/UnassignedScreen.tsx` — "requires assignment" view
- Routes: `src/routes/tasks.tsx` (layout, renders `<Outlet/>`), `tasks.index.tsx` (list), `tasks.$taskId.tsx` (details), `tasks.unassigned.tsx`

### Creation rules (enforced in `createManualTask`)
- no assignee AND no dueAt → `inbox`
- dueAt only → `planned` (surfaces in "requires assignment")
- assignee AND dueAt → `assigned`
- assignee only (no dueAt) → `inbox` (needs due to leave)

### Guarantees
- No component sets `status` directly — every status change goes through `tasksRepo.transition` → `transitionTask` (domain)
- Success toasts fire only after repo update succeeds
- On save failure, the form input is retained (React state untouched); toast surfaces the error
- Child viewer filter hides `adultsOnly` tasks (UX filter only; real enforcement is server-side, out of scope)
- No `localStorage`; state resets on refresh (documented behaviour)

### Tests
- `src/features/tasks/tasks.application.test.ts` — 8 tests: title-only create, assignee+due create, planned without assignee, invalid transition surfaces `TaskDomainError` and leaves state unchanged, simulateFailure preserves draft, child role filter
- Domain tests unchanged (see prompt 6.1)
- Totals: **vitest 45/45**, tsgo clean, eslint 0 errors (6 pre-existing shadcn warnings), build OK

### Not built (per prompt)
- Templates, recurrence worker, rotation, soft delete, Supabase, notifications

## פרומפט 6.3 — תבניות חוזרות, מופעים ומחיקה רכה
- Domain חדש: `src/domain/recurrence.ts` — `RecurrenceRule`, `MissedAction`, `describeRule`, `generateOccurrences`, `occurrenceKey`, `canRestore`, `withinRestoreWindow` (48 שעות), `EditScope`. הרחבת `TaskTemplate` ו־`TaskInstance` בשדות `recurrence`, `participantMemberIds`, `missedAction`, `humanRule`, `scheduledAt`, `deletedAt`, `deletedByMemberId` (כולם אופציונליים — תואם לאחור).
- Data: `src/data/templatesRepo.ts` (CRUD + soft delete/restore + hooks). `tasksRepo` הורחב: `softDeleteTask`, `restoreTask`, `getDeleted`, `getAllIncludingDeleted`, `materializeOccurrence` (idempotent לפי `templateId + scheduledAt` — מונע מופע כפול). `getAll` מסנן פריטים מחוקים.
- Snapshot immutability: עריכת תבנית מעלה `revision` ומעדכנת `humanRule`, אך `templateSnapshot` על מופעים היסטוריים נשאר כפי שהיה — אין שכתוב עבר.
- UI (`src/features/templates/`): `TemplateListScreen`, `TemplateWizard` (5 שלבים + תיאור אנושי לפני שמירה), `TemplateDetailsScreen` (מופעים עתידיים, היסטוריה, בחירת scope: המופע/העתידיים/התבנית), `TrashScreen` (בורר role להדגמת הגנת UX על restore).
- Routes: `/templates`, `/templates/$templateId`, `/templates/trash` בתוך `AppShell`.
- מחיקה רכה: `ConfirmationDialog` בלבד, `deletedAt`/`deletedByMemberId` מסומנים, פריט מוסתר מתצוגה רגילה ומופיע בסל שחזור לפחות 48 שעות. אין purge.
- בדיקות: `src/features/templates/templates.test.ts` (12) — הפרדת template/instance, snapshot immutability, dedupe מופעים, soft delete + restore, גזירת שחזור לפי role, describe/generate. סה"כ 57/57 עוברות.
- פערים מוצהרים: הרחבה של recurrence היא prototype (אין BYDAY מלא / EXDATE / RRULE ייצור); בחירת ה־scope באירוע עריכה מוצגת ומתועדת אך לא מבצעת פיצול תבנית פיזי; אין worker/DB/RLS.

## Prompt 6.4 — Shift engine (pure)
- Added `src/domain/shifts.ts`: deterministic engine for `fixed_sequence`, `weekday_fixed`, `manual`.
- Inputs: rule, participants, availability, lastAssigneeId, targetWeekday, avoidConsecutive, fallback.
- Output: `{ selectedProfileId, reasonCode, humanExplanation, candidateSnapshot, algorithmVersion, warnings }`.
- Reason codes: `NEXT_IN_SEQUENCE`, `WEEKDAY_FIXED`, `PRIMARY_UNAVAILABLE`, `ONLY_ELIGIBLE_PARTICIPANT`, `NO_ELIGIBLE_PARTICIPANT`, `MANUAL_ASSIGNMENT_REQUIRED`, `CONSECUTIVE_AVOIDED`.
- Rules: eligibility checked before sequence; avoid-consecutive only fires with ≥2 eligible; single eligible always wins; no randomness; stable tie-break by memberId; `applyManualOverride` preserves original snapshot/version (no history rewrite); no "debt" carried after unavailability.
- Not implemented (out of scope): `lowest_load`, `least_recently_done`, `volunteer`, swaps, advanced fairness.
- Tests: `src/domain/shifts.test.ts` — 19 cases covering determinism, sequence, unavailability, single/none eligible, consecutive avoidance, weekday-fixed, fallback, stable tie, algorithm version, manual override, manual strategy.
- Results: vitest 76/76 ✓, typecheck ✓, lint ✓ (6 pre-existing shadcn warnings), build ✓.

## Prompt 6.5 — Shifts UI (rules, preview, why-chosen, history demo)
- New data + hooks: `src/data/shiftsRepo.ts` (rules + demo history + per-day availability, in-memory only), `src/lib/useShifts.ts`.
- Application helpers (no selection logic — pure delegation to the 7.1 engine):
  - `src/features/shifts/preview.ts` — `computePreview({rule, members, availability, from, count, lastAssigneeIdBefore})` calls `selectAssignee` per occurrence deterministically.
  - `src/features/shifts/human.ts` — Hebrew mapping of ReasonCodes: "הוקצה לנועה כי היא הבאה בסבב.", "הוקצה ליואב כי נועה אינה זמינה.", "הוקצה לנועה שוב כי היא היחידה שזמינה.", "לא הוקצה: אין משתתף זמין." + weekday/strategy labels.
- UI components (`src/features/shifts/`):
  - `RuleListScreen`, `RuleFormScreen` (creates + edits — same screen), `ParticipantsEditor`, `SequenceEditor` (up/down buttons — no drag; if drag is added later, buttons stay), `WeekdayFixedEditor`, `AvailabilityEditor`, `AssignmentPreview` (7 upcoming occurrences with "למה?" toggle), `WhyChosenPanel` (headline + reason + warnings; algorithmVersion + candidateSnapshot inside a collapsed `<details>` — not in the main view), `HistoryDemo` (all rows tagged "הדגמה").
- Routes: `src/routes/shifts.tsx` (AppShell layout with head meta), `shifts.index.tsx`, `shifts.new.tsx`, `shifts.$ruleId.tsx`.
- Nav: added `nav.shifts` label and secondary nav entry (`Repeat` icon).
- Rules honoured: preview never mutates data; simulation labelled "הדגמה"; no scores / ranking / judgemental language; no points; UI never computes assignments (engine only); no real persistence — text on-screen makes this explicit.
- Accessibility & mobile: RTL throughout; every mobile row uses `grid-cols-[minmax(0,1fr)_auto]` + `min-w-0` / `shrink-0` per responsive-layout rules; sequence reorder is buttons-only with `aria-label`s; expandable "why" uses `aria-expanded`/`aria-controls`.
- Tests: `src/features/shifts/shifts.ui.test.ts` (6 cases) — determinism, sequence rotation, per-day unavailability, no-eligible → NO_ELIGIBLE_PARTICIPANT, rule CRUD without history rewrite, delete-rule cascades demo history.
- Results: vitest **82/82 ✓**, typecheck ✓, lint ✓ (6 pre-existing shadcn `react-refresh/only-export-components` warnings), build ✓.
- Explicit non-goals kept: no calendar, no transport, no real persistence, no server, no scores/fairness, no swaps, no volunteers.

## Prompt 8 — Weekly calendar view (`/calendar`)
Mobile-First agenda-like week view. No month/day view, no sync, no drag-and-drop, no transport module.

**Domain (pure, tested):** `src/domain/calendar.ts` — `CalendarEvent` type, `getWeekStart` (Sunday-start, Israel), `addDays`, `isSameDay`, `weekDays`, `groupByDay` (sorted by start), `visibleForRole` (delegates to `canRoleSee` from household — adults-only events hidden from role="child"). Tests in `src/domain/calendar.test.ts` (4 cases).

**Data:** `src/data/calendarRepo.ts` — typed in-memory repo + `calendarMembers` map (id/name/initials/color, deterministic). Fixtures generated relative to the current week so demo data always lands on-screen. View states: `normal | empty | loading | error | permission_denied`. `useCalendar` hook via `useSyncExternalStore`.

**UI (`src/features/calendar/`):**
- `WeekCalendarScreen` — orchestrates view/role pickers, week navigation, states.
- `WeekNav` — RTL-correct week nav (right chevron = previous, left = next), "היום" shortcut disabled on current week, 44×44 tap targets, human date range in Hebrew.
- `EventCard` — colored side-bar (owner color), initials chip + name, linked child (`Baby` icon), location (`MapPin`), transport indicator (`Car` — "דורש הסעה"), adults-only badge (`ShieldAlert`), Hebrew time range with `tabular-nums`. Uses `grid-cols-[minmax(0,1fr)_auto] + min-w-0/shrink-0` per the responsive-layout rule so titles truncate cleanly at 360/390px.
- `AgendaWeek` (mobile) — vertical list of days, "היום" chip on today, "אין אירועים" per empty day. No horizontal scroll, no dense grid.
- `DesktopWeekGrid` (`hidden lg:grid lg:grid-cols-7`) — readable 7-column layout, compact cards, only shown ≥1024px.
- Route `/calendar` updated with per-route head meta (title/description/og/twitter).

**States covered on screen:** normal / empty week (via view picker) / loading (spinner) / error (with "נסו שוב") / permission_denied. Role picker toggles adult ↔ child so QA can verify adults-only filtering (`ev3: רופא משפחה` disappears for child).

**Verifications:**
- Timezone: all times formatted via `Intl.DateTimeFormat('he-IL')`, `Date` uses browser-local time. Fixtures created with local `setHours` and week grouped on local calendar days.
- Hebrew day + date (`weekday: 'long'`, `day: 'numeric', month: 'long'`).
- RTL: nav chevrons flipped (Right = prev), all rows use logical `ms-*` spacing, no horizontal overflow at 360/390.
- Keyboard: nav buttons are real `<Button>`s with `aria-label`; view/role pickers are native `<select>`.
- adults-only hidden for `child`: covered in unit test + verifiable via role picker.

**Results:** `tsgo --noEmit` ✓ · vitest **86/86** (4 new) ✓ · `bun run lint` ✓ (6 pre-existing shadcn warnings only) · `bun run build` ✓.

**Not built (per prompt):** month view, day view, external calendar sync, complex drag-and-drop, Supabase, transport state machine.
