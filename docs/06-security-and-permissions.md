# Security & Permissions

Source of truth for security and permissions.

> In the current prototype, roles and PIN are **UX guards only** — not security. Real enforcement (Auth + RLS) is future work. See [`project-status.md`](./project-status.md) and [`LOVABLE_KNOWN_LIMITATIONS.md`](./LOVABLE_KNOWN_LIMITATIONS.md).

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
- A PIN is never stored in plaintext.
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

- Every `CREATE TABLE public.*` ships with explicit `GRANT` + `ENABLE ROW LEVEL SECURITY` + policies in the **same** migration.
- Membership predicate: `EXISTS (SELECT 1 FROM household_members WHERE household_id = x AND auth_user_id = auth.uid() AND status = 'active')`.
- Roles live in a dedicated table, never on a profile row; a `has_role` SECURITY DEFINER function gates privileged checks.
- Every RLS change requires positive **and** negative tests (see [`09-testing-strategy.md`](./09-testing-strategy.md#rls-negative-tests)).
