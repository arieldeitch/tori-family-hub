# Decisions (ADRs)

Approved decisions and their history. Every decision below has status **Accepted** unless marked otherwise. A future decision that replaces an earlier one is not deleted — it is marked **Superseded**. Do not modify an existing business ADR to match the code.

This is the canonical decision log. The prototype-era `LOVABLE_DECISIONS.md` records implementation-level ADRs (D1–D13) for the as-built app and does not override these.

| ADR     | Decision                                                                                                                                                                                                 | Status   |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| ADR-001 | Tori is a Family Operations Hub.                                                                                                                                                                         | Accepted |
| ADR-002 | The PRD ([`01-product-requirements.md`](./01-product-requirements.md)) is the single business source of truth.                                                                                           | Accepted |
| ADR-003 | The Today screen is the default.                                                                                                                                                                         | Accepted |
| ADR-004 | Template and instance are separate entities.                                                                                                                                                             | Accepted |
| ADR-005 | An active task needs responsibility, a due time, or a follow-up.                                                                                                                                         | Accepted |
| ADR-006 | Rotation is deterministic and explained.                                                                                                                                                                 | Accepted |
| ADR-007 | Soft delete with 48 hours of restore.                                                                                                                                                                    | Accepted |
| ADR-008 | Hebrew and RTL from day one.                                                                                                                                                                             | Accepted |
| ADR-009 | Supabase is the default backend.                                                                                                                                                                         | Accepted |
| ADR-010 | PostgreSQL is the source of truth.                                                                                                                                                                       | Accepted |
| ADR-011 | Multiple critical changes are atomic.                                                                                                                                                                    | Accepted |
| ADR-012 | Permissions are enforced on the server and in RLS.                                                                                                                                                       | Accepted |
| ADR-013 | A child does not require email; PIN is limited access.                                                                                                                                                   | Accepted |
| ADR-014 | Transport is an independent module.                                                                                                                                                                      | Accepted |
| ADR-015 | `waiting_external` requires a next follow-up or an opt-out.                                                                                                                                              | Accepted |
| ADR-016 | Notifications are intent-based with dedupe and escalation.                                                                                                                                               | Accepted |
| ADR-017 | Full offline is not a condition for MVP.                                                                                                                                                                 | Accepted |
| ADR-018 | Points and competition are not the core of the product.                                                                                                                                                  | Accepted |
| ADR-019 | Development starts only with product-owner approval.                                                                                                                                                     | Accepted |
| ADR-020 | A coding agent works in a closed task and updates the handover.                                                                                                                                          | Accepted |
| ADR-021 | Supabase runs local-first: the CLI is a locked dev dependency, migrations in the repo are the only way to change schema, and remote projects are configured separately later.                            | Accepted |
| ADR-022 | Generated files are committed as source, reproducibly generated, CI-verified fresh, and never hand-edited.                                                                                               | Accepted |
| ADR-023 | WP3 ships schema with RLS enabled, zero policies and no client privileges; WP4 opens access with the minimum GRANTs and the complete policy set together.                                                | Accepted |
| ADR-024 | The household role lives on `household_members`, which is the dedicated membership/authorization table. There is no `user_roles` table.                                                                  | Accepted |
| ADR-025 | PIN credential material is never stored on `member_profiles`. Future credentials live in an unexposed `private.member_pin_credentials`, reachable only through a secured server/RPC boundary.            | Accepted |
| ADR-026 | A household may have multiple active owners. Protecting the last active owner is the responsibility of future RPCs, not a database constraint.                                                           | Accepted |
| ADR-027 | Authorization helpers live in a non-exposed `private` schema, are SECURITY DEFINER with a fixed empty `search_path`, and never accept a user id.                                                         | Accepted |
| ADR-028 | Membership and invitation mutations are RPC-only. No client may insert, update or delete `household_members` or `household_invitations`.                                                                 | Accepted |
| ADR-029 | Column-level grants protect sensitive data. `date_of_birth`, `token_hash`, `auth_user_id` and audit columns are unreachable through ordinary table grants.                                               | Accepted |
| ADR-030 | `service_role` holds DML on the identity tables for server-side administration and deterministic test fixtures only; its key never reaches the browser.                                                  | Accepted |
| ADR-031 | `household_members.auth_user_id ON DELETE RESTRICT` is deferred to WP4.6, which blocks production account deletion and onboarding until it lands.                                                        | Accepted |
| ADR-032 | The structural and Auth-backed database suites are separated, and the shared `seed.sql` stays business-empty.                                                                                            | Accepted |
| ADR-033 | Family Pilot (Weekly Child Chores) is the next milestone. In-app user management is deferred **for the pilot only** and the long-term Auth, PIN, invitation and permission requirements stand unchanged. | Accepted |
| ADR-034 | Personal pilot data never enters a migration or the shared seed. It is loaded by an environment-guarded, idempotent bootstrap, and pilot mode is non-production unless separately hardened and approved. | Accepted |
| ADR-035 | The temporary pilot access model: one authenticated adult identity, four profiles, and a profile selector that is attribution/display only.                                                              | Accepted |
| ADR-036 | Approved pilot chore schedules and per-chore staggered rotation cursors. Editable defaults, not permanent product rules.                                                                                 | Accepted |
| ADR-037 | Lovable hosts the frontend only; Supabase remains the exclusive backend. Lovable Cloud database is rejected. Supersedes the local-only runtime hosting of ADR-033/ADR-034, nothing else.                 | Accepted |
| ADR-038 | The two browser-public Supabase values are committed in a tracked root `.env`, because published Lovable builds do not receive ignored files. An enforced allowlist keeps everything else out.           | Accepted |

## ADR-021 — Supabase local workflow (WP2)

