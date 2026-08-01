# Project Status

**Verified facts only.** When a canonical requirement differs from the code, the gap is recorded here and in [`todo.md`](./todo.md) — the requirement is not rewritten and the code is not changed outside a dedicated task. Business truth lives in [`01-product-requirements.md`](./01-product-requirements.md).

_Last updated: **2026-07-31** — hosted offline-screen outage fixed (ADR-042), after WP5B. The 2026-07-30 audit section below is retained as the point-in-time record it was._

## Hosted outage — the app showed "אין חיבור לרשת כרגע" on a working connection

**Hosted frontend: `https://home-flow-joy.lovable.app/`. Fixed, published and verified live on 2026-07-31** — see "Deployment status" below.

Root cause, verified from the generated artefact and then **reproduced live** (**ADR-042**):

- `workbox.navigateFallback: "/offline.html"` made Workbox emit a `NavigationRoute` bound to the **precached** offline page. It answered **every** navigation regardless of connectivity, and because Workbox matches routes in registration order it was matched **before** the `NetworkFirst` route, making that route dead code. With `skipWaiting`/`clientsClaim` the worker took control immediately, so the application never executed. Nothing mis-classified the error — the classifier never ran.
- Separately, failures that did reach the app had no classification, so an expired session, an RLS refusal or a missing migration would all have read as a network problem.

Fixed by removing the navigation fallback entirely (offline is now reachable only via `precacheFallback`, after a genuine failure), moving the routing rules into the unit-tested `src/lib/pwa/workboxOptions.ts`, making `public/offline.html` self-heal when it renders while `navigator.onLine` is true, and adding `src/lib/errors/classifyError.ts` so each failure gets its own honest Hebrew message.

**Production does not depend on the local machine.** `bun run check:bundle-endpoints` asserts the inlined `VITE_SUPABASE_URL` is a remote https origin, and runs in CI, which has no `.env.local` and therefore builds exactly as a published Lovable build does. Verified: a published-style build inlines only `https://nrfelnchbmofwrfajfai.supabase.co`. A build made **with** a local `.env.local` inlines `http://127.0.0.1:55321` — correct for development, and now impossible to ship unnoticed.

### Hosted schema state, probed 2026-07-31 (read-only, public key, no credentials)

Querying `https://nrfelnchbmofwrfajfai.supabase.co` with the publishable key alone:

| Table                                                                       | Response             | Meaning                                                                 |
| --------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------- |
| `households`, `member_profiles`                                             | **401 · `42501`**    | exist; `anon` refused — WP4 grants and RLS behaving exactly as designed |
| `task_templates`, `task_instances`, `task_assignments`, `task_activity_log` | **404 · `PGRST205`** | **WP5B is not applied to the hosted project**                           |
| `rotation_rules`                                                            | 404 · `PGRST205`     | expected — WP5C does not exist yet                                      |

So the hosted schema is at **WP4**, the repository is at **WP5B**, and that gap is deliberate: applying WP5B to the hosted project remains a separate, explicit step and **no hosted migration was applied**. The probe also proves the hosted Supabase is reachable over HTTPS from a normal client, so the offline screen was never a Supabase-reachability problem.

Both of those real responses are now regression fixtures in `classifyError.test.ts` — a permission refusal and a missing table are precisely the two failures most likely to be misread as "no internet".

### Deployment status — published and verified live

The fix was merged to `main` (`9c05d8f`) and Lovable republished roughly 40 minutes later. Note the sequence for future incidents: **a merge to `main` is not a deploy.** For a while the repository was fixed while every user was still being served the broken worker, and the published build only changed once Lovable rebuilt.

Verified on the live origin, 2026-07-31, with `Cache-Control: no-cache` and cache-busted requests:

| Artefact | Before | After |
| --- | --- | --- |
| `/sw.js` `NavigationRoute` | 1 | **0** |
| `/sw.js` `PrecacheFallbackPlugin` | 0 | **1**, `{fallbackURL:"/offline.html"}` |
| `/offline.html` self-heal script | absent | **present** |
| client bundle hash | `usePilotSession-B2Y5eo5F.js` | **`usePilotSession-C5ftLP9Y.js`** |

Behavioural verification with headless Chromium, after waiting for the worker to **activate and claim the client** — the state in which the bug used to appear:

- reload with the worker in control → **the app loads** (`כניסה לפיילוט המשפחתי`); the offline screen does not appear
- second reload → same
- `/?sw=off` → works again; no longer intercepted
- visiting `/offline.html` **directly while online** → self-heals and lands on `/pilot/signin`, which is the recovery path for anyone still holding a bad worker
- a failed sign-in produced `https://nrfelnchbmofwrfajfai.supabase.co/auth/v1/token` (422) and the app showed *"הפרטים שהוזנו אינם נכונים…"* — an auth failure reported as an auth failure, not as a network failure
- hosts contacted: the app origin, Google Fonts, Lovable's CDN and the hosted Supabase. **No loopback or local endpoint was requested at any point.** No failed requests.

`?sw=off` remains unreliable as a general escape hatch and must not be relied on — see the note in [`PWA.md`](./PWA.md). The recovery that actually works when the app cannot boot is the self-healing offline page.

## Live regression fixed — navigation restored, week populated (2026-08-01)

Two separate faults, both reported as "the app is broken" (**ADR-045**).

**1. The navigation disappeared.** `src/routes/index.tsx` sent every signed-in person to `/pilot`, a screen that renders *outside* `AppShell` and therefore has no header, bottom navigation or sidebar. All forty-odd other routes still existed and still rendered inside the shell — they were simply unreachable. **Nothing had been deleted.** The front door had been pointed at one room.

Restored: the root route now sends a signed-in person to **`/today`**; the weekly chores are a first-class module at **`/chores`** inside `AppShell`; `/pilot` is a thin account screen that links back into the app instead of trapping people. `nav.chores` joins the primary bottom navigation, and the mock-backed `/tasks` prototype moves to the secondary list.

