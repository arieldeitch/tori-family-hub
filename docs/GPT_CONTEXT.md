# Tori — GPT Context

## 1. Purpose of this file

- מסמך context מרוכז לפתיחת שיחת GPT חדשה: לצרף קובץ אחד בלבד ולהמשיך לנהל את הפרויקט ללא אובדן הקשר.
- **אינו מחליף את ה־PRD** ([`01-product-requirements.md`](./01-product-requirements.md)) ואינו משכפל אותו — הוא מפנה אליו.
- במקרה של סתירה, **המסמכים הקנוניים גוברים** (ובראשם ה־PRD). מצב Git/CI/גרסאות נלקח מהריפו ומ־GitHub בפועל, לא מקובץ זה.

## 2. Project identity

- **Tori** — Family Operations Hub.
- הבטחה מוצרית: **"הבית יודע מי עושה מה"**.
- **עברית** ו־**RTL** מהיום הראשון.
- **Today screen** הוא מרכז המוצר.

## 3. Product principles that must not be lost

תמצית (הפירוט המחייב ב־[`01-product-requirements.md`](./01-product-requirements.md)):

- **Template ו־instance נפרדים**; עריכת template אינה משנה מופעים היסטוריים.
- כל פריט פעיל צריך **אחריות מפורשת**, מועד או מנגנון מעקב; פריט ללא אחראי → "דורש הקצאה".
- **Rotation דטרמיניסטי, מוסבר ו־versioned**; date-only logic אינו תלוי ב־timezone.
- **Transport (איסופים/הורדות) הוא מודול עצמאי**.
- `waiting_external` **מחייב** `next_follow_up_at` או `follow_up_disabled_reason`.
- **Soft delete** עם לפחות **48 שעות שחזור**.
- **PostgreSQL הוא מקור האמת**; `localStorage` אינו מקור אמת.
- **הרשאות נאכפות בשרת וב־RLS**; הסתרת כפתור אינה authorization.
- **child PIN אינו Auth מלא** — הוא גישה מוגבלת קצרת־טווח.
- **אין success לפני persistence** אמיתי.
- **Mobile First, RTL ונגישות** (WCAG 2.2 AA ככל האפשר).

## 4. Canonical source-of-truth map

| תחום | מסמך | תפקיד |
| --- | --- | --- |
| Index | [`00-knowledge-pack-readme.md`](./00-knowledge-pack-readme.md) | מפת ה־Knowledge Pack + היררכיית מקורות אמת |
| **PRD** | [`01-product-requirements.md`](./01-product-requirements.md) | **מקור האמת העסקי היחיד** |
| UX/UI | [`02-ux-ui-guidelines.md`](./02-ux-ui-guidelines.md) | UX ו־UI |
| Architecture | [`03-architecture.md`](./03-architecture.md) | שכבות וגבולות |
| Development | [`04-development-principles.md`](./04-development-principles.md) | תהליך פיתוח |
| Data model | [`05-data-model.md`](./05-data-model.md) | מודל הנתונים (target) |
| Security | [`06-security-and-permissions.md`](./06-security-and-permissions.md) | אבטחה והרשאות |
| Notifications | [`07-notifications-and-reminders.md`](./07-notifications-and-reminders.md) | התראות |
| Rotation | [`08-rotation-engine.md`](./08-rotation-engine.md) | מנוע תורנויות |
| Testing | [`09-testing-strategy.md`](./09-testing-strategy.md) | אסטרטגיית בדיקות |
| Decisions | [`decisions.md`](./decisions.md) | ADRs מאושרים (ADR-001..021) |
| Project status | [`project-status.md`](./project-status.md) | עובדות מאומתות + snapshot לסשן |
| Todo | [`todo.md`](./todo.md) | roadmap מתועדף |
| Claude context | [`claude-context.md`](./claude-context.md) | הוראות עבודה ל־Claude Code |
| GPT handover | [`gpt-handover.md`](./gpt-handover.md) | רציפות לשיחות GPT |