- The Supabase CLI is installed as a **locked local dev dependency** (`supabase` in `devDependencies`), run via `bunx supabase` — not a global install. `@supabase/supabase-js` is a runtime dependency.
- The workflow is **local-first**: `supabase/config.toml`, `supabase/migrations/`, and `supabase/seed.sql` live in Git and are the source of truth for the local database.
- **Migrations in the repo are the only way to change schema.** No manual schema changes in Studio/Dashboard as a substitute for a migration.
- **Remote Supabase projects are configured later and separately.** WP2 links to no remote project, runs no `supabase login`/`link`/`db push`, and adds no secrets.
- The generated `src/infrastructure/supabase/database.types.ts` is a build artifact — regenerated by `bun run db:types`, never edited by hand; CI checks it is up to date.

This is a technical/tooling decision under the existing business ADRs (notably ADR-009 Supabase backend, ADR-010 PostgreSQL source of truth). It introduced no new business ADR and changed no existing one.

## ADR-022 — Generated files are committed, reproducible and CI-verified (post-WP2)

Applies to every generated file the app compiles against — currently `src/routeTree.gen.ts` (TanStack Start route tree) and `src/infrastructure/supabase/database.types.ts` (Supabase types).

- **Committed as generated runtime source.** These files are checked into Git, not produced on the fly at install time, so a clean checkout typechecks and builds without first running a generator or a database.
- **Generation is reproducible and belongs to project tooling.** The route tree is generated by the project's own build (`vite build`, via the TanStack Start plugin); the database types are generated by `bun run db:types` against the local stack. Generation must be a fixed point — running it twice produces an identical file.
- **CI verifies freshness.** The `verify` job runs `bun run routes:check` immediately after `build` and fails if the build changed the committed route tree. The `database` job runs `bun run db:types:check` and fails if the committed types no longer match the migrated schema. A stale generated file is a failing build, not a silent drift.
- **Never edited by hand.** Fix the source (a route file, a migration) and regenerate. This is the existing "no manual edit of generated files when a generator exists" rule in [`04-development-principles.md`](./04-development-principles.md), made enforceable.
- **No new dependency.** The check uses the installed toolchain and `git diff`; no route-generator CLI was added.

Background: before this decision, `src/routeTree.gen.ts` was committed without the TanStack Start `Register` module augmentation that the build generates, so every `vite build` left an unexpected tracked modification in the working tree. This is a tooling/build decision under the existing development principles; it introduced no business ADR and changed none.

## ADR-023 — WP3 ships locked down; WP4 opens access (WP3)

The Identity & Household migration creates tables in a deliberately unreachable state:

- **RLS is enabled** on `households`, `member_profiles`, `household_members` and `household_invitations`.
- **Zero RLS policies exist.** With RLS enabled and no policies, every row is denied to any non-bypassing role — the schema fails closed rather than open.
- **All table privileges are revoked from `PUBLIC`, `anon` and `authenticated`**, which also strips the Supabase default privileges that would otherwise expose these tables through the Data API. WP3 grants no Data API access at all.
- Privileges of `postgres`, the table owner, `service_role` and other Supabase infrastructure roles are **not** indiscriminately revoked — migrations, type generation and pgTAP must keep working.

**WP4 is the opening step**: it adds the _minimum_ required `GRANT` statements together with the complete RLS policy set, in the same migration, with positive **and** negative tests.

This is a sequencing decision under [`06-security-and-permissions.md`](./06-security-and-permissions.md), which requires that a table never exist in a reachable state without policies. Splitting the work this way is stricter than granting first and adding policies later: between WP3 and WP4 the tables are reachable by nobody.

## ADR-024 — The membership row is the authorization table (WP3)

`household_members` carries `role`, and is the dedicated membership/authorization table.

- The role is **household-scoped**, not global: the same person can be `owner` in one household and `guest` in another.
- The role is **never** stored on `member_profiles` — a profile is a person, not a permission.
- There is **no `user_roles` table**. `household_members` already is the dedicated table that [`06-security-and-permissions.md`](./06-security-and-permissions.md) calls for; adding a second one would split the same fact across two places.
- `has_household_role` and related `SECURITY DEFINER` helpers are **deferred to WP4**. When they arrive they must use a fixed, safe `search_path` (as the WP3 trigger functions already do) so they cannot be hijacked.

## ADR-025 — PIN credentials never live on the profile row (WP3)

**This deliberately supersedes the `pin_hash` field shown on `member_profiles` in earlier drafts of [`05-data-model.md`](./05-data-model.md).** The data-model document has been corrected; the old design is not silently retained.

- `member_profiles` has **no `pin_hash`** and no other credential column. Household members will eventually be able to read profile rows, and credential material must never sit on a row with that reach.
- `member_profiles.pin_auth_enabled` remains as **non-sensitive configuration metadata only**, defaulting to `false`. It authenticates nothing.
- Future PIN credentials belong in an **unexposed `private.member_pin_credentials`** table with **no client grants**, reachable only through a secured server/RPC boundary that owns rate limiting and lockout.
- **Enabling PIN must later be atomic with creating a valid credential**, so `pin_auth_enabled = true` can never mean "PIN is on but no credential exists".
- No PIN verification and no credential creation exists in WP3.

## ADR-026 — Multiple active owners are legal (WP3)

A household may have more than one active `owner`.

- No partial unique index restricts a household to a single active owner.
- WP3 attempts **no** cross-row "at least one active owner" constraint. Expressing it correctly in SQL requires either a deferred constraint trigger or serialized writes, and it would block legitimate ownership handover.
- Instead, the future role-change, suspend and revoke RPCs **must prevent removal of the final active owner unless ownership is transferred atomically** in the same transaction.

## ADR-027 — Authorization helpers live in a non-exposed `private` schema (WP4)

Every RLS policy derives authority from three helpers in `private`, never from inline SQL and never from a client-supplied value.

