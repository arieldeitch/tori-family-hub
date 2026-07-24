# Tori — Knowledge Pack

This is the canonical Knowledge Pack for **Tori — a Family Operations Hub**. It is the approved, product-owner-sourced set of documents that defines what Tori is, why it exists, and the rules it must obey. Everything here is source-of-truth for product and engineering decisions.

> Product promise: **the house knows who does what.** Hebrew-first, RTL, mobile-first. The Today screen is the center of the product.

## Source-of-truth hierarchy

| Document | Authority |
| --- | --- |
| [`01-product-requirements.md`](./01-product-requirements.md) | **The single business source of truth (PRD).** |
| [`decisions.md`](./decisions.md) | Approved decisions and ADRs. |
| [`project-status.md`](./project-status.md) | Verified facts about the current state of the project. |
| [`todo.md`](./todo.md) | Prioritized future work. |
| [`02-ux-ui-guidelines.md`](./02-ux-ui-guidelines.md) | UX & UI domain source of truth. |
| [`03-architecture.md`](./03-architecture.md) | Architecture domain source of truth. |
| [`04-development-principles.md`](./04-development-principles.md) | Development process source of truth. |
| [`05-data-model.md`](./05-data-model.md) | Data model source of truth. |
| [`06-security-and-permissions.md`](./06-security-and-permissions.md) | Security & permissions source of truth. |
| [`07-notifications-and-reminders.md`](./07-notifications-and-reminders.md) | Notifications source of truth. |
| [`08-rotation-engine.md`](./08-rotation-engine.md) | Rotation (shifts) engine source of truth. |
| [`09-testing-strategy.md`](./09-testing-strategy.md) | Testing strategy source of truth. |
| [`claude-context.md`](./claude-context.md) | Working instructions for Claude Code. |
| [`gpt-handover.md`](./gpt-handover.md) | Continuity for GPT conversations. |

### Not a business source of truth

The `LOVABLE_*` documents and [`CLAUDE_HANDOVER.md`](./CLAUDE_HANDOVER.md) describe the **actual technical implementation** and handover state of the prototype. They do **not** replace the PRD. When they disagree with the PRD, the PRD wins and the gap is recorded in [`project-status.md`](./project-status.md) and [`todo.md`](./todo.md) — the requirement is not rewritten to match the code, and the code is not changed to match the docs outside a dedicated task.

## Reading order

1. [`01-product-requirements.md`](./01-product-requirements.md) — what Tori is and must do.
2. [`decisions.md`](./decisions.md) — the accepted decisions that constrain everything else.
3. [`02-ux-ui-guidelines.md`](./02-ux-ui-guidelines.md) → [`09-testing-strategy.md`](./09-testing-strategy.md) — domain rules.
4. [`project-status.md`](./project-status.md) — verified current state (post-WP0).
5. [`todo.md`](./todo.md) — what happens next (WP2 → WP5).
6. [`claude-context.md`](./claude-context.md) / [`gpt-handover.md`](./gpt-handover.md) — agent working context.

## Change discipline

- Do not change a business requirement to match the prototype. Record the gap instead.
- Every schema change requires a migration. Every RLS change requires positive **and** negative tests.
- Update [`project-status.md`](./project-status.md), [`todo.md`](./todo.md), [`claude-context.md`](./claude-context.md) and [`gpt-handover.md`](./gpt-handover.md) at the end of every task.
