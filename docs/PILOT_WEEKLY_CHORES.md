# Family Pilot — Weekly Child Chores

The next product milestone after WP4. A deliberately narrow vertical slice that lets the owner's real household use Tori for one job: **children can see and complete their weekly chores**.

This document is the pilot's scope contract. It does **not** replace the PRD ([`01-product-requirements.md`](./01-product-requirements.md)); where the pilot narrows a requirement, that is a temporary pilot constraint recorded here and in [`decisions.md`](./decisions.md) (ADR-033), not a change to the requirement.

---

## 1. Why this milestone

The owner wants the real household using the app as soon as possible. Everything not needed for weekly chores is deferred — including in-app user management. **Do not start onboarding, invitation management, child PIN, account management, transport, shopping or notifications before this milestone is planned and approved.**

This supersedes the plan to begin WP4.5 immediately. WP4.5 and WP4.6 remain required long-term work; see §11.

## 2. Pilot household — and how its data is handled

The pilot household is **four people: two adults and two children**, preconfigured rather than self-registered.

**The actual names and ages are local pilot data and must never be committed.** They must not appear in:

- migrations,
- the shared `supabase/seed.sql`,
- committed automated-test fixtures,
- documentation examples,
- source-code constants.

Instead they live in a **git-ignored, environment-specific file** at the repository root:

```
pilot-household.local.json        ← real data, git-ignored, never committed
pilot-household.example.json      ← placeholder template, committed
```

An **idempotent local bootstrap** reads that file and converges the database on the described household — safe to run repeatedly, creating no duplicates. The shared seed stays business-empty (ADR-032, ADR-034).

**Age is product context only.** `member_profiles.date_of_birth` exists but is unreachable by clients (ADR-029), and no privacy-safe age field is approved. **Do not fabricate dates of birth** and do not add an age column for the pilot. If the UI ever needs to order children by age, that is a separate approved decision.

## 3. Required experience

- A weekly chores view, **Sunday → Saturday**.
- Children can see their schedule for the **whole week without opening every task**.
- Chores are assigned by a **deterministic fixed rotation** between the two children — never random, no hidden AI decision.
- Every task shows its assignee and status clearly, with the rotation explanation visible.
- A task is completed by tapping its **banner/card or a large primary control**.
- Completed state changes **visual treatment** *and* shows a **check icon** *and* explicit text **"בוצע"** *and* exposes accessible pressed/state semantics — never colour alone.
- Completion **persists after refresh**; success is shown **only after confirmed persistence**.
- **Failed persistence must never render as success** — it rolls back with a visible error.
- Adding a chore is a simple form: **no code change and no config-file edit**.

## 4. Initial chore templates

- פינוי מדיח כלים
- העמסת מדיח כלים
- פינוי פח אשפה

**Scheduling is not decided.** The owner specified no weekdays or frequency, so none are assumed. Schedule and frequency are approval decisions (§10); the implementation must use configurable defaults, never hard-coded guesses.

## 5. Temporary pilot-access model (default recommendation)

No user-management screens in the pilot. The recommended model:

- **one authenticated adult pilot identity** (a real Supabase Auth user, password sign-in),
- **one household**, **four member profiles**,
- a **profile selector inside the pilot UI** choosing whose week is displayed,
- writes made on behalf of a child go through a **server-side use case / RPC**, never a raw client write,
- the server **verifies that the authenticated adult belongs to the same household and may act for that profile** — a client-supplied `profile_id` is never trusted,
- the **acting profile is recorded in the activity log**, alongside the authenticated actor,
- **no anonymous writes**, **no service-role key in the browser**, **no RLS bypass**, **`localStorage` never the source of truth**,
- an **explicit non-production environment guard**, impossible to enable accidentally in production.

The profile selector is a **display and attribution** mechanism, not an authorization mechanism. Authority always comes from the authenticated adult's membership, exactly as WP4 enforces it. Alternatives considered — separate Auth identities per person, a shared-device session, and a fully anonymous pilot mode — are compared in the Architecture Approval Brief.

## 6. Rotation

Default pilot behaviour: an **automatic deterministic fixed sequence** between the two child profiles.

- No random choice. Same inputs + same `algorithm_version` → same assignment.
- Every assignment carries a **`reason_code`**, an **`algorithm_version`** and a **human-readable explanation**.
- **No punishment after absence** — missing a turn does not push a child to the back or double their load.
- **Historical assignments are never rewritten.** Changing a rule affects future occurrences only.
- **Manual adult override is planned**, and must record that it overrode a computed value.
- The model must **leave room for availability** later without building the availability module now.