- **`private`, not `public`.** The Data API exposes `public` and `graphql_public` only (`supabase/config.toml`), so a helper in `public` would be callable as a PostgREST RPC endpoint. In `private` it is reachable by policies but not over HTTP. `private` contains **no tables**, and `anon` holds neither `USAGE` on the schema nor `EXECUTE` on any function.
- **The three helpers** are `is_active_household_member(uuid)`, `has_household_role(uuid, household_role[])` and `current_profile_id(uuid)`. No `can_manage_household` wrapper was created — a wrapper adds a name without adding a decision.
- **No helper accepts a user id.** Each derives the caller from `auth.uid()` alone. A `is_member(user_id, household_id)` form would be an oracle for probing other people's memberships, so the parameter simply does not exist. A test asserts no helper takes more than one `uuid` argument.
- **Properties:** `SECURITY DEFINER`, owned by `postgres`, `STABLE`, `SET search_path = ''`, fully schema-qualified, no dynamic SQL. DEFINER ownership by a `BYPASSRLS` role is what prevents infinite recursion when a policy on `household_members` must consult `household_members`.
- **One authorization predicate.** A caller has standing only when a membership row matches `auth.uid()`, its status is `active`, `access_expires_at` is NULL or in the future, the household is not soft-deleted, and the caller's own profile is active and not soft-deleted. Anything else — including a NULL `auth.uid()` — is false. Suspended, revoked and expired all fail closed.

## ADR-028 — Membership and invitation mutations are RPC-only (WP4)

`household_members` and `household_invitations` are **read-only for every client**. Neither a grant nor a write policy exists.

This single fact is what makes the following impossible rather than merely disallowed: self-insertion into a household, granting oneself a role, changing `role`, `status`, `auth_user_id`, `profile_id` or `household_id`, removing a member, creating or revoking an invitation, and accepting an invitation.

Invitation listing is **owner-only** in WP4 — not adult — because an invitation is an authority-granting artefact.

These operations arrive in **WP4.5** as authorized, audited, atomic RPCs. Invitation acceptance must derive the household and role from the token record, never from client input, and consume a use with a conditional update so concurrent redemptions cannot over-consume. Role-change, suspend and revoke RPCs must prevent removal of the final active owner unless ownership transfers atomically (ADR-026).

## ADR-029 — Column-level grants protect sensitive data (WP4)

RLS is row-level only, so column visibility is expressed as `GRANT`s on specific columns. `authenticated` holds **no table-wide privilege** on any identity table; a column added by a future migration is therefore unreadable until deliberately granted — fail closed by default.

Never granted to any client role:

- **`member_profiles.date_of_birth` — neither readable nor writable.** The proposed adults-only accessor function was explicitly **not approved**: no accessor, no view, and no assumption that every adult may see it. Read and write behaviour is deferred to a future sensitive-profile RPC or permission model (see [`todo.md`](./todo.md)).
- **`household_invitations.token_hash`** and **`created_by`** — the hash never leaves the database.
- **`household_members.auth_user_id`** — account identifiers are never readable; policies consult it only inside DEFINER helpers.
- **`households.created_by`, `deleted_at`, `deleted_by`** and `member_profiles.deleted_at`, `deleted_by`.

Readable but never writable: `pin_auth_enabled` (ADR-025), `is_child`, `is_active`, membership `role` and `status`.

## ADR-030 — `service_role` DML is server-side and test-only (WP4)

`service_role` holds `SELECT/INSERT/UPDATE/DELETE` on the four identity tables. Supabase's default privileges grant it no DML in `public`, so this is explicit and deliberate: it is the identity used for server-side administration and for creating deterministic test fixtures.

Hard conditions: the service-role key never appears in a `VITE_*` variable, in client code, in a build artefact, or in `.env.local` written by CI; it is masked in GitHub Actions before any command can emit it; it is used through a **separate** service-role client on which `signIn` is never called; and behavioural tests use separate publishable-key clients. `bun run check:client-secrets` scans `src/` and the build output for the key name patterns and, when available, the literal value, and fails the build on a hit.

Granting `service_role` DML does **not** widen client access: `anon` still holds nothing and `authenticated` still holds only the approved columns.

## ADR-031 — Deferred `ON DELETE RESTRICT` blocks production account deletion (WP4.6)

`household_members.auth_user_id` remains `ON DELETE CASCADE` after WP4. **This is not acceptable for production.** Deleting an Auth account currently deletes the membership rows — destroying revoked-membership audit history, silently removing a household's last active owner, and deleting the row that holds the least personal data while retaining `member_profiles`, which holds the most.

The approved target is **`ON DELETE RESTRICT`** plus a controlled server-side deletion workflow: revoke memberships and transfer ownership _before_ deleting the identity, with audit retention and final-active-owner protection.

It is deferred because WP4 grants no INSERT/UPDATE/DELETE on `household_members`, so no client can reach the behaviour, and no policy depends on it. **WP4.6 must complete before WP5 introduces real account deletion or production onboarding.**

## ADR-032 — Separated test suites and a business-empty shared seed (WP4)

`supabase/seed.sql` stays **business-empty**. Fixtures are created and destroyed by the test harness, never persisted into the shared seed.

The database suites are separated by path so they can run in the right order:

- `supabase/tests/database/` — structural, policy-catalog, function-property and GRANT tests. These run **before any fixture exists**, because they assert the seed is business-empty.
- `supabase/tests/rls/` — behavioural tests that depend on Auth-backed fixtures.

Auth identities are created through the **Auth admin API, never by SQL** against `auth.users`; domain rows are created with `service_role` through PostgREST. Fixture orchestration is idempotent (setup tears down first) and cleans up in a `finally` block so a failing test cannot leave residue. Fixture addresses use the non-routable `@tori.invalid` domain, and passwords are generated per run, never logged and never committed.

Because pgTAP connects as `postgres` — which has `BYPASSRLS` and owns the tables — **every behavioural test asserts `current_user = 'authenticated'` before evaluating policy results.** Without that, the suite would pass regardless of what the policies say. `FORCE ROW LEVEL SECURITY` is deliberately not enabled, so this assertion is the guard.

## ADR-033 — Family Pilot is the next milestone; user management is deferred, not removed

The product owner has changed the immediate execution priority. The next product milestone is **Family Pilot — Weekly Child Chores**: a narrow vertical slice letting the real household see and complete weekly chores. Scope in [`PILOT_WEEKLY_CHORES.md`](./PILOT_WEEKLY_CHORES.md). This supersedes the plan to begin WP4.5 immediately.

