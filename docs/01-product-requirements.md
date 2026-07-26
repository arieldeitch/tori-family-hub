# Tori — Product Requirements (PRD)

**This is the single business source of truth.** No requirement here may be rewritten to match the current prototype. Where the code differs, the difference is a gap recorded in [`project-status.md`](./project-status.md) and [`todo.md`](./todo.md), not a change to this document.

## 1. Product identity

- **Name:** Tori.
- **Product type:** Family Operations Hub.
- **Product promise:** the house knows who does what.
- **Primary language:** Hebrew.
- **Direction:** RTL.
- **Center of the product:** the Today screen.
- **Preferred backend:** Supabase.
- **Future source of truth:** PostgreSQL.
- **`localStorage` is not a source of truth.**

Tori is not an ordinary to-do list. It must answer:

1. What needs to happen today.
2. Who is responsible.
3. Who picks up or drops off each child.
4. What is waiting for handling, approval, or an external party.
5. What was forgotten or is overdue.

## 2. Product principles

- The Today screen is the default.
- Every active item needs an owner, a due time, or a follow-up mechanism.
- An item without an owner appears under **"needs assignment"**.
- A task template and a task instance are separate entities.
- Editing a template does not change historical instances.
- Rotations are deterministic, explained, and versioned.
- Meaningful deletion is a soft delete with at least 48 hours of restore.
- Pickups and drop-offs are an independent module.
- `waiting_external` requires a next follow-up date or an explicit opt-out.
- Success is shown only after a real save.
- No critical business logic inside React components.
- No accusatory language or family competition by default.

## 3. The Today screen

Information order:

1. Operational risk.
2. The next event or departure.
3. Pickups and drop-offs.
4. Personal tasks.
5. Items waiting for approval.
6. Follow-ups that are due.
7. Tasks with no owner.
8. Shopping summary.

Empty sections must not be shown — they only add load for the user.

## 4. Roles

- `owner`
- `adult`
- `child`
- `guest`
- `service_provider`

Authorization principles are defined in [`06-security-and-permissions.md`](./06-security-and-permissions.md). In short: the client is not trusted; hiding a button is not authorization; the server and RLS enforce access.

## 5. Child model

1. An adult authenticates a family device.
2. The device receives a limited session.
3. The child selects a profile and enters a PIN.
4. The server creates a short-lived context limited to the profile and its allowed actions.

Rate limiting, lockout, and reset by an authorized adult are required. A child PIN is **not** an adult session.

## 6. Task statuses

`inbox` · `planned` · `assigned` · `accepted` · `in_progress` · `waiting` · `blocked` · `done` · `skipped` · `cancelled`

Rules:

- Do not use `done` for an item that was only planned, assigned, or approved.
- `done` requires `completed_at`.
- `completed_by` is required when the performer is known.
- An invalid transition fails.
- The UI does not decide on its own whether a transition is legal.
- A task that was not done does not disappear at the end of the day.

## 7. Task model (summary)

Entities: `task_templates`, `task_instances`, `task_assignments`, `task_comments`, `task_activity_log`. Full field lists in [`05-data-model.md`](./05-data-model.md). A recurring instance requires an occurrence key or an appropriate unique constraint.

## 8. Calendar and events

Entities may include `calendars`, `events`, `event_participants`, `event_requirements`. See [`05-data-model.md`](./05-data-model.md).

## 9. Pickups and drop-offs (transport)

An independent module. Statuses: `unassigned` · `pending_acceptance` · `accepted` · `en_route` · `completed` · `transferred` · `cancelled`.

Rules:

- `completed` requires an owner.
- Acceptance is performed by the assigned person.
- Responsibility is not transferred before the backup accepts, except with a documented admin override.
- A pickup with no owner is shown as an operational risk.

## 10. Follow-up

Entities: `follow_up_cases`, `follow_up_actions`. Statuses: `action_required` · `waiting_external` · `response_received` · `more_info_required` · `completed` · `closed_no_action` · `blocked`.

**When status is `waiting_external`, there must be either `next_follow_up_at` or `follow_up_disabled_reason`.** Sensitivity levels: `household`, `adults_only`, `restricted`. The screen shows who holds the ball, the last action, the next follow-up date, the next action, and history.

## 11. Shopping

Entities: `shopping_lists`, `shopping_items`. Statuses: `needed` · `claimed` · `purchased` · `unavailable` · `removed`.

- Duplicate detection suggests a merge; there is no automatic merge.
- "Add anyway" is allowed.
- An item has requested-by and an optional assigned buyer.
- An offline action does not silently disappear.

## 12. Errands

An errand is a task subtype/extension with: `location`, `area label`, `assignee`, `due date`, `status`, `can_do_when_nearby`, and a linked task instance. No maps, routing, or background location in MVP.

## 13. Notifications

Defined in full in [`07-notifications-and-reminders.md`](./07-notifications-and-reminders.md). Notifications exist to prevent forgetting without creating noise. A notification is never a source of truth.

## 14. Rotation engine

Defined in full in [`08-rotation-engine.md`](./08-rotation-engine.md). Deterministic, explainable, versioned, idempotent, no undocumented randomness. Date-only logic must not depend on the runtime environment's timezone.

## 15. First delivery milestone — Family Pilot (Weekly Child Chores)

The **immediate** execution priority, ahead of the rest of the MVP: let the owner's real household use Tori for one job — children seeing and completing their weekly chores, Sunday→Saturday, with a predictable rotation. Scope in [`PILOT_WEEKLY_CHORES.md`](./PILOT_WEEKLY_CHORES.md); decision in [`decisions.md`](./decisions.md) ADR-033.

**In-app user management is deferred for the pilot only.** The household is preconfigured. This does **not** remove any requirement in §5 (child model), §4 (roles) or [`06-security-and-permissions.md`](./06-security-and-permissions.md) — real Auth, child PIN with lockout and adult reset, invitations and full RLS all remain required, and the pilot may not make them harder to add.

Personal household data is never committed: no names in migrations and none in the shared seed (ADR-034).

The pilot runs **hosted** as of the WP5A hosted conversion: Lovable hosts the frontend, Supabase remains the only backend, and normal family use requires neither Docker nor localhost (ADR-037). The hosted environment is explicitly non-production.

## 16. MVP scope

In scope: household; adults and children; Today screen; one-off tasks; templates and instances; basic rotation; completion/history; weekly calendar; transport assignments and acceptance; shopping; errands; follow-ups; basic notifications; overdue; child view; soft delete/restore; RLS; Hebrew/RTL; basic PWA.

Out of MVP: full financial system; advanced routing; full chat; full school system; autonomous AI; complex financial rewards; broad integrations before stability.