Reachable again, all inside the shell with working direct visits and refresh: **Today · מטלות השבוע (chores) · calendar · shopping · more · tasks · transport · errands · follow-ups · shifts · household · notifications · settings · child view · templates · search**.

**2. The weekly view was empty because definitions are not occurrences.** `pilot:chores` creates templates, rotation rules and participants — no dated rows. The view queries `task_instances` for a date range, so it correctly found nothing. The earlier "3 / 3 / 6" convergence was real but proved nothing about a *week*.

New `pilot:week` / `pilot:week:hosted` generate the dated rolling window using `shifts.v1`, persisting occurrences, live assignments, rotation decisions with reason codes and verbatim Hebrew explanations, and advancing the cursor only after a decision is recorded.

**Verified locally** (idempotency and determinism):

| Run | Occurrences created | Totals |
| --- | --- | --- |
| 1 | 53 | 0 → 53 |
| 2 | 15 (back-filled week start) | 53 → 68 |
| 3 | **0** | **68 → 68** |

Rotation on three consecutive days: one child unloads while the other loads, swapping each day — the ADR-036 stagger. Trash falls on Sunday/Tuesday/Thursday only. Every decision `NEXT_IN_SEQUENCE`.

### Hosted week generated (2026-08-01)

| Table | Before | After |
| --- | --- | --- |
| `task_templates` | 3 | 3 |
| `task_instances` | **0** | **68** |
| `task_assignments` | **0** | **68** |
| `rotation_assignment_log` | **0** | **68** |
| `rotation_rules` | 3 | 3 |
| `rotation_members` | 6 | 6 |
| `task_activity_log` | 0 | 0 (no completions yet — correct) |

`task_instances` at **0** is the precise root cause of the empty weekly view, now closed.

**Current week 2026-07-26 → 2026-08-01: 17 occurrences, every one of the seven days populated** (3 · 2 · 3 · 2 · 3 · 2 · 2 — two daily chores plus trash on Sunday, Tuesday and Thursday). **17/17 assigned**, and **17/17 carry both a reason code and an algorithm version**, so no assignment is unexplained.

Idempotency proven on hosted: runs 2 and 3 created **0** rows with totals unchanged at 68.

## Hosted deployment — WP5B and WP5C applied (2026-08-01)

The hosted pilot project `nrfelnchbmofwrfajfai` (`tori-family-pilot`) is now **level with `main`**. Applied through the normal Supabase migration workflow — no repair, no linked reset, no manual SQL.

**Before applying**, the ledger was verified consistent and the pending set confirmed to be exactly the two reviewed migrations:

```
20260724153731 WP2   local + remote
20260725143927 WP3   local + remote
20260725154640 WP4   local + remote
20260730120000 WP5B  local only  → pending
20260731140000 WP5C  local only  → pending
```

No remote-only entry existed, so there was no drift. `db push --dry-run` listed exactly those two. Both files were scanned first: **0 destructive statements, 0 writes to `auth`, 0 `USING (true)`, 0 `DISABLE ROW LEVEL SECURITY`.**

### Verified on the hosted project after applying

| Check | Result |
| --- | --- |
| Migration ledger | all five local = remote |
| Tables | **11** created, **11** `ENABLE ROW LEVEL SECURITY` |
| Policies | **26** (6 identity + 11 WP5B + 9 WP5C), matching per-table counts exactly |
| `USING (true)` / RLS disabled | **0 / 0** |
| `anon` probe, all 11 tables | **401 · `42501`** — exists, refused. None returned 200 |
| `anon` grants on the new tables | **0** |
| `private` helpers | **9** (3 identity + 4 task + 2 rotation) |
| Idempotency indexes | `task_instances_occurrence_key_unique`, `rotation_assignment_log_one_per_instance` present |
| Append-only triggers | `task_activity_log` and `rotation_assignment_log` no-update/no-delete present |

### Approved chores, loaded through the guarded bootstrap

`bun run pilot:chores:hosted` reuses `assertHostedPilotEnvironment` verbatim and shares its convergence logic with the local command, so "converged" cannot mean two different things in two environments. No pilot data entered a migration or `seed.sql` (ADR-034).

- **Idempotent**: `0 → 3` templates, `0 → 3` rules, `0 → 6` participants on the first run, then **3 → 3 and 6 → 6** on two further runs.
- **Guard proven**: a non-allowlisted project reference is refused with *"is not in the approved allowlist"*.
- **ADR-036 stagger verified on hosted**: the two dishwasher chores start with **different** children, and the trash chore starts with the same child as unloading. Each rule has its own `cursor_profile_id`, currently `null` (never run).
- All three rules are `fixed_sequence` · `shifts.v1` · `per_occurrence`.

### Hosted Auth

`external.email: true`, `disable_signup: true` — password sign-in works and public signup stays closed. A sign-in probe now returns `invalid_credentials` rather than `email_provider_disabled`, so the fault recorded on 2026-07-31 is resolved.

## Verified state after WP5D — the real weekly chores experience

Measured 2026-07-31 against the local Supabase stack. **Nothing hosted was touched.**

