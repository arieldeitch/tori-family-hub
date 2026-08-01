# `docs/ai/` — AI session context

Three files, each with one job. Read them in order at the start of a session.

| File                                                 | Job                                                                                 | Lifetime                      |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------- |
| [`CURRENT_STATE.md`](./CURRENT_STATE.md)             | A timestamped, verified snapshot: branch, commit, hosted data, deployment, blocker. | **Perishable** — re-verify it |
| [`NEXT_STEPS.md`](./NEXT_STEPS.md)                   | The ordered sequence, with completion evidence and whether each step is autonomous. | Until the sequence changes    |
| [`CLAUDE_INSTRUCTIONS.md`](./CLAUDE_INSTRUCTIONS.md) | How to behave: inspection, autonomy, invariants, known traps, documentation duties. | Durable                       |

## What does not live here

This directory holds **session context**, not knowledge. It owns no product fact.

- Product requirements → [`../01-product-requirements.md`](../01-product-requirements.md)
- Verified project state, in narrative form → [`../project-status.md`](../project-status.md)
- Decisions → [`../decisions.md`](../decisions.md) — the single decision log. `docs/ai/` never records an ADR.
- Backlog → [`../todo.md`](../todo.md)
- GPT resume context → [`../gpt-handover.md`](../gpt-handover.md)

`CURRENT_STATE.md` duplicates a little of `project-status.md` on purpose: one is optimised for a thirty-second resume, the other for understanding. When they disagree, `project-status.md` is canonical and the snapshot is stale.