- **Full user-management UI is deferred** for the pilot — onboarding, invitation management, child PIN entry, account management. Transport, shopping and notifications are deferred too.
- **The long-term requirements remain valid and unchanged**: real Supabase Auth per adult, child limited sessions and PIN with rate limiting, lockout and adult reset, invitation create/revoke/accept, role and ownership RPCs, and full RLS on every family table (PRD §5, [`06-security-and-permissions.md`](./06-security-and-permissions.md), ADR-012, ADR-013, ADR-025, ADR-026, ADR-028). The pilot may not make any of them harder to add and may not weaken what WP4 enforces.
- **The pilot is explicitly non-production.** It runs behind an environment guard and must be impossible to enable accidentally in production.
- **PostgreSQL remains the source of truth** (ADR-010). The weekly view reads from the database, not from fixtures, and `localStorage` never becomes the source of truth.
- **`service_role` never enters browser code** (ADR-030), there are no anonymous writes, and nothing bypasses RLS.
- **The shared `supabase/seed.sql` remains business-empty** (ADR-032).
- **WP4.6 must complete before production onboarding or any account-deletion capability** (ADR-031). It does **not** block this pilot, which is non-production and ships no account management and no account deletion.

## ADR-034 — Pilot household data is local and uncommitted

The pilot household is described canonically as **two adults and two children**. The actual names and ages are local pilot data.

They must never appear in a migration, in `supabase/seed.sql`, in committed automated-test fixtures, in documentation examples, or in a source-code constant.

- Real values live in a **git-ignored** `pilot-household.local.json` at the repository root; `pilot-household.example.json` is committed with placeholders only.
- An **idempotent local bootstrap** reads that file and converges the database on the described household — safe to re-run, creating no duplicates.
- The bootstrap runs behind an **explicit environment guard**, writes through the normal authorization path, and uses no service-role key in the browser.
- **Age is product context only.** `date_of_birth` stays client-inaccessible (ADR-029); no age column is added and no dates of birth are fabricated.

## ADR-035 — Temporary pilot access model (Accepted)

**Accepted.** The Family Pilot runs on a single authenticated adult identity.

- **One real local Supabase Auth identity.** No anonymous access, no second account, no signup, no password recovery, no invitation flow.
- **The pilot owner profile is the one adult profile linked to that identity.** Exactly one membership carries a non-null `auth_user_id`; `pilot:status` asserts it.
- **The second adult and both children have no Auth identity.** Children keep `auth_user_id IS NULL`, exactly as ADR-013 intends, so real per-person identities can be attached later without a data migration.
- **Profile selection is attribution and display only.** It chooses whose week is shown. It is never sent as an authorization input, it writes nothing to the database, and it is cached only as a disposable UI preference that is re-validated against the profiles RLS actually returned.
- **Server authority always derives from `auth.uid()`.** A client-supplied profile id is never trusted. Any future write on behalf of another profile must go through a server-side use case that re-verifies household membership and records both the authenticated actor and the acting profile.
- **This is explicitly non-production.** Pilot commands fail closed unless `TORI_PILOT_MODE=local` _and_ the Supabase target independently proves to be the local CLI stack. Within one household this model cannot distinguish which family member acted — acceptable for a scheduling pilot, and precisely why child PIN and per-person identities remain required (ADR-013, ADR-025).

WP5A implemented this and required **no migration and no RLS change**: the existing WP4 policies already let the signed-in adult read their household and all four profiles.

## ADR-036 — Approved pilot chore schedules and staggered rotation (Accepted)

Approved defaults for the three initial chores. They are **editable pilot defaults, not permanent product rules**, and they are recorded here only — implementation belongs to WP5B (schedule) and WP5C (rotation).

| Chore                | Schedule                                 | Rotation starts with         |
| -------------------- | ---------------------------------------- | ---------------------------- |
| Dishwasher unloading | every day, no fixed time                 | the **first** child profile  |
| Dishwasher loading   | every day, no fixed time                 | the **second** child profile |
| Taking out the trash | Sunday, Tuesday, Thursday, no fixed time | the **first** child profile  |

- **Each chore keeps its own rotation cursor.** The two daily dishwasher chores are staggered so that on any given day one child unloads and the other loads.
- **The cursor continues across weeks and never resets on Sunday.** The trash chore therefore alternates by occurrence, and a week may end 9–8 with the split reversing the following week. That imbalance is expected and self-correcting.
- **No catch-up punishment after an absence**, and **no random assignment** — required by [`08-rotation-engine.md`](./08-rotation-engine.md) and ADR-006.
- Concrete profile order is **local pilot data** (ADR-034), never a value in this repository.

## ADR-037 — Lovable hosts the frontend; Supabase remains the only backend (WP5A hosted)

The Family Pilot moves from a localhost-only runtime to a hosted, non-production pilot. **This supersedes only the runtime-hosting portion of ADR-033 and ADR-034. Every other clause of both — deferred user management, personal data handling, non-production posture — stands unchanged.**

- **Lovable is frontend hosting and publishing only.** It builds and serves the application; it holds no data.
- **Supabase remains the exclusive backend** for PostgreSQL, Auth, RLS, migrations, RPCs and application data.
- **A Lovable Cloud database is explicitly rejected.** No second data source, no duplicated database, no divergence about where truth lives (ADR-010).
- **GitHub `main` remains the source of truth for application code.** Lovable synchronises from it; code is not authored in Lovable.
- **Docker and the local Supabase CLI stack remain development and CI infrastructure only.** Normal family use requires neither Docker nor localhost. CI keeps using the local stack, so it stays deterministic and needs no hosted secret.
- **The hosted project is explicitly non-production**: `tori-family-pilot`, its own personal Supabase organisation, deliberately separate from any company-owned project.
- **Lovable receives only browser-safe values** — the hosted Supabase URL and the publishable key. The service-role key, database password and Supabase access token are never given to Lovable, never `VITE_`-prefixed, and never committed (ADR-030).
- **Personal pilot data stays uncommitted** (ADR-034). The hosted bootstrap reads the same git-ignored local configuration; no name reaches a migration, the shared seed, a fixture or CI.
- **The hosted pilot password differs from the local one.** Two runtimes, two credentials, two credential files.
- **Hosted writes are guarded by an exact project-reference allowlist.** A declared mode alone is never sufficient: the hosted URL must itself resolve to an allowlisted reference and agree with the declared one. The local guard is unchanged and does not grant hosted access.
- **WP4.6 still blocks production onboarding and account deletion** (ADR-031). A hosted non-production pilot with no account management does not change that.
- **The weekly chores implementation remains WP5B–WP5E.** Hosting changes where the app runs, not what it does.

