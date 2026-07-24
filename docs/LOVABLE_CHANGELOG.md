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
