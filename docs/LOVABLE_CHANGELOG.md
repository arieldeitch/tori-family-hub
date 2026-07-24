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
