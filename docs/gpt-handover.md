# GPT Handover

Continuity for GPT conversations about Tori. Read alongside [`claude-context.md`](./claude-context.md) and [`project-status.md`](./project-status.md).

---

## Resume here — verified 2026-08-01, 19:05 Asia/Jerusalem

**Tori** is a Hebrew-first, RTL, mobile-first **Family Operations Hub**. Supabase/PostgreSQL is the source of truth; authorization is server-side through RLS; the current milestone is a **non-production** Family Pilot for weekly child chores.

### Canonical source map — link, don't duplicate

| Need                                   | File                                                         |
| -------------------------------------- | ------------------------------------------------------------ |
| Fast resume snapshot                   | [`ai/CURRENT_STATE.md`](./ai/CURRENT_STATE.md)               |
| Ordered plan, with completion evidence | [`ai/NEXT_STEPS.md`](./ai/NEXT_STEPS.md)                     |
| How an agent should behave             | [`ai/CLAUDE_INSTRUCTIONS.md`](./ai/CLAUDE_INSTRUCTIONS.md)   |
| Verified state, in narrative           | [`project-status.md`](./project-status.md)                   |
| Decisions (the only log)               | [`decisions.md`](./decisions.md)                             |
| Backlog                                | [`todo.md`](./todo.md)                                       |
| Business truth                         | [`01-product-requirements.md`](./01-product-requirements.md) |
| Pilot scope and open owner decisions   | [`PILOT_WEEKLY_CHORES.md`](./PILOT_WEEKLY_CHORES.md)         |

### Verified state

`main` @ **`0523f22`**, clean, in sync, no open PRs, last four CI runs green.

**Backend is ready.** All 5 migrations applied to `tori-family-pilot` (`nrfelnchbmofwrfajfai`). Hosted rows: 68 occurrences, 68 assignments, 68 rotation decisions, 3 templates, 3 rules, 6 participants. The week of 2026-07-26 → 2026-08-01 has 17 occurrences across all seven days, every one assigned with a reason code and algorithm version. Auth: password sign-in on, public signup off.

**Frontend is not.** The live origin at `https://home-flow-joy.lovable.app/` serves a bundle that **predates PR #18** — verified by fetching every referenced asset. The weekly chores module and the restored navigation are merged but **not live**.

### The one unresolved issue

**Lovable has not rebuilt since PR #18.** That is the whole blocker.

### Exact first action

Press **Publish / Update** in Lovable, then confirm with the curl check in [`todo.md`](./todo.md). Only then verify the live flow in a browser at 360px and 390px — which additionally needs the hosted pilot adult's password, unavailable in the last verified environment.

### Facts that need re-verification before you rely on them

- **Live deployment freshness** — the whole blocker; check it first, it may have been published since.
- **Supabase CLI access** to the hosted project. It vanished and returned twice on 2026-08-01; a 403 on the login-role endpoint is that, not a new fault.
- **The generated window ends 2026-08-22.** After that the weekly view empties unless `pilot:week:hosted` is re-run. There is no scheduler.

### Warnings — regressions this project has already had

- A pilot screen rendered outside `AppShell` became the root redirect and made forty routes unreachable **without a single file being deleted** (ADR-045).
- `workbox.navigateFallback` served the offline page to every navigation on a working connection (ADR-042).
- "אין חיבור לרשת" was used as a generic failure message, telling the family their network was down when the real fault was a disabled Auth provider or a missing table (ADR-042).
- Merged work was twice reported as live. **Merged ≠ deployed ≠ verified.**

### Operating preferences