- **The placeholder is gone.** `WeeklyChoresView` renders the real Sunday→Saturday family week from `task_instances`, `task_assignments` and `rotation_assignment_log`, with today marked, the assignee named in words as well as by avatar, status in words, and the stored rotation explanation shown verbatim.
- **Completion persists and cannot lie.** The update uses `.select()`, so a zero-row write — an RLS refusal, or a row somebody else moved — is reported as a permission fault instead of a false tick (§7). The activity-log entry is appended only after the state change is confirmed. Reopening is a normal audited transition, never a silent deletion.
- **Visibility is enforced by RLS alone.** The data layer does no client-side filtering: a child gets the family week minus `adult_only`, a guest gets only assigned work, because the policies return only those rows (ADR-041).
- **Backward compatible with the hosted schema that exists today (ADR-044).** A capability probe asks once whether WP5B/WP5C are present. When they are not — which is the hosted project right now — the family sees a calm **"שדרוג הפיילוט ממתין"** screen, not an error and not the offline screen. One probe per session, memoised and mirrored into `sessionStorage`, so there is no request spam. The real view **switches itself on** the moment the migrations land: no code change, no redeploy.
- **Every failure is classified** (ADR-042): permission, auth, schema, config, timeout, server and offline each get their own honest Hebrew message. A missing table, an RLS denial, an Auth failure and a server fault are **never** reported as offline — asserted by test.
- **`bun run pilot:chores`** loads the three approved chores (ADR-036) with their rotation rules and staggered participant order. Guarded by the existing local guard, idempotent — verified converging 3→3 templates and 6→6 participants across three consecutive runs — and it writes **no** pilot data into a migration or `seed.sql` (ADR-034). There is deliberately no hosted counterpart yet.
- **New pure domain module** `src/domain/week.ts`: Sunday→Saturday week maths on the UTC calendar, carrying the WP0 timezone rule forward so a chore "on Tuesday" cannot drift with the device's timezone. Regression-tested across UTC, Asia/Jerusalem, a negative offset and UTC+14.
- **App tests 284 → 303 across 29 files.** typecheck 0 · lint 0 errors / 6 known warnings · build ✓ · `routes:check` ✓ · `check:client-secrets` ✓ · `check:pilot-privacy` ✓ · `check:bundle-endpoints` ✓ · `db:verify` ✓ (381 structural + 302 behavioural pgTAP + 34 integration + 29 pilot).
- **No schema change.** WP5D needed none: WP5B and WP5C already carried everything the view reads.

## Verified state after WP5C — rotation foundation

Measured 2026-07-31 against a freshly reset local stack.

- **`supabase/migrations/20260731140000_wp5c_rotation_foundation.sql`** adds three enums and three tables — `rotation_rules`, `rotation_members`, `rotation_assignment_log` — with structure, grants and the full policy set in one migration (ADR-023).
- **The engine is not reimplemented.** `src/domain/shifts.ts` (`shifts.v1`) already selects deterministically and is tested; this is the durable memory around it, as `08-rotation-engine.md` requires.
- **The cursor is a stored column** (`rotation_rules.cursor_profile_id`), never derived and never client-writable — see **ADR-043**. Deriving it from the current week would silently reset every Sunday, which ADR-036 forbids.
- **Allocation is idempotent by index**: one decision per `(rule, occurrence)`, so a retry or a concurrent second allocator collides instead of assigning twice. `rotation_rules_one_live_per_template` prevents two competing cursors on one chore.
- **`advance_mode` is a column**, not a constant, because `PILOT_WEEKLY_CHORES.md` §10 leaves the decision open.
- **Every decision is explainable**: `reason_code`, `algorithm_version`, candidate snapshot, the cursor before the decision, and the exact Hebrew sentence shown, stored verbatim so it cannot drift.
- **Role-scoped RLS (ADR-041)**: owner/adult see the whole household; a child sees the rotation of chores they can see — including the participant order, which is what makes "whose turn is next" not a mystery — minus adult-only; a guest or service provider sees only the rule behind work assigned to them.
- **The deferred foreign key landed**: `task_assignments.assigned_by_rule_id` now references `rotation_rules` as a composite `(rule, household)` key, `ON DELETE SET NULL` so removing a rule never erases the assignment it produced.
- **`rotation_members` is the schema's only client-deletable table**, deliberately; `070` now asserts the exact delete-policy set by name.
- **381 structural pgTAP across 12 files** and **302 behavioural RLS pgTAP across 10 files** (from 310/11 and 261/9). App tests 252/26. `db:verify` ✓ end to end.
- **No UI, no RPC, no module wiring.** WP5C is schema and policy only.

## Hosted pilot sign-in is disabled at the project level (BLOCKING, 2026-07-31)

**Nobody can sign in to the hosted pilot, and no password change can fix it.** The Email provider is switched off on the hosted Supabase project.

Evidence, gathered read-only with the public publishable key:

```
GET  /auth/v1/settings           → external.email: false, disable_signup: true
POST /auth/v1/token?grant_type=password
     arieldeitch@gmail.com       → 422 {"error_code":"email_provider_disabled",
                                        "msg":"Email logins are disabled"}
     pilot-owner@tori.local      → 422 (identical)
```

It is returned for **every** address, so it says nothing about whether an account exists, is confirmed, or has the right password. `disable_signup: true` is correct and wanted (it closes the open-signup risk recorded above); `external.email: false` is the fault — it disables password **sign-in** as well as signup.

**This cannot be fixed with the service-role/secret key.** The Admin API can create and update users, but enabling an auth provider is project configuration, reachable only through the Supabase Dashboard or the Management API with a personal access token.

**The one manual step:** Supabase Dashboard → the `tori-family-pilot` project → Authentication → Providers → **Email → enable**. Leave *"Allow new users to sign up"* **off** — that is the wanted posture, and it does not block sign-in.

Until then the owner-login work (set password, confirm email, verify the membership binding) cannot be completed or verified end to end, because step "sign in and load the household under RLS" is rejected before any credential is checked.

### What was fixed here instead

The screen lied about the cause. `PilotSignInScreen` rendered one hard-coded message — *"הפרטים שהוזנו אינם נכונים"* — for **every** sign-in failure, discarding the real error. So a server with the provider switched off told the family their password was wrong, which is a fault they can never fix by retrying. This is the third instance of the ADR-042 principle, and it is now classified: `email_provider_disabled` renders **"הכניסה עם דוא״ל מושבתת בשרת"** with a hint naming the configuration fix, and a genuinely wrong password still renders the credential message. Sign-in failures now flow through `classifyError` like every other failure.

## Audit of 2026-07-30 — what was verified and what was corrected

A full state audit was run against the repository, not against chat history.