## ADR-038 — The browser-public Supabase values are tracked in a root `.env` (WP5A hosted)

Lovable's published, non-Enterprise builds do not receive git-ignored files. The preview worked only because an ignored root `.env` existed on the developer machine; the published app received nothing and rendered the missing-configuration screen. On this workspace Lovable confirmed that a **tracked root `.env`** is the supported path.

**Decision.** The root `.env` is committed and contains **exactly two variables**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

### Why this is not a secret leak

Both values are **public by design**. Every Supabase browser client ships them to every visitor; the moment the app is published they are readable in the bundle and in network requests. Committing them changes nothing about who can see them.

**Confidentiality of the anon key was never the control — RLS is.** WP4 verified on this hosted project that `anon` holds **zero table privileges and zero column privileges**, RLS is enabled on all four identity tables, and every policy requires an active authenticated membership. An attacker holding the URL and publishable key can reach exactly nothing.

The values that _are_ secret — service-role key, database password, Supabase access token, pilot passwords — remain out of the repository entirely and out of every browser variable (ADR-030, ADR-037).

### What keeps this safe over time

A committed `.env` is the most likely place for a secret to be added by mistake later, so the pattern is guarded rather than merely permitted:

- **`check:client-secrets` enforces an exact allowlist** on the tracked `.env`. Any other variable name fails the build, and credential-shaped values (`sb_secret_…`, `sbp_…`, JWTs) are rejected regardless of the variable name they hide behind.
- **A test pins the file's contents** — exactly the two names, a hosted `https` URL, a publishable-form key, and no credential-shaped value anywhere. It compares booleans, so a failure never prints the file.
- **`.gitignore` is narrowed, not opened.** Only the root `.env` and `.env.example` are trackable; `.env.local`, `.env.*.local` and every other `.env.*` variant stay ignored, so a local or secret-bearing file cannot be committed by accident.
- **Local development is unaffected.** `.env.local` still overrides the tracked file, so a developer keeps pointing at the local Supabase stack.

### Consequences worth stating plainly

The repository is **public**, so the hosted project reference and publishable key are now discoverable without visiting the app. This is acceptable for the reasons above, but it makes two things worth revisiting:

1. **Signup is currently enabled on the hosted project.** A stranger can create an Auth account. RLS gives such an account no data — no membership means no rows — but for a family pilot with no signup flow in the UI, disabling signup removes the abuse surface entirely. Recommended, and deliberately **not** changed here because Supabase configuration was out of scope for this task.
2. If the hosted project is ever rotated or replaced, the tracked `.env` must be updated in the same change as the allowlist in `check-client-secrets.ts`.

Nothing else changes: Lovable remains frontend-only, Supabase remains the exclusive backend, and no Lovable Cloud database exists (ADR-037).

## ADR-039 — `occurrence_key` is built from immutable date parts, never a `::text` cast (WP5B, Accepted)

`task_instances.occurrence_key` is a stored generated column, `template_id:YYYY-MM-DD`, and it is what makes recurrence generation idempotent: two clients generating the same (template, date) cannot disagree about the key, and the partial unique index turns a concurrent double-generation into a constraint violation the caller treats as a no-op.

The obvious expression, `template_id::text || ':' || occurrence_date::text`, **cannot be used**. A generated column must be `IMMUTABLE`, and date-to-text is only `STABLE` — `date_out` reads the `DateStyle` GUC. PostgreSQL rejects the migration outright with `42P17 generation expression is not immutable`.

That error is a gift. Had the cast been allowed, the same day would render `2026-08-03` under one session's `DateStyle` and `03/08/2026` under another, producing **two different keys for one occurrence** — precisely the disagreement the column exists to prevent, and a silent duplicate-chore bug rather than a loud failure.

**Decision.** Build the date from `extract()` and `lpad()`, both immutable, so the key is ISO-8601 for every session regardless of `DateStyle`. Zero-padding is part of the contract: keys must compare lexicographically.

A pgTAP test inserts under `DateStyle = 'SQL, DMY'` and asserts the ISO key, so the property is pinned rather than assumed.

**Alternative rejected.** Dropping the column and making the partial unique index cover `(household_id, template_id, occurrence_date)` gives the same uniqueness guarantee, but loses the single readable identity that `ON CONFLICT` targeting, logs and debugging use. The column is cheap; the expression is the only subtle part, and it is now documented and tested.

## ADR-040 — A soft-deleted task row stays visible to owners and adults (WP5B, Accepted)

**PostgreSQL applies a table's SELECT policies to the NEW row of an UPDATE, not only to the old one.** A row therefore cannot be updated into invisibility. A SELECT policy of the form `deleted_at is null and is_active_household_member(...)` makes soft-deletion _impossible_: the UPDATE that sets `deleted_at` produces a row the caller may no longer see, and the statement fails with `new row violates row-level security policy`.

The WP5B migration as first written had exactly this shape on `task_templates` and `task_instances` — it granted `deleted_at` on UPDATE and its policy comments promised soft-delete and restore, while the policies made both unreachable. Verified against a minimal two-policy probe table, not inferred.

**Decision.** Scope soft-deleted visibility by role instead of hiding it from everyone:

