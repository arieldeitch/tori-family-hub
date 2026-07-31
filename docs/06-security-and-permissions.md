# Security & Permissions

Source of truth for security and permissions.

> In the current app, roles and PIN are **UX guards only** — not security. Real enforcement (Auth + RLS) is future work. See [`project-status.md`](./project-status.md) and [`LOVABLE_KNOWN_LIMITATIONS.md`](./LOVABLE_KNOWN_LIMITATIONS.md).

## Current enforcement state (after WP4 and WP5B)

RLS is **enforced** on the four identity tables and the four task tables. Access is granted at **column level only** — `authenticated` holds no table-wide privilege anywhere, so a column added by a future migration is unreadable until deliberately granted.

`anon` holds **nothing**: no schema `USAGE`, no function `EXECUTE`, no table or column privilege, no policy. There is no unauthenticated surface in this domain.

### Policy matrix — identity (WP4)

| Table                   | SELECT                                                                                                                                   | UPDATE                                                                                                          | INSERT     | DELETE     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------- | ---------- |
| `households`            | active member, own **non-deleted** household, safe columns                                                                               | **active owner only**, settings columns only                                                                    | none — RPC | none — RPC |
| `member_profiles`       | owner/adult/child: active non-deleted profiles in their household · guest/service_provider: **own profile only** · never `date_of_birth` | owner/adult: presentation fields on any active profile in their household · everyone else: **own profile only** | none — RPC | none — RPC |
| `household_members`     | owner/adult: memberships in their household · child/guest/service_provider: **own row only** · **never `auth_user_id`**                  | **none**                                                                                                        | **none**   | **none**   |
| `household_invitations` | **active owner only**, safe columns, **never `token_hash` or `created_by`**                                                              | **none**                                                                                                        | **none**   | **none**   |

Updatable columns: `households` — `name`, `timezone`, `locale`, `week_starts_on`, quiet hours. `member_profiles` — `display_name`, `avatar_path`, `color_token`.

### Policy matrix — tasks (WP5B)

Membership is only the outer gate. The read predicate is the caller's **role** (ADR-041), in three scopes.

| Table                | owner / adult                          | child                                                        | guest / service_provider                       |
| -------------------- | -------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| `task_templates`     | all, **including soft-deleted** (trash) | live, **excluding `adult_only`**                             | only templates they hold a **live assignment** from |
| `task_instances`     | all, including soft-deleted            | live family week, excluding occurrences of `adult_only` templates | only occurrences **assigned to them**          |
| `task_assignments`   | all                                    | all, excluding adult-only chores                             | only rows where **they are the assignee**      |
| `task_activity_log`  | all                                    | history of what they can see                                 | only history of their own assigned occurrences |

Writes follow the same scope:

| Action                              | Permitted to                                                        |
| ----------------------------------- | ------------------------------------------------------------------- |
| Define / edit a template            | owner, adult                                                        |
| Create or change an assignment      | owner, adult                                                        |
| Generate or quick-add an occurrence | owner, adult, child — **never** guest or service_provider          |
| Complete / reopen an occurrence     | owner, adult; child in scope; guest/service_provider **only on their own assigned occurrence** |
| Soft-delete or restore              | **owner, adult only**                                               |
| Append to the activity log          | anyone entitled to act on that occurrence, attributed to themselves — owner/adult may attribute to a child (ADR-035) |
| Hard delete anything                | **nobody** — no DELETE policy and no DELETE grant exists            |

Two properties that are easy to lose:

- **Access follows the LIVE assignment** (`proposed`/`accepted` only). A `reassigned` or `declined` row stops granting access immediately, though the former assignee still sees their own historical assignment row.
- **Standing is re-verified inside every helper**, so a suspended or expired assignee loses access at once, without anybody having to rewrite assignment rows.

`task_templates.adult_only` is a **real boundary for children**, not a presentation hint — this is where *"a child does not see `adults_only` data"* below is enforced. It is not general secrecy: a guest or service provider explicitly assigned an adult-only chore can still see and complete it. Only an owner or adult can write templates, so a child cannot clear the flag.

A child is deliberately **not** narrowed to their own chores: `PILOT_WEEKLY_CHORES.md` §3 and §13 make the whole-family week an acceptance criterion.

### What this makes impossible

Because no grant and no write policy exists on `household_members`, a client cannot insert itself into a household, grant itself a role, or change `role`, `status`, `auth_user_id`, `profile_id` or `household_id`. The same absence on `household_invitations` means invitations cannot be created, revoked, deleted or accepted by a client. These arrive as authorized RPCs in **WP4.5** (ADR-028).

### Fail-closed conditions

Every authorization decision runs through the `private` helpers (ADR-027) and denies when: `auth.uid()` is NULL · membership status is `invited`, `suspended` or `revoked` · `access_expires_at` has passed (a value exactly equal to `now()` is already expired) · the household is soft-deleted · the caller's own profile is inactive or soft-deleted.

A denied read returns **zero rows**, never an error that would reveal another household's existence.

### Still outstanding

`household_members.auth_user_id` is still `ON DELETE CASCADE`. **WP4.6 must land before production onboarding or any real account-deletion path** (ADR-031).