- **Audited commit:** `17f1ebd` (`docs: ADR-038 for the tracked browser-public configuration`, authored 2026-07-26).
- **Audited branch:** `wp5a-lovable-published-env`, in sync with its remote, working tree clean. The branch has since been merged and deleted.
- **PR #10 is merged.** It had been open, `MERGEABLE` and CI-green since 2026-07-26. Merged on **2026-07-30** as `b9c603b`, and the `wp5a-lovable-published-env` branch was deleted. `main` now carries the ADR-038 tracked root `.env` — verified after the merge to hold **exactly** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. A published Lovable build from `main` can now configure itself.
- **`main` was at `51c586e`** (merge of PR #9) when the audit began.
- **No commits between 2026-07-26 and the audit.** The gap was four days of no repository activity.
- **Re-run and green on this machine:** `bun install --frozen-lockfile`, `typecheck`, `lint`, `test`, `build`, `routes:check`, `check:client-secrets`, `check:pilot-privacy`, `pilot:test:hosted-guard`.
- **Not re-run during the audit itself:** every database gate. The Docker daemon was down at the time, and `db:verify` begins with `supabase db reset`, which the audit's terms forbade. They were not unverified even then: the CI `database` job — migrations, type freshness, smoke, both pgTAP suites, the Auth-backed integration suite and the pilot bootstrap tests — **passed on PR #10 at the audited commit**. Docker was started later the same day and the database gates were re-run in full as part of WP5B.

Counts corrected by this audit (documentation had drifted behind the last three commits):

| Fact            | Previously documented      | Verified 2026-07-30                                                                                                                            |
| --------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| App tests       | 162 across 19 files        | **210 across 24 files**                                                                                                                        |
| Lint warnings   | 6 (all shadcn)             | **7** — 6 shadcn `react-refresh` + 1 unused `eslint-disable` (`src/lib/pilot/runtimeConfig.ts:95`). Still **0 errors**.                        |
| Route modules   | 41 `.tsx`, 42 tracked      | **44 `.tsx`, 45 tracked** (`src/routes/README.md` is documentation, not a route)                                                               |
| Supabase client | "scaffold only, not wired" | **Wired** — the pilot slice (`usePilotSession`, `usePilotHousehold`) performs real Auth and real reads. Every _business_ module is still mock. |

> Two of these have moved on since the audit: the 7th lint warning was removed during WP5B (back to **6**, all shadcn), and the pgTAP counts are superseded by the WP5B section below.

## Current snapshot (resume here)

Point-in-time state so work can resume without relying on chat history.

- **`main` contains WP0 + WP1 + WP2 + the post-WP2 consistency pass + WP3 + WP4 + WP5A + ADR-038.**
- **Done & merged to `main`:** WP0 (foundation fixes), WP1 (knowledge pack), WP2 (Supabase local workflow, PR #3 / `9e691c9`), post-WP2 consistency (PR #4 / `17647b4`), WP3 (Identity & Household schema, PR #5 / `924d621`), WP4 (RLS, grants, negative tests).
- **WP5A (pilot access and local bootstrap) is complete.** Environment-guarded idempotent bootstrap, one authenticated adult identity, four member profiles, local sign-in and a profile selector — **no migration and no RLS change were required** (ADR-035).
- **The pilot is now hosted** (ADR-037): Lovable hosts the frontend, the dedicated non-production Supabase project `tori-family-pilot` (eu-central-1, personal org) is the only backend. WP2/WP3/WP4 migrations are applied remotely and verified; the hosted pilot household is bootstrapped and idempotent. Docker is no longer required for family use.
- **Published Lovable builds are now configurable** (ADR-038): the two browser-public Supabase values live in a tracked root `.env`, because published builds do not receive ignored files. An enforced allowlist plus a test keeps everything else out, and `.gitignore` still ignores every other `.env` variant.
- **WP5B (task and recurrence foundation) is complete and merged to `main`** (PR #12, merge commit `b2834b8`, 2026-07-31). The first business-domain tables exist — `task_templates`, `task_instances`, `task_assignments`, `task_activity_log` — with structure, grants and the full RLS policy set in one migration (ADR-023). See the WP5B section below. **Not yet applied to the hosted pilot project.**
- **Next step: WP5C — child rotation foundation.** `rotation_rules`, `rotation_members`, `rotation_assignment_log`, deterministic assignment reusing `shifts.v1`, persisted `algorithm_version` + `reason_code`. `task_assignments.assigned_by_rule_id` is already in place, deliberately without a foreign key until then.
- **Still required, no longer immediately next:** WP4.5 (Identity RPCs) and WP4.6 (Auth account deletion — still blocking before production onboarding or account deletion, ADR-031).
- **Quality gates, all re-verified locally on 2026-07-31:** `install --frozen-lockfile` ✓ · typecheck 0 · lint **0 errors / 6 warnings** (the 6 known shadcn `react-refresh` warnings; the stray WP5A `eslint-disable` has been removed) · **app tests 210/210 across 24 files** · build ✓ · `routes:check` ✓ · `check:client-secrets` ✓ (564 files) · `check:pilot-privacy` ✓ (373 files) · `pilot:test:hosted-guard` ✓ (26/26) · **structural pgTAP 310/310 across 11 files** · **behavioural RLS pgTAP 261/261 across 9 files** · **34/34 Auth-backed integration assertions** · **29/29 pilot bootstrap assertions** · `db:verify` ✓ end to end.
- **WP2 facts:** Supabase CLI `2.109.1` (locked dev dep), `@supabase/supabase-js` `2.110.8` (runtime), package manager **Bun 1.3.14** (Node `v24.15.0` present locally; CI uses `oven-sh/setup-bun@v2`). Local `project_id = tori-family-hub`, app dev URL `http://localhost:8080`, Supabase local ports remapped to the **553xx** range (to avoid clashing with another local stack). Foundation migration: `supabase/migrations/20260724153731_wp2_foundation.sql` (empty). `supabase/seed.sql` has no business data. Generated types: `src/infrastructure/supabase/database.types.ts`. Public env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. No service role in frontend, no `db push`. CI has a separate `database` job; `db:verify` = reset + type freshness + smoke + the full suite.
- **The client is no longer scaffold-only.** `src/infrastructure/supabase/` is consumed by `src/lib/pilot/usePilotSession.ts` (real `signInWithPassword` / `signOut` / session subscription) and `src/lib/pilot/usePilotHousehold.ts` (real household + profile reads under WP4 RLS). This is the pilot slice only; **no business module reads or writes the database**.
- **A remote project is linked locally.** `supabase/.temp/linked-project.json` and `supabase/.temp/project-ref` exist and are correctly git-ignored via `supabase/.gitignore`. This is the hosted non-production pilot project of ADR-037 — the repository holds no credential for it.
- **Local stack:** stopped at session closeout. To resume: start Docker, then `bun run supabase:start` (ports `553xx`), copy URL + publishable key from `bun run supabase:status` into `.env.local`.

## Where the project is

- Prototype was built in Lovable.
- GitHub is connected.
- Claude Code is active.
- The Repository Acceptance Audit is complete.
- **WP0, WP1, WP2, the post-WP2 consistency pass, WP3, WP4 and WP5A (including the hosted conversion and the ADR-038 tracked-`.env` work) are all complete and merged to `main`.**
- A Supabase environment exists in two forms: the local CLI stack for development and CI, and the hosted non-production pilot project that ADR-037 makes the exclusive backend. `supabase/` holds config, **three** migrations, a business-empty seed and 15 pgTAP files (9 structural + 6 behavioural RLS).
- The Identity & Household tables exist with RLS enforced, and are read by the pilot slice only. **No business module is connected to the database** — every business module still uses the in-memory mock repositories in `src/data/*Repo.ts`.

## Verified state after WP0

- `typecheck` uses `tsc --noEmit`.
- `.gitattributes` enforces LF line endings.
- The rotation-engine timezone bug is fixed.
- Regression tests were added for several timezones.
- **158 of 158 tests pass.**
- `lint` passes with 0 errors and 6 known shadcn warnings.
- `build` passes.
- The PWA precache includes app-shell assets.
- CI is green.

## Verified state after WP2

- Supabase CLI is a **locked dev dependency** (`supabase`), `@supabase/supabase-js` a runtime dependency. Run via `bunx supabase`.
- `supabase/` is in Git: `config.toml` (ports remapped to the 553xx range to avoid clashing with other local stacks; `auth.site_url = http://localhost:8080`), one empty foundation migration, and a business-empty `seed.sql`.
- The local stack starts, `bun run db:reset` applies migrations + seed cleanly, `bun run db:types` regenerates `src/infrastructure/supabase/database.types.ts`, and `bun run db:smoke` passes a public-key-only REST health check.
- A typed infrastructure client (`src/infrastructure/supabase/`) exists with lazy, Zod-validated public env — **infrastructure scaffold only, not wired to any business module**.
- CI has a separate `database` job validating migrations, seed, type freshness, and the smoke test. No secrets, no remote project.
- **162 of 162 tests pass** across 19 test files (158 + 4 new public-env validation tests).
- `typecheck`, `lint` (0 errors, 6 known warnings), and `build` remain green.

## Verified state after the post-WP2 consistency pass

- **`src/routeTree.gen.ts` is committed generated runtime source and is now in sync with the generator.** Previously, `vite build` regenerated the file with a TanStack Start `Register` module augmentation that was missing from the committed version, so every build left an unexpected tracked diff. The regenerated file is committed, and generation is a verified fixed point (two consecutive builds produce an identical file).
- **CI now fails if the committed route tree is stale.** The `verify` job runs `bun run routes:check` immediately after `build`; the check asserts the build left `src/routeTree.gen.ts` untouched. See [`decisions.md`](./decisions.md) ADR-022.
- No dependency was added — the project's own build is the generator.
- Documentation counts were re-verified against the repository (tests, test files, route files, CI jobs).

## Verified state after WP3

- **The Identity & Household schema exists**: `supabase/migrations/20260725143927_wp3_identity_household.sql` creates the enums `household_role` and `household_membership_status` and the tables `households`, `member_profiles`, `household_members`, `household_invitations`.
- **The tables are deliberately unreachable by any client** (ADR-023): RLS enabled on all four, **zero policies**, and all privileges revoked from `PUBLIC`, `anon` and `authenticated`. WP4 adds the minimum `GRANT`s together with the policy set.
- **Household consistency is structural, not policy-dependent**: a composite foreign key `(profile_id, household_id) → member_profiles (id, household_id)` makes cross-household membership impossible, and a trigger makes `household_id` immutable on every household-owned row.
- **`auth.users` is referenced only** — foreign keys on `id`, never written by SQL, no trigger on it. `auth_user_id` is nullable for child/non-login profiles (ADR-013); live-membership uniqueness is scoped per household so one account can join many households but not twice the same one.
- **No PIN credential material exists** (ADR-025): `member_profiles` has no `pin_hash`; `pin_auth_enabled` is non-sensitive metadata defaulting to `false`.
- **102 pgTAP tests across 7 files** pass (`bun run db:test`), transactional and independent, wired into the CI `database` job. They assert structure, constraints and the locked-down state — **not** household isolation, which needs policies and belongs to WP4.
- `supabase/seed.sql` remains **business-empty**; fixtures are test-local and rolled back.
- Generated `database.types.ts` regenerated and CI-verified fresh. App gates unchanged and green.
- **Still no Auth flow, no RPC, and no module reads or writes these tables** — every business module still uses in-memory mock repositories.

## Verified state after WP4

- **RLS is enforced.** `supabase/migrations/20260725154640_wp4_identity_household_rls.sql` adds three authorization helpers in a non-exposed `private` schema, the minimum column-level grants, and six policies — grants and policies in one migration (ADR-023).
- **Reads are scoped; authority is unreachable.** Members read their own household; guests and service providers see only their own row; owners alone update household settings and list invitations. `household_members` and `household_invitations` have **no** client INSERT/UPDATE/DELETE at all, so self-assignment, role escalation, `auth_user_id` spoofing, membership removal and invitation forgery are impossible rather than merely disallowed (ADR-028).
- **Sensitive columns are ungranted:** `date_of_birth` (neither read nor write, and no accessor was created), `token_hash`, `auth_user_id`, and the `created_by`/`deleted_at`/`deleted_by` audit columns (ADR-029).
- **`anon` holds nothing** — no schema usage, no function execute, no column privilege, no policy.
- **Fails closed** on NULL `auth.uid()`, suspended, revoked, expired access (boundary-tested), soft-deleted household and deactivated caller profile.
- **117 behavioural RLS pgTAP tests + 34 publishable-key integration assertions** pass, alongside 181 structural tests. Every behavioural test asserts `current_user = 'authenticated'` first, because pgTAP connects as a `BYPASSRLS` owner.
- **`service_role` gained DML** for server-side administration and fixtures only; `check:client-secrets` proves no service-role material reaches `src/` or the build output (ADR-030).
- `seed.sql` is still **business-empty**; fixtures are created and cleaned up by the harness (ADR-032).
- **Still outstanding and blocking:** `household_members.auth_user_id` remains `ON DELETE CASCADE`. **WP4.6 must land before production onboarding or any real account-deletion path** (ADR-031).
- **No Auth UI, no app Auth wiring, no onboarding persistence, no RPC** — modules still use mocks.

## Product capability state (verified 2026-07-30, task rows updated 2026-07-31)

Classification rule: a capability is **Complete** only with persistence, a real data source, server-enforced permissions and a full flow. A screen alone is never Complete.

| Capability                      | Status                              | Evidence                                                                                                                                                                                                                                                         |
| ------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication                  | **Partial**                         | Real Supabase Auth password sign-in for the single pilot adult: `src/lib/pilot/usePilotSession.ts`, `src/features/pilot/PilotSignInScreen.tsx`, `src/routes/pilot.signin.tsx`. No signup, no recovery, no child login, no PIN, no route guard outside the pilot. |
| Household onboarding            | **Scaffold only**                   | `src/features/onboarding/OnboardingWizard.tsx` + `src/routes/onboarding.tsx` write to the in-memory `src/data/householdRepo.ts`. Nothing persists; no creation RPC exists (WP4.5).                                                                               |
| Members / adults / children     | **Partial**                         | Read-only from the database in the pilot (`src/lib/pilot/usePilotHousehold.ts`, `src/features/pilot/ProfileSelector.tsx`); the full `src/features/household/` screens are mock-backed. Profiles are created by the bootstrap script, never by the UI.            |
| Today screen                    | **Scaffold only**                   | `src/features/today/TodayScreen.tsx`, `src/application/todayService.ts`, `src/data/todayRepo.ts` — mock, lost on refresh.                                                                                                                                        |
| One-off tasks                   | **Scaffold only**                   | `src/features/tasks/*`, `src/data/tasksRepo.ts` (file header: "In-memory task repository. Prototype only — no persistence").                                                                                                                                     |
| Recurring templates & instances | **Partial (schema only)**           | `task_templates` / `task_instances` now exist with RLS (WP5B). The UI — `src/features/templates/*`, `src/domain/recurrence.ts`, `src/data/templatesRepo.ts` — is still mock and reads none of them; wiring is WP5D.                                              |
| Rotation                        | **Partial (engine only)**           | `src/domain/shifts.ts` is a tested pure engine (`ALGORITHM_VERSION = "shifts.v1"`, reason codes) with plain-language rendering in `src/features/shifts/human.ts`. No `rotation_rules` table, no persisted assignment, no `algorithm_version` column.             |
| Calendar                        | **Scaffold only**                   | `src/features/calendar/*`, `src/data/calendarRepo.ts` — mock.                                                                                                                                                                                                    |
| Transport                       | **Scaffold only**                   | `src/features/transport/*`, `src/data/transportRepo.ts` — mock; still carries the temporary `peopleDirectory` alias table.                                                                                                                                       |
| Follow-up                       | **Scaffold only**                   | `src/features/follow-ups/*`, `src/data/followUpRepo.ts` — mock.                                                                                                                                                                                                  |
| Shopping                        | **Scaffold only**                   | `src/features/shopping/*`, `src/application/shoppingService.ts`, `src/data/shoppingRepo.ts` — mock.                                                                                                                                                              |
| Notifications                   | **Scaffold only**                   | `src/features/notifications/*` renders a list and preferences from `src/data/notificationsRepo.ts`. **No delivery of any kind** — no worker, no push, no email, no cron.                                                                                         |
| Child view                      | **Scaffold only**                   | `src/features/child-mode/ChildHome.tsx`, `src/features/today/ChildTodayScreen.tsx`, `src/routes/child.tsx` — mock data, and child mode is a UX guard, not a session.                                                                                             |
| Soft delete & restore           | **Scaffold only**                   | `src/domain/recurrence.ts` (`isSoftDeleted`) and `src/features/templates/TrashScreen.tsx` implement the 48h rule (ADR-007) in memory. The identity tables carry `deleted_at` / `deleted_by`, but those columns are ungranted to clients (ADR-029).               |
| Offline queue                   | **Not started**                     | No `client_operation_id` anywhere in `src/`, and no queue module. `PendingSyncBadge`, `SyncStatusIndicator`, `SyncConflictDialog` and `OfflineState` are design-system components with no sync engine behind them.                                               |
| PWA                             | **Partial**                         | `src/lib/pwa/register.ts` + `vite-plugin-pwa`; the build emits `dist/sw.js` with a 148-entry precache. App-shell only, and `sw.js` still lands in `dist/` rather than the deployed `.output/public`.                                                             |
| Hebrew / RTL / i18n             | **Complete**                        | `<html lang="he" dir="rtl">` in `src/routes/__root.tsx`, a typed dictionary in `src/locales/he.ts` and a path-typed accessor in `src/lib/i18n.ts`. Single locale by design.                                                                                      |
| Household isolation (RLS)       | **Complete for identity and tasks** | `…_wp4_identity_household_rls.sql` and `…_wp5b_task_recurrence_foundation.sql`, plus 9 behavioural RLS pgTAP files and 11 structural files. Task access is additionally role-scoped (ADR-041). The remaining business modules have no tables yet.                |

## Verified state after WP5B

Measured on 2026-07-31 against a freshly reset local stack, not carried forward from notes.

- **The first business-domain tables exist.** `supabase/migrations/20260730120000_wp5b_task_recurrence_foundation.sql` creates eight enums and four tables — `task_templates`, `task_instances`, `task_assignments`, `task_activity_log` — with structure, column-level grants and the complete policy set in **one** migration (ADR-023), so no table is ever briefly unprotected.
- **`auth.users` is referenced only.** Foreign keys on `id`, never written by SQL, no trigger on it.
- **Generation is idempotent.** `task_instances.occurrence_key` is a stored generated column (`template_id:YYYY-MM-DD`) plus a partial unique index, so a concurrent double-generation is a constraint violation the caller treats as a no-op rather than a duplicate chore. One-off tasks and soft-deleted rows are exempt. The key is built from `extract()`/`lpad()` because a generated column must be immutable and a `::text` date cast is not — see **ADR-039**, which also explains why the naive form was a silent duplicate-chore bug rather than a mere compile error.
- **History is not rewritable.** Instances carry immutable title/description snapshots, so editing a template changes future occurrences only. `task_activity_log` is append-only by trigger for **every** role including `service_role` — a correction is a new entry, never an edit.
- **Household consistency is structural, not policy-dependent.** Composite foreign keys make it impossible for an occurrence to reference another household's template, for another household's profile to be recorded as the completer or assignee, or for a log entry to point at another household's occurrence.
- **Clients never hard-delete.** No DELETE policy exists on any table in the schema, and `authenticated` holds no DELETE grant. Every table soft-deletes or is append-only.
- **Soft-deleted task rows stay visible to owners and adults only** (**ADR-040**). This is not a widening for convenience: PostgreSQL applies SELECT policies to the new row of an UPDATE, so hiding deleted rows from everyone would have made soft-deletion itself impossible, and the ADR-007 restore unreachable. The first-written policy set had exactly that defect.
- **Task access is scoped by role, not by membership** (**ADR-041**). Owner/adult get the whole household including the trash; a child gets the family week minus `adult_only` chores; a guest or service provider gets **only what is actually assigned to them** — no household-wide chore visibility, and they cannot add chores at all. Access follows the **live** assignment, and every helper re-verifies standing, so a retired assignment or an expired membership revokes access immediately. `adult_only` is now a real boundary for children rather than a presentation hint. The canonical matrix is in [`06-security-and-permissions.md`](./06-security-and-permissions.md).
- **Explainability is enforced in the database.** A `rotation` assignment without both `reason_code` and `algorithm_version` is rejected by a check constraint, so "deterministic and explained, no hidden decision" holds even if a future caller forgets.
- **Attribution is separated from authority** (ADR-035). The log records the authenticated actor _and_ the acting profile; a member may attribute an entry only to themselves unless they are an owner or adult, who may act for a child. `actor_auth_user_id` is ungranted, so a client cannot forge it.
- **`anon` holds nothing** — no grant, no policy, no column privilege — and `PUBLIC` holds nothing.
- **310 structural pgTAP tests across 11 files** and **261 behavioural RLS pgTAP tests across 9 files** pass, up from 181/9 and 117/6. Every behavioural test asserts `current_user = 'authenticated'` first, because pgTAP connects as a `BYPASSRLS` owner. 48 of the behavioural tests are the ADR-041 role matrix, positive and negative for every role.
- **Seven `private` helpers now exist** — three identity (WP4) and four task-scope (WP5B) — and `080_wp4_helper_functions.sql` holds _all_ of them to the ADR-027 contract: SECURITY DEFINER, STABLE, empty `search_path`, one uuid argument, no user id, and standing re-derived from `auth.uid()`. That whole-schema invariant is what caught the two `adult_only` lookups being usable as a cross-household oracle before they shipped.
- **Three WP3/WP4 assertions were rescoped**, not weakened: the "no business-module tables" guard now proves the WP5C rotation tables have not leaked in early; the private-helper assertion now also inspects `WITH CHECK` (an INSERT policy has no `USING` clause and had been passing vacuously); and the helper catalog now covers seven functions instead of three.
- `supabase/seed.sql` remains **business-empty**; all fixtures are transactional and rolled back.
- **No RPC, no UI, no app wiring, and no change to any mock repository.** WP5B is schema and policy only. Every business module still uses the in-memory mocks; refresh-persistence is still absent.
- **Not yet applied to the hosted pilot project.** The migration is verified locally and in CI only.

## Not yet present

- Supabase schema for the **remaining business modules** (calendar, transport, follow-ups, shopping, errands). Identity & Household (WP3/WP4) and the task foundation (WP5B) now exist; nothing else does.
- The rotation tables (`rotation_rules`, `rotation_members`, `rotation_assignment_log`) — WP5C.
- Real Auth (the scaffold client has Auth intentionally inert).
- Invitation creation / revocation / acceptance RPC, role-change RPC, suspend/revoke RPC, owner-transfer RPC, household-creation RPC (all WP4.5).
- The controlled Auth account-deletion workflow and the `ON DELETE RESTRICT` change (WP4.6 — **blocks WP5 production onboarding**).
- Client access to `date_of_birth` (deferred to a sensitive-profile permission model).
- Persistence after refresh (modules still use mock repositories).
- A remote Supabase project (local-only).
- Full production deployment.
- Full E2E.
- Business backend.

Roles and PIN are **UX guards only** and are not security.

## Additional verified facts

- There are **44 route modules** (`.tsx`) under `src/routes/` — **45 tracked files** in total, since `src/routes/README.md` is documentation, not a route (verified 2026-07-30). Not all 44 are standalone navigation screens: `__root.tsx` is the root layout, and several are layout wrappers paired with an `.index.tsx` child (e.g. `tasks.tsx` + `tasks.index.tsx`). The three added since WP4 are the pilot routes `pilot.tsx`, `pilot.index.tsx` and `pilot.signin.tsx`.
- **`/` no longer redirects to `/today`.** `src/routes/index.tsx` routes by pilot session state: signed out → `/pilot/signin`, signed in → `/pilot`, unconfigured → a visible configuration error screen. The hosted product surface is the pilot, not the mock-data app.
- `src/routeTree.gen.ts` is **generated** from `src/routes/` by TanStack Start during `vite build`. It is committed and CI-verified — never edit it by hand (ADR-022).
- `src/app/` is empty (`.gitkeep` only). `src/infrastructure/` now contains the Supabase scaffold under `src/infrastructure/supabase/` (WP2); the `.gitkeep` remains.
- The modular hooks currently live mostly under `src/lib/` (e.g. `useTasks`, `useToday`), not `src/hooks/` (which holds only `use-mobile.tsx`).
- A temporary alias exists in the people directory for transport IDs (`peopleDirectory` `ALIAS_TO_CANONICAL`, `m1..m4`).
- The PWA is app-shell-only.

## Gaps between requirements and implementation

These are documented, not fixed, in WP1 (no code changes). Each is tracked in [`todo.md`](./todo.md).

| Requirement (PRD)                                                                  | Current implementation                                                                                                                                                                                                                                                  | Gap type                                                                                        |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Supabase backend; PostgreSQL is the source of truth                                | Local + hosted Supabase, the Identity & Household schema (WP3/WP4) and the task foundation (WP5B) exist, and the pilot slice reads the database. **No business module reads or writes the task tables yet** — they still use in-memory mocks                            | In progress (schema landed through WP5B; module wiring in WP5D)                                 |
| Auth + child limited sessions                                                      | Real Supabase Auth exists for **one** adult pilot identity (password sign-in). No signup, recovery, child session or PIN. Role/child selection is still UX-only. The schema supports it: `auth_user_id` is nullable for children, `pin_auth_enabled` exists as metadata | Partial (adult sign-in only)                                                                    |
| RLS on every family table                                                          | Enforced on the four identity tables (WP4) and the four task tables (WP5B), each with column-level grants and positive **and** negative tests. Task access is additionally role-scoped (ADR-041)                                                                        | Done for Identity/Household and Tasks                                                           |
| Permissions enforced on server                                                     | Client-side guards only; bypassable via devtools                                                                                                                                                                                                                        | Technical debt / mock only                                                                      |
| Persistent tasks, transport, follow-ups, shopping, etc.                            | Mock repos, lost on refresh                                                                                                                                                                                                                                             | Mock only                                                                                       |
| Sensitive actions via RPC/server                                                   | Performed in-memory in the client                                                                                                                                                                                                                                       | Not yet implemented                                                                             |
| Notifications via worker (intent, dedupe, escalation)                              | Notification screen is UI-only; no delivery                                                                                                                                                                                                                             | Mock only                                                                                       |
| Full offline sync with `client_operation_id`                                       | App-shell-only PWA; no offline data or sync queue                                                                                                                                                                                                                       | Not yet implemented                                                                             |
| Architecture `src/app/`, `src/infrastructure/` populated; hooks under `src/hooks/` | Both dirs empty; hooks under `src/lib/`                                                                                                                                                                                                                                 | Technical debt (documented; no refactor in WP1)                                                 |
| `peopleDirectory` canonical IDs                                                    | Temporary transport-ID alias table still present                                                                                                                                                                                                                        | Technical debt                                                                                  |
| PWA `sw.js` in the deployed output dir                                             | Generated to `dist/`, not `.output/public` in local/CI builds                                                                                                                                                                                                           | Technical debt (deferred; see [`LOVABLE_KNOWN_LIMITATIONS.md`](./LOVABLE_KNOWN_LIMITATIONS.md)) |

## Blockers and risks (2026-07-30)

Ordered by what they cost if left alone.

1. ~~ADR-038 is unmerged.~~ **Resolved 2026-07-30** — PR #10 merged as `b9c603b`.
2. **Signup is open on the hosted pilot project — and cannot be closed from this machine.** Recorded in [`todo.md`](./todo.md) on 2026-07-26. The repository is public and the hosted URL and publishable key are committed, so a stranger can create an Auth account. WP4 RLS gives such an account no data and the pilot ships no signup flow, so this is an unnecessary surface rather than a data leak.

   **Verified 2026-07-30:** the Supabase CLI on this machine is authenticated to a **different account** — `bunx supabase projects list` returns five unrelated projects and **not** `tori-family-pilot`, whose ref is recorded in the git-ignored `supabase/.temp/linked-project.json`. The pilot lives in a personal organisation the current token cannot reach, so the Management API cannot be used and no attempt was made to work around it. **This is the one remaining manual action:** _Supabase Dashboard → the `tori-family-pilot` project → Authentication → Providers → Email → disable new user signups._ Do not disable sign-in for the existing pilot adult, and change no other provider.

3. **WP4.6 still blocks production.** `household_members.auth_user_id` remains `ON DELETE CASCADE` (ADR-031): deleting an Auth account silently removes membership rows and can leave a household ownerless. It does not block the non-production pilot.
4. **The database gates were last observed in CI on 2026-07-26**, where they passed at the audited commit. They have not been run locally since; doing so needs Docker and a `supabase db reset`. The individual pgTAP and integration numbers in this document are carried forward, not re-counted.
5. **No business persistence exists anywhere.** Fourteen capability areas are mock-only and a refresh discards all of them. The domain and UI layers are real and tested; the storage layer beneath them is not.
6. **Documentation drifted within four days of the last commit** — test counts, route counts, lint counts, "client is scaffold only" and "Supabase is local-only" were all wrong. The end-of-task documentation rule in [`claude-context.md`](./claude-context.md) held for every merged work package and was missed on the final three commits, which are the ones still unmerged.

## Recommended next action

**WP5B — Task and recurrence foundation is complete and merged** (PR #12, `b2834b8`, 2026-07-31). The ADR-038 merge that blocked it is done.

**Next is WP5C — child rotation foundation**, specified in [`PILOT_WEEKLY_CHORES.md`](./PILOT_WEEKLY_CHORES.md) §9 and §12, with approved schedules and staggered cursors in ADR-036 and acceptance criteria in [`todo.md`](./todo.md).
