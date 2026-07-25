# Security & Permissions

Source of truth for security and permissions.

> In the current app, roles and PIN are **UX guards only** — not security. Real enforcement (Auth + RLS) is future work. See [`project-status.md`](./project-status.md) and [`LOVABLE_KNOWN_LIMITATIONS.md`](./LOVABLE_KNOWN_LIMITATIONS.md).

## Current enforcement state (after WP3)

The Identity & Household tables exist but are **deliberately unreachable by any client** (ADR-023):

- RLS is **enabled** on `households`, `member_profiles`, `household_members` and `household_invitations`.
- **Zero RLS policies exist.** RLS on + no policies = every row denied to any non-bypassing role. The schema fails closed.
- All table privileges are **revoked from `PUBLIC`, `anon` and `authenticated`**, so WP3 grants no Data API access whatsoever.
- Infrastructure roles (`postgres`, the table owner, `service_role`) keep their privileges so migrations, type generation and pgTAP keep working.

**WP4 is the opening step.** It adds the *minimum* required `GRANT` statements together with the complete policy set, in one migration, with positive **and** negative tests. Until then there is no isolation behaviour to test — WP3's tests assert the locked-down state, not household isolation.

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

- Every `CREATE TABLE public.*` ships with `ENABLE ROW LEVEL SECURITY` in the **same** migration. A table must never exist in a reachable state without policies. WP3 satisfies this by shipping RLS enabled with **no** grants and **no** policies (fail closed); the matching `GRANT`s and policies arrive together in WP4 (ADR-023).
- Membership predicate: `EXISTS (SELECT 1 FROM household_members WHERE household_id = x AND auth_user_id = auth.uid() AND status = 'active')`.
- Roles live in a dedicated table, never on a profile row. That dedicated table is **`household_members`** (ADR-024) — the role is household-scoped and there is no separate `user_roles` table. A `has_household_role` SECURITY DEFINER function, with a fixed safe `search_path`, gates privileged checks; it arrives in WP4.
- Every RLS change requires positive **and** negative tests (see [`09-testing-strategy.md`](./09-testing-strategy.md#rls-negative-tests)).
