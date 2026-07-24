# Development Principles

Source of truth for the development process.

## Core rules

- Small, focused change.
- No functionality change outside the task.
- No deleting data to pass a test.
- No bypassing RLS.
- No service role in the browser.
- No `localStorage` as a source of truth.
- No success before persistence.
- No dependency without justification.
- No duplicated business logic.
- Every schema change requires a migration.
- Every behavior change requires tests and docs.
- No broad refactor that is not required.
- No hidden critical TODO.
- No manual edit of generated files when a generator exists.

## Coding-agent task contract

Every coding-agent task includes:

- Goal.
- User problem.
- Current behavior.
- Required behavior.
- UX requirements.
- Data model.
- Business rules.
- Security.
- Edge cases.
- Existing-data protection.
- Out of scope.
- Verification.
- Completion report.

## Task closure

At the end of every task, update [`project-status.md`](./project-status.md), [`todo.md`](./todo.md), [`claude-context.md`](./claude-context.md), and [`gpt-handover.md`](./gpt-handover.md). Do not start a business module before Identity, Household, and RLS are stable (see [`todo.md`](./todo.md)).
