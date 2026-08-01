# Claude Code — operating instructions for Tori

How to work in this repository. Product knowledge lives elsewhere; this file is about **how to behave**.

---

## 1. The repository is the source of truth

The committed repository, its documentation, GitHub, the hosted Supabase project and the live origin are authoritative — in that order of convenience, not of truth. Where they disagree, the running system wins and the disagreement is a finding worth recording.

**Conversation memory does not persist and is not evidence.** A previous session's summary is a lead to verify, never a fact to repeat. This has already produced one real failure here: a session reported the hosted pilot as working when the live frontend was four merged PRs behind.

Never invent technical state. If something cannot be checked, say so and name the evidence that would settle it.

## 2. Inspect before you touch anything

Every session starts by establishing where things actually are:

```bash
git rev-parse --show-toplevel
git branch --show-current && git rev-parse --abbrev-ref '@{u}'
git status --porcelain=v1 --untracked-files=all
git log --oneline -10
git stash list && git tag -l 'recovery-point/*'
gh pr list --state open
gh run list --branch main --limit 3
```

Then read, in this order: [`CURRENT_STATE.md`](./CURRENT_STATE.md) → [`NEXT_STEPS.md`](./NEXT_STEPS.md) → [`../project-status.md`](../project-status.md) → [`../todo.md`](../todo.md) → [`../decisions.md`](../decisions.md).

`CURRENT_STATE.md` is a snapshot with a timestamp. **Re-verify it.** It ages the moment it is written.

Do not re-investigate what those files already establish. Do not trust them where the repository can answer directly.

## 3. Preserve work you did not create

Uncommitted changes, stashes, untracked files and orphaned branches are somebody's work until proven otherwise. Recover and integrate; never discard.

Before any restructuring, create a rollback point:

```bash
git tag -f recovery-point/<short-description>-$(date +%Y-%m-%d) HEAD
```

Never `git reset --hard` over uncommitted work, never force-push shared history, never run a **linked** database reset.

## 4. Autonomy

Work continuously. Do not stop to ask for routine approvals — file edits, shell commands, tests, builds, browser automation, commits, pushes, PRs, CI fixes, merges after green CI, documentation updates, guarded local or non-production hosted data work, reversible configuration corrections.

If you can do it yourself with the access you have, do it rather than asking the owner to.

**Stop only for:** a missing credential or external system you cannot reach · an irreversible or destructive action · a new material cost · secret exposure or rotation · a material product decision that canonical documentation does not settle.

When one blocker appears, finish every independent thing first. Report the blocker at the end, with the exact evidence needed to clear it.

## 5. Verification, and what "done" means

**Done means verified live user functionality.** Not merged code, not green tests, not database rows, not a screenshot of a placeholder. This project has been bitten by the gap between "merged" and "live" more than once.

State results with evidence: the command, its output, the count. Distinguish _verified now_, _historical_, _inferred_, and _unverified_. Never claim a command passed unless it ran and passed.

Run what the change touches, and the full suite before shipping:

```bash
bun run typecheck && bun run lint && bun run test && bun run build
bun run routes:check && bun run check:client-secrets && bun run check:pilot-privacy
bun run db:verify        # local Supabase; needs Docker
```

`db:verify` occasionally races a flaky local storage container. If it fails at container startup, run its steps individually — that is an environment flake, not a regression. CI has hit a runner port collision on `55322`; re-run the job.

## 6. Non-negotiable product invariants

Never weaken these. They are the spine of the product, and several exist because they were violated once already:

- complete **household isolation**; server-side authorization through **RLS**
- **PostgreSQL is the source of truth**; a migration for every schema change
- **no `USING (true)`**, no disabling RLS, no browser-side authorization standing in for RLS
- **no service-role key in the browser**; `localStorage` is never the primary datastore
- **no success state before persistence is confirmed** — a zero-row update is a refusal, not a success
- deterministic, explainable, **versioned** rotation
- soft delete and recovery; **no client hard-delete** of business entities
- **Hebrew and RTL from the beginning**
- no destructive hosted reset; no manual production editing instead of a migration

## 7. Traps this repository has already fallen into

Read these before writing similar code. Each cost a live outage or a wrong diagnosis:

- **A pilot must never become the entire product.** Pointing the root route at a screen rendered outside `AppShell` made forty routes unreachable without deleting a file (ADR-045).
- **`workbox.navigateFallback` serves the offline page to _everyone_.** It answers every navigation from the precache and shadows the network-first route (ADR-042).
- **"אין חיבור לרשת" is a claim about the network.** Never use it as a generic failure message; classify with `src/lib/errors/classifyError.ts`.
- **Definitions are not occurrences.** Creating templates and rotation rules populates nothing dated; the weekly view reads `task_instances`.
- **A generated column must be `IMMUTABLE`** — a date-to-text cast is not (ADR-039).
- **Postgres applies SELECT policies to an UPDATE's new row**, so a row cannot be updated into invisibility (ADR-040).
- **Membership alone is not a read predicate** on a business table; scope by role (ADR-041).

## 8. Documentation duties

After substantial work, update the documents that own the facts you changed — and only those:

| Fact                   | Owner                                      |
| ---------------------- | ------------------------------------------ |
| Product requirements   | `01-product-requirements.md`               |
| Verified current state | `project-status.md`, `ai/CURRENT_STATE.md` |
| Durable decisions      | `decisions.md` (the **only** decision log) |
| Future work            | `todo.md`, `ai/NEXT_STEPS.md`              |
| Claude operating rules | this file, `claude-context.md`             |
| GPT resume context     | `gpt-handover.md`                          |

Link between documents; do not copy sections between them. Supersede historical decisions explicitly — never delete them. Timestamps carry an explicit timezone. A material product change is a decision, not a handover edit.

Then commit coherently and push. Finish with **one** evidence-based report.

## 9. Environment notes

Windows, PowerShell primary, Bash available. Bun is the package manager.

- PowerShell here-strings mangle quotes in commit messages — write the message to a file and use `git commit -F`.
- `Set-Content -Encoding utf8` writes a **BOM**, which has already broken `package.json`. Use the `Write` tool or Node for files that must be BOM-free.
- `bun run format` reformats unrelated Markdown. Revert files you did not intend to touch before committing.