A pure engine already exists at `src/domain/shifts.ts` (`ALGORITHM_VERSION = "shifts.v1"`, `fixed_sequence`, reason codes, `avoidConsecutive`), with plain-language rendering in `src/features/shifts/human.ts`. The pilot reuses it rather than introducing a second engine.

## 7. Completion, undo and the not-completed case

**Completion** requires all of: visual treatment change · check icon · the literal text "בוצע" · accessible pressed/state semantics · an activity-log entry · confirmed persistence before success is shown · visible rollback on failure · state preserved across refresh.

**Undo / reopen** must be explicit, not a hidden long-press, and must be **audited**: reopening writes its own activity-log entry recording who reopened it and when. It is a normal logged transition out of `done`, never a silent deletion of history.

**A task that was not completed must not silently disappear at the end of the day.** The policy must be explicit — remain overdue, be skipped with a reason, or be rescheduled — and is an approval decision (§10). Whatever is chosen, `08-rotation-engine.md`'s no-punishment rule still holds.

## 8. Quick chore creation — "הוספת מטלה"

A minimal form, advanced options **collapsed by default**:

| Field | Notes |
| --- | --- |
| Title | required |
| Recurrence days / schedule | Sunday→Saturday day pickers or a simple frequency |
| Participants | defaults may be the two children, but **must remain editable** |
| Assignment strategy | default: fixed rotation |
| Time of day | optional |

Adding a chore must create the expected future instances and must require **no code change and no configuration-file edit**.

## 9. Data slice to be planned (WP5B/WP5C)

Smallest viable set, all household-scoped with RLS in the same migration:

`task_templates` · `task_instances` · `task_assignments` · `task_activity_log` · `rotation_rules` · `rotation_members` · `rotation_assignment_log`

Plus: recurrence generation, **deterministic occurrence keys** with a unique constraint so generation is idempotent under concurrency, completion persistence, undo/reopen, household isolation, and server-side use cases or RPCs for any critical multi-write operation.

Any deviation from [`05-data-model.md`](./05-data-model.md) or [`08-rotation-engine.md`](./08-rotation-engine.md) must be explicit and recorded as a decision.

## 10. Open decisions requiring owner approval

Recorded, not assumed. Each has a recommended default in the Architecture Approval Brief.

1. **Schedule and frequency** of each of the three initial chores.
2. **Whether several occurrences of one chore may exist on the same day.**
3. **Automatic fixed rotation vs. open volunteering.**
4. **Whether a child may undo their own completion**, and for how long.
5. **Overdue vs. skip behaviour** for a chore that was not done.
6. **Whether adults appear in the weekly chores view** by default.
7. **The exact pilot-access model** (§5).
8. **The pilot environment and deployment boundary** — local only, or a hosted non-production environment.

## 11. Deferred identity work

- **WP4.5 — Identity RPCs** (invitation create/revoke/accept, role change, suspend/revoke, owner transfer). Still required; no longer immediately next.
- **WP4.6 — Auth account deletion + `ON DELETE RESTRICT`** (ADR-031). **Still blocking before production onboarding or any account-deletion capability.** It does **not** block this pilot, because the pilot is explicitly non-production and ships **no account-management and no account-deletion capability**.
- Child PIN and device sessions (ADR-025), onboarding UI, and full permission surfaces remain required long-term.

## 12. Work-package sequence

| WP | Title | Core deliverable |
| --- | --- | --- |
| **WP5A** | Pilot access and local bootstrap | Environment guard, one authenticated pilot identity, household + four profiles from the git-ignored local file, no user-management UI, no shared seed data |
| **WP5B** | Task and recurrence foundation | Templates, instances, assignments, activity log, occurrence generation, constraints, RLS, structural + negative tests |
| **WP5C** | Child rotation foundation | `rotation_rules`, `rotation_members`, `rotation_assignment_log`, deterministic assignment, `algorithm_version`, `reason_code`, explanation, concurrency/idempotency tests |
| **WP5D** | Weekly chores UI and completion | Family + child views, Sunday→Saturday layout, persistent completion, rollback on failure, accessibility and RTL |
| **WP5E** | Quick add and family UAT | "הוספת מטלה" flow, future-instance generation, mobile review, UAT with the real household, defect-fix loop |

## 13. Acceptance for the pilot as a whole

On the owner's real devices:

- Each child sees their own week, Sunday→Saturday, without opening every task.
- The family view shows both children's chores.
- Tapping a chore marks it done: treatment, check icon and "בוצע" change together, and it survives a refresh.
- A forced persistence failure shows an error, not a false success.
- An adult adds a fourth chore through the form — no code change — and it appears in future weeks.
- Everything renders correctly in RTL at 360px and 390px, and is operable by keyboard and screen reader.
