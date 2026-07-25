# Security & Permissions

Source of truth for security and permissions.

> In the current app, roles and PIN are **UX guards only** — not security. Real enforcement (Auth + RLS) is future work. See [`project-status.md`](./project-status.md) and [`LOVABLE_KNOWN_LIMITATIONS.md`](./LOVABLE_KNOWN_LIMITATIONS.md).

## Current enforcement state (after WP4)

RLS is **enforced** on the four identity tables. Access is granted at **column level only** — `authenticated` holds no table-wide privilege anywhere, so a column added by a future migration is unreadable until deliberately granted.

`anon` holds **nothing**: no schema `USAGE`, no function `EXECUTE`, no table or column privilege, no policy. There is no unauthenticated surface in this domain.

### Policy matrix

| Table                   | SELECT                                                                                                                                   | UPDATE                                                                                                          | INSERT     | DELETE     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------- | ---------- |
| `households`            | active member, own **non-deleted** household, safe columns                                                                               | **active owner only**, settings columns only                                                                    | none — RPC | none — RPC |
| `member_profiles`       | owner/adult/child: active non-deleted profiles in their household · guest/service_provider: **own profile only** · never `date_of_birth` | owner/adult: presentation fields on any active profile in their household · everyone else: **own profile only** | none — RPC | none — RPC |
| `household_members`     | owner/adult: memberships in their household · child/guest/service_provider: **own row only** · **never `auth_user_id`**                  | **none**                                                                                                        | **none**   | **none**   |
| `household_invitations` | **active owner only**, safe columns, **never `token_hash` or `created_by`**                                                              | **none**                                                                                                        | **none**   | **none**   |

Updatable columns: `households` — `name`, `timezone`, `locale`, `week_starts_on`, quiet hours. `member_profiles` — `display_name`, `avatar_path`, `color_token`.

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
- Authorization helpers live in the non-exposed `private` schema and never accept a user id, so they cannot be called as Data API RPCs and cannot be used to probe another account (ADR-027).
- Sensitive columns are protected by **column-level grants**, since RLS cannot express column visibility (ADR-029).
- Every RLS change requires positive **and** negative tests (see [`09-testing-strategy.md`](./09-testing-strategy.md#rls-negative-tests)).