- **Owners and adults keep seeing soft-deleted templates and occurrences.** That _is_ the trash view, it is what the existing `/templates/trash` route needs, and it is the only way the ADR-007 48-hour restore is reachable at all — you cannot restore a row you cannot select.
- **Children, guests and service providers see live rows only.**
- On `task_instances` the UPDATE policy's `WITH CHECK` states the owner/adult requirement for `deleted_at` explicitly. Completing and reopening stay open to every active member; **removing** a chore from the week is an owner/adult act. Stated in the policy so a child attempting it gets a clear refusal instead of the confusing new-row error.

**This narrows nothing that was previously open**, and household isolation is untouched: every branch still derives standing from `auth.uid()` through the WP4 `private` helpers. Positive and negative tests cover both the adult trash/restore path and the non-adult refusal.

**Consequence for future tables.** Any table combining a `deleted_at` SELECT filter with a client-writable `deleted_at` inherits this trap. Prefer this role-scoped shape, or move soft-deletion into an RPC.

## ADR-041 — Task access is scoped by role, not by membership (WP5B, Accepted)

Supersedes the open question ADR-040 first recorded. The initial WP5B policies used `private.is_active_household_member` alone, which is **role-agnostic**: any active member — including a guest or a service provider — read the household's entire chore list, its assignments and its history. WP4 had already rejected that shape for identity, narrowing `member_profiles` and `household_members` so a guest or service provider sees **only their own row**. Tasks were inconsistent with the rest of the schema.

**Decision.** Membership is the outer gate; the read predicate is the caller's **role**, in three scopes:

| Scope                        | `task_templates`                                    | `task_instances`                                                  | `task_assignments`                        | `task_activity_log`                            |
| ---------------------------- | --------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------- |
| **owner / adult**            | all, **including soft-deleted** (trash)             | all, including soft-deleted                                       | all                                       | all                                            |
| **child**                    | live, **excluding `adult_only`**                    | live family week, excluding occurrences of `adult_only` templates | all, excluding adult-only chores          | history of what they can see                   |
| **guest / service provider** | only templates they hold a **live assignment** from | only occurrences **assigned to them**                             | only rows where **they are the assignee** | only history of their own assigned occurrences |

Writes follow the same scope: owner/adult define templates and assignments; owner/adult/child may generate or quick-add an occurrence and complete one in scope; a guest or service provider may complete **only** the occurrence assigned to them, and may add nothing. Soft-delete and restore stay owner/adult everywhere. No client holds `DELETE` on anything.

### Why the child keeps the family week

A child is **not** narrowed to their own assigned chores. `PILOT_WEEKLY_CHORES.md` §3 and §13 make "the family view shows both children's chores" an acceptance criterion, so per-child read scoping would break the approved product. The child's correct scope is the family week **minus adult-only chores**, which is exactly what `06-security-and-permissions.md` already required: _"a child does not see `adults_only` or `restricted` data."_

### `adult_only` becomes a real boundary

It was documented as a presentation hint that "RLS never consults". It is now enforced for children. That is safe: only an owner or adult can write `task_templates` at all, so a child cannot clear the flag to reveal a row. It is **not** a general secrecy flag — a guest or service provider explicitly assigned an adult-only chore can still see and complete it, because they have to do the work.

### Implementation

Four new `private` helpers (ADR-027 contract — SECURITY DEFINER, STABLE, `search_path = ''`, exactly one uuid argument, no user id): `is_assigned_to_task_instance`, `is_assigned_to_task_template`, `is_task_template_adult_only`, `is_task_instance_adult_only`.

Two properties worth keeping in mind:

- **Access follows the LIVE assignment.** Only `proposed` and `accepted` count. Once an assignment is `reassigned` or `declined` the former assignee loses access to the chore immediately, while still seeing their own historical assignment row — their record, not somebody else's.
- **Standing is re-verified inside every helper**, so a suspended or expired assignee loses access at once without anybody rewriting assignment rows. The `adult_only` lookups are scoped to the caller's household for the same reason: a bare lookup would have been a one-bit oracle over arbitrary ids. `080_wp4_helper_functions.sql` enforces this contract over **every** function in the schema, which is what caught it.

**No pilot impact.** The pilot household is two adults and two children, with no guest or service-provider profile, so nothing that worked before stops working.

Covered by 48 dedicated behavioural tests in `supabase/tests/rls/180_task_role_scope_rls.sql`, positive and negative for every role.

## ADR-042 — The offline screen is a fallback, and "no network" is a claim we must earn (Accepted)

The hosted app showed **"אין חיבור לרשת כרגע"** on a healthy connection, permanently. Two separate faults, one visible symptom.

### Fault 1 — the service worker never let the app run

`vite.config.ts` set `workbox.navigateFallback: "/offline.html"`. That reads like "show the offline page when offline". It is not what Workbox does with it. It generates:

```js
registerRoute(new NavigationRoute(createHandlerBoundToURL("/offline.html"), …))
```

which serves the **precached** offline page for **every** navigation, online or not. Worse, Workbox matches routes in registration order and this route is emitted **before** `runtimeCaching`, so the `NetworkFirst` navigation route beneath it was unreachable dead code. With `skipWaiting` and `clientsClaim`, the worker took control immediately, so from the first controlled navigation onward the application never executed at all. Nothing was "classifying" the failure as offline — the classifier never ran.

**Decision.** No `navigateFallback`, ever, in this app. The offline page is reached **only** through `precacheFallback` on the navigation route, which runs after the handler has genuinely failed. A reachable server always wins.

`navigateFallback` must also be set explicitly to `undefined`, because vite-plugin-pwa defaults it to `"index.html"` — wrong twice here: this is a server-rendered TanStack Start app with no static `index.html`, so the precache manifest has no such entry and `createHandlerBoundToURL` would throw and take the whole worker down.

The routing rules now live in `src/lib/pwa/workboxOptions.ts` so these invariants are unit-tested rather than reviewed. `public/offline.html` also self-heals: if it renders while `navigator.onLine` is true, it says so honestly, unregisters workers, clears caches and reloads **once** per tab — so a client already pinned by the old worker recovers without clearing storage by hand.