Work autonomously; no routine approval requests. Report with evidence — commands, output, counts — and never claim a command passed unless it ran. Long deliverables are exported as Markdown to `%USERPROFILE%\Documents\Tori-Claude-Outputs\` and opened in VS Code, with only a concise summary and the file path in chat. Any change touching auth, RLS, schema, migrations, env vars, service-role keys or deployment needs an Approval Brief first.

### Recommended sequence

1. Publish from Lovable _(human access)_
2. Verify the live flow at 360/390px _(needs the pilot password)_
3. Keep the occurrence window rolling — `pilot:week:hosted` _(autonomous)_
4. Build quick chore creation and editing, §8 _(autonomous)_
5. WP4.5 identity RPCs, then WP4.6 account deletion — the latter blocks production

---

## State as of 2026-07-30 (repository audit — historical)

Verified against the repository, not against chat history.

- **Audited:** commit `17f1ebd` on branch `wp5a-lovable-published-env`, in sync with its remote, working tree clean.
- **Nothing has changed since 2026-07-26.** No commits in the last four days; the last work was the ADR-038 tracked-`.env` change.
- **What changed since 24 July** — the date of the previously assumed state: the project went from "documentation library only" to a working hosted pilot. WP3 (identity schema), WP4 (RLS, grants, negative tests), WP5A (pilot access and bootstrap), the hosted conversion (ADR-037) and the published-build environment fix (ADR-038) all landed between 25 and 26 July. Anyone still working from a 24 July picture is a full milestone behind.
- **One thing needs the product owner and genuinely cannot be done here:** signup is still enabled on the hosted Supabase pilot project, and the repository is public. RLS gives such an account no data and the pilot ships no signup flow, so it is an unnecessary surface rather than a leak. It was attempted on 2026-07-30 and is **not reachable** — the Supabase CLI on the development machine is authenticated to a different account that cannot see `tori-family-pilot`, which lives in a personal organisation. It is a dashboard toggle only the owner can flip.
- **The outstanding merge is done.** **PR #10** (`wp5a-lovable-published-env` → `main`) had been open since 26 July; it was merged on 2026-07-30 as `b9c603b` and its branch deleted. `main` now carries the Supabase configuration, so a published Lovable build reaches the pilot rather than an error screen.
- **Current work: WP5B — task and recurrence foundation**, the first persistent business tables in the project.
- **Corrected counts:** 210 app tests across 24 files (documentation said 162 across 19); 44 route modules (said 41); lint 0 errors / 7 warnings (said 6). The database suites were **not** re-run locally — Docker was down and re-running them requires a `db reset`, which the audit did not permit — but the CI `database` job passed on PR #10 at the audited commit.

## Current continuity state

- **Lovable is complete** — the prototype was built there.
- **GitHub is connected.**
- **Claude Code is active.**
- The **Repository Acceptance Audit is complete.**
- **WP0 (Foundation Fixes) and WP1 (Knowledge Pack) are complete and merged to `main`.**
- **WP2 (Supabase Local Workflow) is complete and merged to `main`** via PR #3 (merge commit `9e691c9`), with both checks (`verify`, `database`) green.
- A **post-WP2 consistency pass** followed (PR #4): the committed generated route tree was brought in sync with the generator, CI now verifies its freshness (`routes:check`, ADR-022), and stale documentation counts were corrected.
- **WP3 (Identity & Household Schema) is complete and merged to `main`**: enums `household_role` + `household_membership_status` and tables `households`, `member_profiles`, `household_members`, `household_invitations`, with household consistency enforced by composite foreign keys and `household_id` immutability. **102 pgTAP tests** (`bun run db:test`) run in the CI `database` job.
- **The WP3 tables are deliberately locked down (ADR-023):** RLS enabled, **zero policies**, all privileges revoked from `PUBLIC`/`anon`/`authenticated`. No Auth, no RPC, no PIN credentials (ADR-025), and no module reads or writes them.
- **Supabase toolchain (WP2, as delivered):** locked CLI dev dependency (`2.109.1`) + `@supabase/supabase-js` (`2.110.8`), `supabase/` (config + migrations + business-empty seed), a typed infrastructure client, `db:*` scripts, and a CI `database` job. Local `project_id = tori-family-hub`, app URL `http://localhost:8080`, ports remapped to `553xx`. **At the time of WP2** there was no remote project, no business schema, no Auth and no RLS — all four statements have since been overtaken by WP3, WP4, WP5A, ADR-037 and WP5B, and **none of them is still true**. **210/210 app tests pass across 24 files**; app gates green.
- **WP4 (RLS, grants and negative tests) is complete and merged to `main`**: three `private` authorization helpers, minimum column-level grants, six policies, 181 structural + 117 behavioural pgTAP tests, 34 Auth-backed integration assertions. No RPC, no Auth UI, no app wiring.
- **WP5A (pilot access and local bootstrap) is complete and merged.** Environment-guarded idempotent bootstrap, one authenticated adult identity, four profiles, local sign-in and profile selector — no migration and no RLS change (ADR-035). Approved chore schedules and staggered rotation are recorded in ADR-036.
- **The pilot is hosted** (ADR-037): Lovable hosts the frontend only; the dedicated non-production Supabase project is the exclusive backend; no Lovable Cloud database; Docker is not required for family use.
- **Published Lovable builds read a tracked root `.env`** holding only the two browser-public Supabase values (ADR-038), because published builds do not receive ignored files. The allowlist is enforced by `check:client-secrets` and by test.
- **WP5B (task and recurrence foundation) is complete and merged to `main`** (PR #12, merge commit `b2834b8`, 2026-07-31), and **applied to the hosted pilot project on 2026-08-01**. Four tables (`task_templates`, `task_instances`, `task_assignments`, `task_activity_log`) and eight enums, with structure, column-level grants and the full RLS policy set in one migration. Deterministic `occurrence_key` makes generation idempotent; instance snapshots are immutable; the activity log is append-only for every role including `service_role`; no client can hard-delete anything. **310 structural + 261 behavioural pgTAP.** Three traps were found and fixed while validating it — **ADR-039** (a generated column must be immutable, so a date-to-text cast is unusable), **ADR-040** (Postgres checks SELECT policies against an UPDATE's new row, so a row cannot be updated into invisibility and soft-delete needed role-scoped visibility) and **ADR-041** (membership alone is not a read predicate: task access is scoped by role, so a guest or service provider sees only what is assigned to them). Still no RPC, no task UI, no module wiring.
- **The hosted offline-screen outage is fixed** (ADR-042). The app showed "אין חיבור לרשת כרגע" on a working connection because `workbox.navigateFallback: "/offline.html"` generated a `NavigationRoute` that answered every navigation from the precache and shadowed the network-first route, so the application never ran. Fixed by removing the navigation fallback (offline is now reached only via `precacheFallback`, after a genuine failure), unit-testing the routing rules in `src/lib/pwa/workboxOptions.ts`, self-healing `public/offline.html`, and classifying failures in `src/lib/errors/classifyError.ts` so auth, permission, schema, config, timeout and server faults each get their own honest Hebrew message. `bun run check:bundle-endpoints` now proves the published bundle points only at the remote https Supabase project.
- **WP5C (rotation) and WP5D (weekly chores UI) are complete and merged.** The rotation cursor is a stored column, allocation is idempotent by unique index, and every decision stores its reason code, algorithm version and the exact sentence shown (ADR-043). The weekly view renders the real Sunday→Saturday family week with completion, audited reopen and honest error states.
- **WP5D is safe to run against the CURRENT hosted schema** (ADR-044). A capability probe asks once whether WP5B/WP5C exist; while they do not, the family sees a calm "שדרוג הפיילוט ממתין" screen rather than an error, and the real view switches itself on with no redeploy once the migrations land.
- **A live regression was fixed on 2026-08-01** (ADR-045). The root route had been sending every signed-in person to `/pilot`, a screen outside `AppShell`, so the whole product became unreachable without a single file being deleted. Root now goes to `/today`, the weekly chores are a module at `/chores` inside the shell, and `/pilot` links back into the app.
- **The weekly view was empty because definitions are not occurrences.** `pilot:week` / `pilot:week:hosted` now generate the dated window from `shifts.v1`, idempotently.
- **The hosted backend is done.** All five migrations are applied to `tori-family-pilot`, the occurrence window is generated through 2026-08-22, and public signup is off. **The one remaining blocker is that Lovable has not rebuilt since PR #18**, so the live origin still serves a pre-shell-restore bundle. See the resume section at the top of this file.
- **WP4.5** (Identity RPCs) and **WP4.6** (Auth account deletion) remain required, just not next. ⚠️ WP4.6 still **blocks production onboarding and any account-deletion capability** — `auth_user_id` is still `ON DELETE CASCADE` (ADR-031). It does not block the non-production pilot.
- **Pilot household data is local and uncommitted** (ADR-034): real names and ages live only in a git-ignored `pilot-household.local.json`.

## Resume checklist

1. `git checkout main && git pull --ff-only`.
2. To run Supabase locally: start Docker, `bun run supabase:start`, then copy the URL + publishable key from `bun run supabase:status` into `.env.local` (git-ignored).
3. Sanity gates: `bun install --frozen-lockfile` → `typecheck` → `lint` (0 errors, 6 warnings) → `test` (**210 across 24 files**) → `build` → `routes:check` → `check:client-secrets` → `check:pilot-privacy` → `pilot:test:hosted-guard`; database side: `bun run db:verify` (reset → type freshness → smoke → 310 structural pgTAP → Auth fixtures → 261 behavioural pgTAP → 34 integration assertions → 29 pilot assertions → cleanup).
4. Continue the **Family Pilot** per [`PILOT_WEEKLY_CHORES.md`](./PILOT_WEEKLY_CHORES.md). WP5A → WP5D are done; the next work is live verification, then quick chore creation and editing.

## Ground rules for any GPT-authored task

- The PRD ([`01-product-requirements.md`](./01-product-requirements.md)) is the single business source of truth.
- Do not start a business module before Identity, Household, and RLS are stable.
- Every schema change requires a migration; every RLS change requires positive and negative tests.
- Never hand-edit a generated file (`src/routeTree.gen.ts`, `src/infrastructure/supabase/database.types.ts`) — regenerate it (ADR-022).
- Never write to `auth.users` with SQL. Test users are created through the Auth admin API.
- Never grant a client write on `household_members` or `household_invitations` — those mutations are RPC-only (ADR-028).
- Never add an authorization helper to `public`, and never give one a user-id parameter (ADR-027).
- No PIN credential material on `member_profiles` (ADR-025); the role lives on `household_members` and there is no `user_roles` table (ADR-024).
- No service role in the browser; `localStorage` is not a source of truth.
- Update the state docs at the end of every task.

See [`todo.md`](./todo.md) for the WP2 → WP5 order.
