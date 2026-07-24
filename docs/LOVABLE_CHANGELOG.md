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