### Fault 2 — every failure was reported as a network failure

`"אין חיבור לרשת"` is a **claim about the network**. Used as the generic fallback it is not a harmless simplification: it sends the family to reboot a working router while the real fault — an expired session, an RLS refusal, a missing migration, an unconfigured deployment — stays invisible. **A wrong diagnosis is worse than a vague one.**

**Decision.** `src/lib/errors/classifyError.ts` maps failures to distinct kinds, each with its own Hebrew message, hint and retryability: `offline` · `network` · `timeout` · `auth` · `permission` · `missing_schema` · `config` · `server` · `unknown`.

- **`offline` is returned only when the browser itself reports being offline.** Nothing else earns that message.
- A `fetch` TypeError while the browser is online is **`network`** ("לא הצלחנו להגיע לשרת"), not offline — DNS, CORS, TLS and connection-refused are server or deployment faults, not the family's internet.
- Retry is offered only when retrying could plausibly succeed, so an expired session no longer shows a button that cannot help.
- Technical detail goes to the console via `describeForLog`, which emits `kind` and a short code and never the raw driver message, which can carry row values.

### Third instance: the sign-in screen (2026-07-31)

`PilotSignInScreen` rendered one hard-coded message — *"הפרטים שהוזנו אינם נכונים. בדקו את כתובת הדוא״ל והסיסמה ונסו שוב."* — for **every** sign-in failure, discarding the actual error. The intent was sound (do not enumerate accounts, never echo a credential), but the effect was the same fault as the offline screen: a confident, wrong diagnosis.

It mattered in production. The hosted project has the Email provider switched off, so `POST /auth/v1/token` returns `422 email_provider_disabled` — *"Email logins are disabled"* — for every address including the existing confirmed owner. The screen told the owner their password was wrong. No password would ever have worked, and the real fault is a project setting.

**Decision.** Sign-in failures go through `classifyError` like everything else. Two new kinds:

- **`auth_disabled`** — the server has the sign-in method switched off. *"הכניסה עם דוא״ל מושבתת בשרת"*, with a hint naming the configuration fix. Not retryable.
- **`invalid_credentials`** — the email or password really is wrong. *"הפרטים שהוזנו אינם נכונים"*. Retryable, and kept distinct from `auth` (an expired session), which is not the same situation.

Non-enumeration is preserved: the message still never reveals whether an address exists, and the credential is never echoed. What changed is that the app no longer blames the person for the server's configuration.

**The general rule this keeps re-proving:** a message that names the wrong cause is worse than one that names none, because it sends people to fix something that is not broken — a working router, then a correct password.

### Production must not depend on a developer's machine

`bun run check:bundle-endpoints` asserts the inlined `VITE_SUPABASE_URL` in the built client is a **remote https origin**. A bundle pointing at `127.0.0.1` works on the machine that built it and fails for everyone else in a way that looks exactly like "no internet". CI has no `.env.local`, so it builds exactly as a published Lovable build does and the check guards the real artefact.

Loopback strings still appear inside supabase-js (its GoTrue default and its own allowlist) and inside our own loopback **detector** in `runtimeConfig.ts`. Those are not endpoints the app calls, so the check asserts on the inlined configuration value rather than grepping for the word `localhost`.

**Verified 2026-07-31:** a published-style build (no `.env.local`) inlines only `https://nrfelnchbmofwrfajfai.supabase.co`.

### Reproduced live, 2026-07-31, on `https://home-flow-joy.lovable.app/`

Headless Chromium against the hosted app, mobile viewport (390×844), `he-IL`:

| Load | Service worker | `navigator.onLine` | Result |
| --- | --- | --- | --- |
| 1st visit | `installing` — not yet in control | `true` | **app loads correctly**, redirects to `/pilot/signin` |
| reload, after activation + claim | `activated`, controlling | `true` | **`אין חיבור לרשת כרגע`** |
| reload again | controlling | `true` | **`אין חיבור לרשת כרגע`** |
| `/?sw=off` (the documented kill switch) | controlling | `true` | **`אין חיבור לרשת כרגע`** |

**Zero console errors and zero failed requests on every load.** That is the signature of this bug: nothing failed, because nothing was attempted — the worker answered the navigation from its precache before the app existed.

It also explains why the fault reads as intermittent. The worker only bites once it has finished precaching 148 entries (~1.3 MB) and claimed the client, so the very first visit to a clean browser looks perfectly healthy.

And it explains why `?sw=off` did not save anyone: the kill switch lives in application code, and the application never ran. Its pathname is `/`, and the old `NavigationRoute` denylist covered only `/api/` and `/~oauth`, so the escape hatch was itself served the offline page. The old page's only control was `location.reload()`, which the same worker answered with the same page — a closed loop with no exit from inside the tab. This is why recovery now lives in `offline.html` itself rather than in the app.

**Everything else on the hosted stack was healthy throughout**: the origin serves the real app shell (`<html lang="he" dir="rtl">`, `<title>Tori — מרכז התפעול המשפחתי</title>`), all 11 JS assets return 200, the only hosts contacted are the app origin plus Google Fonts and Lovable's own CDN, **no loopback or local endpoint is ever requested**, and the hosted Supabase answers `/auth/v1/settings` 200 and REST `401 · 42501` with `Access-Control-Allow-Origin: https://home-flow-joy.lovable.app`.

### Fix confirmed live, same day

Lovable republished about 40 minutes after the merge. **A merge to `main` is not a deploy** — for that window the repository was fixed while every user was still served the broken worker. Re-running the identical test against the new build, with the worker again **activated and controlling**:

- reload → **the app loads**; no offline screen. Second reload → same.
- `/?sw=off` → works again.
- visiting `/offline.html` **directly while online** → self-heals and lands on `/pilot/signin`.
- a failed sign-in hit `https://nrfelnchbmofwrfajfai.supabase.co/auth/v1/token` (422) and rendered *"הפרטים שהוזנו אינם נכונים…"* — an auth failure reported as an auth failure. This is the second fault of this ADR, closed in production.
- no loopback or local endpoint requested; no failed requests.