## Roles

`owner` · `adult` · `child` · `guest` · `service_provider`.

## Authorization principles

- The client is not trusted.
- Hiding a button is not authorization.
- A `household_id` from the client is not proof of membership.
- Every family table is protected by RLS.
- A user of one household cannot read or modify another household's data.
- A child does not see `adults_only` or `restricted` data.
- A guest is limited by time and scope.
- The service role is never allowed in the browser.
- A PIN is never stored in plaintext — **and never on a profile row at all** (ADR-025). Credential material lives in an unexposed `private.member_pin_credentials` with no client grants, reachable only through a secured server/RPC boundary. `member_profiles.pin_auth_enabled` is non-sensitive metadata that authenticates nothing, and enabling PIN must be atomic with creating a valid credential.
- A child PIN is not an adult session.

## Child model

1. An adult authenticates a family device.
2. The device receives a limited session.
3. The child selects a profile and enters a PIN.
4. The server creates a short-lived context limited to the profile and its allowed actions.

Rate limiting, lockout, and reset by an authorized adult are required.

## Hosted pilot — secret boundary

The hosted pilot (ADR-037) does not change any policy; it changes where the database lives.

- **Browser-safe, may be given to Lovable and committed to the tracked root `.env`:** hosted Supabase URL, publishable key (ADR-038). Both are shipped to every visitor by design; confidentiality of the anon key was never the control — **RLS is**, and `anon` holds zero table and zero column privileges.
- **The tracked `.env` is allowlist-enforced.** `check:client-secrets` fails the build on any variable other than those two, and rejects credential-shaped values regardless of variable name. `.gitignore` keeps every other `.env` variant ignored.
- **Server-side only, never given to Lovable and never committed:** service-role key, database password, Supabase access token, the pilot password.
- Hosted writes run through a separate guard that requires an exact **project-reference allowlist**; a declared mode alone is never sufficient, and the hosted URL must resolve to an allowlisted reference and agree with the declared one. The local guard is untouched and grants no hosted access.
- CI never receives a hosted secret and continues to run against the local Supabase stack.
- `check:client-secrets` scans source and build output for forbidden variable **names** and credential **values**; credential values are rejected everywhere, including test files.

## Family Pilot — temporary access posture

The pilot defers user-management screens but **relaxes no enforcement** (ADR-033).

- One authenticated adult identity; the in-app profile selector chooses whose week is displayed and is **not** an authorization mechanism.
- Acting for a child profile is a **server-side use case or RPC** that re-verifies household membership and permission; the client's `profile_id` is untrusted input.
- The acting profile is written to the activity log next to the authenticated actor.
- Unchanged and non-negotiable: no anonymous writes (`enable_anonymous_sign_ins` stays `false`), no service-role key in browser code, no RLS bypass, `localStorage` is not a source of truth.
- Pilot mode is **non-production** and guarded by an explicit environment flag that cannot be enabled accidentally in production.
- Child PIN, device sessions, invitations and onboarding remain **required future work**, merely deferred (ADR-013, ADR-025, ADR-028).

## Sensitive actions

These require an RPC or a server endpoint (never a client-side write):

- Creating a household and its first owner.
- Accepting an invitation.
- Changing a role.
- Revoke or suspend.
- Resetting a PIN.
- Transferring transport responsibility.
- Restore or purge.
- Changing visibility.
- Bulk operations.

## RLS expectations

- Every `CREATE TABLE public.*` ships with `ENABLE ROW LEVEL SECURITY` in the **same** migration. A table must never exist in a reachable state without policies. WP3 satisfied this by shipping RLS enabled with no grants and no policies (fail closed); WP4 added the matching `GRANT`s and policies together in one migration (ADR-023).
- Membership predicate — implemented in `private.is_active_household_member` and its siblings, which additionally require unexpired access, a live household and an active caller profile:
  `EXISTS (SELECT 1 FROM household_members WHERE household_id = x AND auth_user_id = auth.uid() AND status = 'active')`.
- Roles live in a dedicated table, never on a profile row. That dedicated table is **`household_members`** (ADR-024) — the role is household-scoped and there is no separate `user_roles` table. `private.has_household_role`, SECURITY DEFINER with a fixed empty `search_path`, gates privileged checks (ADR-027).
- Authorization helpers live in the non-exposed `private` schema and never accept a user id, so they cannot be called as Data API RPCs and cannot be used to probe another account (ADR-027). There are **seven**: three identity helpers (WP4) and four task-scope helpers (WP5B). Every one of them re-derives standing from `auth.uid()` and re-checks status, expiry, soft deletion and profile activity — including the ones that merely look up a flag, which would otherwise be a one-bit oracle over arbitrary ids. `080_wp4_helper_functions.sql` enforces this over the whole schema.
- **Membership is never the whole read predicate on a business table.** Scope by role, or a guest silently gains household-wide visibility (ADR-041).
- Sensitive columns are protected by **column-level grants**, since RLS cannot express column visibility (ADR-029).
- Every RLS change requires positive **and** negative tests (see [`09-testing-strategy.md`](./09-testing-strategy.md#rls-negative-tests)).