מסמכי **as-built** (מתארים את היישום בפועל, אינם מחליפים את ה־PRD): [`CLAUDE_HANDOVER.md`](./CLAUDE_HANDOVER.md), [`LOVABLE_CURRENT_STATE.md`](./LOVABLE_CURRENT_STATE.md), [`LOVABLE_ARCHITECTURE.md`](./LOVABLE_ARCHITECTURE.md), [`LOVABLE_DECISIONS.md`](./LOVABLE_DECISIONS.md), [`LOVABLE_KNOWN_LIMITATIONS.md`](./LOVABLE_KNOWN_LIMITATIONS.md), [`LOVABLE_NEXT_STEPS.md`](./LOVABLE_NEXT_STEPS.md), [`LOVABLE_CHANGELOG.md`](./LOVABLE_CHANGELOG.md), [`PWA.md`](./PWA.md), [`../supabase/README.md`](../supabase/README.md).

## 5. Current technical stack

גרסאות מאומתות מ־[`../package.json`](../package.json) (טווחי semver כפי שנעולים ב־`bun.lock`):

- **React** 19.2 + **TypeScript** 5.8 (strict)
- **Vite** 8.0
- **TanStack** Router 1.170 / Start 1.168 / Query 5.101
- **Tailwind CSS** 4.2 (OKLCH tokens ב־`src/styles.css`)
- **shadcn/ui** primitives + design system ב־`src/components/design-system/`
- **Vitest** 4.1 + Testing Library + jsdom
- **Zod** 3.24
- **Bun** 1.3.14 (package manager; `bun.lock` committed)
- **Supabase CLI** 2.109.1 (dev dependency, מורץ דרך `bunx supabase`)
- **@supabase/supabase-js** 2.110.8 (runtime)
- **PWA**: `vite-plugin-pwa` 1.3 (app-shell-only)
- **Deployment target**: Cloudflare Workers via Nitro (`nodejs_compat`)

## 6. Completed work