Served artefacts moved from `NavigationRoute` ×1 / `PrecacheFallbackPlugin` ×0 to **×0 / ×1**, and the offline page now carries the self-heal script.

## ADR-043 — The rotation cursor is a stored column, not a derived value (WP5C, Accepted)

WP5C persists the rotation: `rotation_rules`, `rotation_members`, `rotation_assignment_log`. It does **not** reimplement the engine — `src/domain/shifts.ts` (`ALGORITHM_VERSION = "shifts.v1"`) already selects deterministically and is tested, and `08-rotation-engine.md` is explicit that the pilot reuses it. This is the durable memory around that engine.

**Decision: the cursor lives in `rotation_rules.cursor_profile_id`.**

The tempting alternative is to derive "whose turn is next" from this week's occurrences. That cannot work here. ADR-036 requires each chore's cursor to **continue across weeks and never reset on Sunday** — which is exactly what makes the trash chore alternate by occurrence and lets a week legitimately end 9–8 with the split reversing next week. A value derived from the current week has no memory of where the previous week stopped, so it would silently reset every Sunday and produce the imbalance ADR-036 explicitly accepts as *self-correcting*.

Storing it also makes determinism real rather than coincidental: two devices computing the same week agree because they read the same cursor, not because they happen to run the same code at the same moment.

**The cursor is never client-writable.** It is `SELECT`-only for `authenticated`. Letting a client set it would let somebody hand themselves the easy chore forever — precisely the hidden decision this package exists to prevent. It moves server-side, alongside the log entry explaining the move.

### Idempotency is a unique index, not a convention

`rotation_assignment_log` carries a unique index on `(rotation_rule_id, task_instance_id)`. One decision per occurrence, enforced by the database. A retry, a double-tap or a second device collides with the index and can treat the violation as a no-op instead of allocating the same chore twice. `rotation_rules_one_live_per_template` does the same job one level up: a chore can never have two competing cursors.

### `advance_mode` is a column because the product has not decided

`PILOT_WEEKLY_CHORES.md` §10 leaves "per occurrence or per week?" open, and `08-rotation-engine.md` requires it to be configurable. So it is `rotation_advance_mode`, defaulting to `per_occurrence` (what staggers the two dishwasher chores). Hard-coding it would have quietly closed a decision that is still the owner's to make.

### Explainability is stored verbatim

Each decision records `reason_code`, `algorithm_version`, the candidate snapshot, the cursor as it stood **before** the decision, and the exact Hebrew sentence shown. The sentence is stored rather than re-derived so the explanation can never drift from what the family actually read — the same principle as the WP5B instance snapshots.

### The one DELETE policy in the schema

`rotation_members` is the only table a client may hard-delete from. Removing somebody from a rotation edits a forward-looking list; every turn they already took survives in the append-only log. `070_wp4_policies_and_grants.sql` now asserts the **exact** delete-policy set by name, so a second exception cannot slip in unnoticed.

## ADR-044 — The app asks the backend what it can do, and degrades calmly (WP5D, Accepted)

WP5D ships the real weekly chores experience while the hosted pilot project is still **two migrations behind** — WP5B and WP5C are merged and tested here, but applying them to the hosted project is a separate, approval-gated step that has not happened.

Merging WP5D naively would therefore break the live pilot for the family: every weekly query would fail with `PGRST205` and the screen would show an error for something that is **not an error**. The app would simply be newer than its database, and the fix is a migration, not a retry.

**Decision.** `src/lib/pilot/schemaCapability.ts` probes once whether the backend carries WP5B/WP5C, and the UI branches on the answer:

| Probe result | Meaning | What the family sees |
| --- | --- | --- |
| success | tables present | the real weekly view |
| `missing_schema` (`PGRST205`) | backend older than this build | **"שדרוג הפיילוט ממתין"** — calm, factual, not an error |
| permission / auth refusal | tables **exist**, RLS answered | the real weekly view |
| anything else | a genuine fault | the classified error (ADR-042) |

Three properties make this safe rather than merely clever:

1. **A missing table is not a failure.** It gets its own state, never the error screen and never the offline screen. Errors imply something is broken and invite retrying; nothing is broken and retrying cannot help.
2. **It does not spam.** One probe per session — memoised in module scope and mirrored into `sessionStorage`, with concurrent callers sharing a single in-flight request. A settled answer is sticky; only the explicit "בדקו שוב" control re-checks. A transient *error* is deliberately not cached, so it stays retryable.
3. **It switches itself on.** The probe is a runtime question, so the moment the hosted migrations land the next session activates the real weekly experience with **no code change and no redeploy**.

**A permission refusal counts as capable.** Capability and authorisation are different questions: a `403` proves the relation resolves, which is exactly what a capable backend does. Conflating them would have shown the upgrade screen to a correctly-configured backend that simply refused one caller.

### Where visibility is enforced

The weekly data layer does **no** client-side visibility filtering. A child sees the family week minus `adult_only`, and a guest sees only assigned work, because the WP5B/WP5C **policies return only those rows** (ADR-041). Re-filtering in the browser would put the rule in a weaker place and let two copies of it disagree.

### Completion cannot render as success unless it persisted

The update uses `.select()` so the write returns the row it changed. Without it, a zero-row update — an RLS refusal, or a row somebody else already moved — would be indistinguishable from success, which `PILOT_WEEKLY_CHORES.md` §7 forbids outright. Zero rows is reported as a permission fault; the activity-log entry is appended only **after** the state change is confirmed, so history can never claim a transition that did not happen.

## Notes

- **ADR-006 (rotation determinism)** is reinforced by the WP0 timezone fix: date-only rotation logic must not depend on the runtime timezone. This did not require a new ADR — it is an implementation correction under an existing accepted decision (see [`08-rotation-engine.md`](./08-rotation-engine.md)).
- WP0 changes (typecheck via `tsc`, `.gitattributes` LF policy, PWA precache glob) are simple build/script corrections and do **not** warrant new ADRs.
