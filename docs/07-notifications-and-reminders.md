# Notifications & Reminders

Source of truth for notifications. Notifications exist to **prevent forgetting without creating noise**.

## Principles

- A digest is preferred over a stream of messages.
- Escalation only when a required action was not taken.
- Every notification is linked to an entity and an action.
- Quiet hours are respected.
- No full sensitive information on the lock screen.
- A notification is not a source of truth.
- A notification intent is created only after a reliable business commit.
- A worker is responsible for sending, retry, and backoff.

## Categories

- morning digest
- transport reminder
- unassigned transport
- pending acceptance
- overdue task
- follow-up due
- swap request
- shopping digest
- evening digest

## Dedupe

Every notification has a `dedupe_key` based on:

- event type
- entity
- recipient
- escalation stage

Changing the entity's state cancels future reminders that are no longer relevant.

## Delivery boundary

Notification intents are produced in the application/data layer after commit; the infrastructure worker performs delivery, retry, and backoff (see [`03-architecture.md`](./03-architecture.md#infrastructure)). No email, push, or cron exists in the prototype yet — see [`project-status.md`](./project-status.md).