- Lovable prototype נבנה.
- Git sync פעיל (GitHub).
- Repository Acceptance Audit הושלם.
- **WP0** — Foundation Fixes: מוזג ל־`main`.
- **WP1** — Knowledge Pack: מוזג ל־`main`.
- **WP2** — Supabase Local Workflow: הושלם ו**מוזג ל־`main`** (PR #3, merge commit `9e691c9`).
- **Post-WP2 consistency pass** — ה־route tree המגונרר (`src/routeTree.gen.ts`) סונכרן עם הגנרטור, CI מאמת את טריותו (`routes:check`, ADR-022), ומספרים ישנים בתיעוד תוקנו.
- **WP3** — Identity & Household Schema: הושלם ומוזג ל־`main`.
- **WP4** — RLS, grants ובדיקות שליליות: הושלם ומוזג ל־`main`. שלושה helpers ב־schema `private`, grants ברמת עמודה, שש policies.
- **162 app tests** ב־19 קבצים + **181 structural pgTAP** + **117 behavioural RLS pgTAP** + **34 Auth-backed integration assertions**; CI כולל שני jobs: **verify** ו־**database**.
- WP0 כלל תיקון באג **timezone** במנוע התורנויות ומדיניות **LF** (`.gitattributes`).
- WP2 כלל **local Supabase workflow**, **generated database types**, ו־**public-key-only smoke test**.

## 7. Current Git and GitHub state

> ⚠️ זהו snapshot נכון לרגע הכתיבה. **אל תניח שהמצב זהה** — הפעולה הראשונה בסשן הבא היא לבדוק בפועל (`git status`, `gh pr view 3`), לא להסתמך על קובץ זה.

- `main` מכיל את **WP0**, **WP1**, **WP2**, ה־post-WP2 consistency pass ו־**WP3**.
- PR **#3** (WP2) — **MERGED** (`9e691c9`). PR **#4** (post-WP2 consistency) — **MERGED** (`17647b4`). WP3 נמסר ב־PR נפרד משלו (ראה `git log` על `main`).
- ה־local Supabase stack רץ בטווח `553xx` כשהוא מופעל; **Docker נדרש**.

## 8. Current backend state

- Supabase הוא **local-only**; **אין remote project**, אין `login`/`link`, אין `db push`.
- **אין Auth flow**, **אין RPC**, **אין persistence** למודולי המוצר.
- **mock repositories עדיין פעילים** לכל המודולים העסקיים.
- שלוש migrations: `20260724153731_wp2_foundation.sql` (ריקה), `20260725143927_wp3_identity_household.sql` ו־`20260725154640_wp4_identity_household_rls.sql` (**Identity & Household**: enums `household_role` + `household_membership_status`, טבלאות `households`, `member_profiles`, `household_members`, `household_invitations`).
- **WP4**: RLS נאכף. `anon` לא מקבל כלום. `authenticated` קורא רק את משק הבית שלו, עם grants **ברמת עמודה**. `household_members` ו־`household_invitations` הם **לקריאה בלבד** ללקוח — כל שינוי הוא RPC ב־WP4.5 (ADR-028). `date_of_birth`, `token_hash` ו־`auth_user_id` אינם נגישים ללקוח (ADR-029).
- **אין schema עסקי** מעבר ל־Identity/Household (אין tasks/calendar/transport/shopping וכו').
- `supabase/seed.sql` **ריק מבחינה עסקית**; fixtures הם טרנזקציוניים בתוך הבדיקות.
- **102 בדיקות pgTAP** ב־`supabase/tests/database/` (`bun run db:test`), רצות ב־CI job `database`.
- Local project ID: `tori-family-hub`; app dev URL: `http://localhost:8080`; ports בטווח **`553xx`** (כדי לא להתנגש בפרויקט local אחר).
- **Docker נדרש** להרצת ה־stack המקומי.
- Supabase client הוא **infrastructure scaffold בלבד** (`src/infrastructure/supabase/`, Auth inert), לא מחובר לשום module.

## 9. Important commands

מתוך [`../package.json`](../package.json) (שמות מאומתים):

| מטרה | פקודה |
| --- | --- |
| install (reproducible) | `bun install --frozen-lockfile` |
| dev server | `bun run dev` |
| typecheck | `bun run typecheck` |
| lint | `bun run lint` |
| tests | `bun run test` |
| build | `bun run build` |
| Supabase start | `bun run supabase:start` |
| Supabase stop | `bun run supabase:stop` |
| Supabase status | `bun run supabase:status` |
| DB reset (migrations + seed) | `bun run db:reset` |
| DB types generate | `bun run db:types` |
| DB types freshness check | `bun run db:types:check` |
| DB smoke (public key only) | `bun run db:smoke` |
| DB structural pgTAP | `bun run db:test:structure` |
| DB Auth-backed RLS suite | `bun run db:test:auth-suite` |
| Client secret scan | `bun run check:client-secrets` |
| DB verify (הכול) | `bun run db:verify` |

## 10. Quality gates

- reproducible install (`bun install --frozen-lockfile`).
- `typecheck` (0 errors).
- `lint` (0 errors; 6 warnings מוכרים של shadcn).
- `test` (162/162).
- `build` + `routes:check` (route tree טרי).
- migration reset (`db:reset`).
- generated type freshness (`db:types:check`).
- public-key-only smoke (`db:smoke`).
- structural pgTAP (`db:test:structure`, 181/181).
- behavioural RLS pgTAP + integration (`db:test:auth-suite`, 117 + 34).
- client secret scan (`check:client-secrets`).
- CI **verify** job.
- CI **database** job (ראה [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml)).
- secret scan (ידני לפני commit).
- working tree clean אחרי commit.

## 11. Known limitations and technical debt

- אין Auth / RLS / schema עסקי; אין persistence — refresh מאפס למצב seed.
- roles ו־PIN הם **UX guards בלבד**, לא security.
- **mock repositories** הם מקור הנתונים לכל המודולים.
- `src/app/` **ריק** (`.gitkeep` בלבד).
- `src/infrastructure/` מכיל כעת את **scaffold ה־Supabase** תחת `src/infrastructure/supabase/` (כבר אינו ריק).
- ה־hooks המודולריים (`useTasks`, `useToday`, …) יושבים תחת **`src/lib/`**, לא `src/hooks/` (ש־מכיל רק `use-mobile.tsx`).
- **transport ID alias** זמני קיים ב־`src/data/peopleDirectory.ts` (`ALIAS_TO_CANONICAL`).
- **PWA app-shell-only**; wiring של `sw.js` לתיקיית ה־deploy עדיין עתידי.
- **Docker נדרש** ל־Supabase המקומי.
- container `vector`/analytics עשוי להיות לא יציב — **אינו נדרש** ל־workflow (CI מחריג אותו).
- אין **E2E** מלא.
- אין **staging/production Supabase**.

## 12. Roadmap

1. ~~**Merge PR #3** (WP2 → `main`)~~ — בוצע.
2. ~~**WP3** — Identity and Household Schema~~ — בוצע ומוזג.
3. ~~**WP4** — RLS and Negative Tests~~ — בוצע ומוזג.
4. **WP4.5** — Identity RPCs (הצעד הבא). לאחר מכן **WP4.6** — Auth account deletion (⚠️ חוסם את WP5).
4. **WP5** — Real Onboarding (חיבור onboarding לנתונים אמיתיים).
5. לאחר מכן — הרחבת backend למודולים עסקיים, **מודול אחד בכל פעם**.

פירוט מלא ב־[`todo.md`](./todo.md).

## 13. Exact scope of WP4.5 (הבא)

WP4 הושלם ומוזג. WP4.5 מוסיף את ה־RPCs שמבצעים כל שינוי סמכות.

**In scope**:

- ה־`GRANT`־ים המינימליים ל־`anon`/`authenticated` **יחד עם** מערך ה־RLS policies המלא, באותה migration (ADR-023)
- membership predicate: `EXISTS (SELECT 1 FROM household_members WHERE household_id = x AND auth_user_id = auth.uid() AND status = 'active')`
- `has_household_role` כ־SECURITY DEFINER עם `search_path` קבוע ובטוח (ADR-024) — **בלי** טבלת `user_roles`
- בדיקות **חיוביות ושליליות**: משתמש מחוץ למשק הבית מקבל אפס שורות / נכשל
- משתמשי Auth דרך **Auth admin API בלבד — לעולם לא SQL**
- Household A/B base dataset מ־[`09-testing-strategy.md`](./09-testing-strategy.md)

**Out of scope** (ל־WP4):

- UI changes
- onboarding wiring / חיבור modules ל־DB (→ WP5)
- child PIN verification (credentials עתידיים ב־`private.member_pin_credentials`, ADR-025)
- task schema ומודולים עסקיים אחרים

## 14. Working rules for GPT

- לדבר **בעברית**.
- לתת **status קצר** ברמת כותרת בתחילת כל תשובה.
- לתת **פרומפט אחד בכל פעם** (משימה סגורה).
- כל פעולות **Git / GitHub / קוד / Supabase** מבוצעות על ידי **Claude Code**, לא על ידי המשתמש.
- לערב את המשתמש רק ב**הרשאות או פעולות חיצוניות** שלא ניתן לבצע אוטומטית (למשל הפעלת Docker Desktop).
- **לא לבקש מהמשתמש להריץ פקודות.**
- לא לחזור על שאלות שכבר נענו.
- לבחור **best practices** כאשר הסיכון נמוך, במקום לשאול.
- **לא להתחיל כמה work packages במקביל.**
- כל שינוי **schema** דורש **migration**.
- כל שינוי **הרשאה/RLS** דורש **positive ו־negative tests**.
- כל משימה **מעדכנת docs ו־handover** בסיום.

## 15. First actions in the next session

1. לקרוא את הקובץ הזה.
2. `git status` — לוודא working tree ו־branch.
3. לבדוק את ה־branch הנוכחי.
4. `git fetch` — למשוך את מצב GitHub.
5. לסנכרן `main` (`git checkout main && git pull --ff-only`) — WP2 כבר מוזג.
6. להריץ את שערי האיכות (typecheck / lint / test / build / `routes:check`), ואם Docker פעיל גם `bun run db:verify`.
7. **רק אז** להכין את הפרומפט ל־**WP3**.

## 16. Last verified results

נכון לסגירת WP4:

- **162/162 app tests** עוברים (19 קבצים).
- **181/181 structural pgTAP** (9 קבצים) + **117/117 behavioural RLS pgTAP** (6 קבצים) + **34/34 integration assertions**.
- **typecheck**: 0 errors.
- **lint**: 0 errors + 6 warnings (shadcn).
- **build**: success.
- **routes:check**: passed.
- **database verification** (`db:verify`): passed (reset → types → smoke → structural → fixtures → RLS → integration → cleanup).

## 17. Trust and memory boundary

- **ל־GPT אין זיכרון קבוע.** קובץ זה והמסמכים בריפו הם מקור הרציפות.
- יש **לבדוק עובדות משתנות מול Git והריפו** — מצב PR, branch, CI וגרסאות.
- **אין להניח** שמצב PR / branch / CI נשאר זהה לאחר זמן; לאמת בתחילת כל סשן.
- כאשר קובץ זה סותר את המצב בפועל בריפו — **המצב בפועל גובר**, ויש לעדכן את הקובץ.
