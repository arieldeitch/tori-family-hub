# Current State — fast resume snapshot

**Verified 2026-08-01, 19:05 Asia/Jerusalem (16:05 UTC).**
Every line below was checked against the repository, GitHub, the hosted Supabase project or the live origin at that time. Anything that could not be verified is marked.

> This file is a **snapshot**, not a narrative. For the reasoning behind any of it,
> read [`../project-status.md`](../project-status.md) and [`../decisions.md`](../decisions.md).
> Re-verify before trusting: a snapshot ages.

---

## Repository

|                          |                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| Branch                   | `main`                                                                                       |
| Upstream                 | `origin/main`, **0 ahead / 0 behind**                                                        |
| Last code commit         | `0523f22` — _Merge pull request #21 from arieldeitch/docs/hosted-week-generated_             |
| HEAD                     | `16b8c17` — this consolidation. **Documentation only**; no code has changed since `0523f22`. |
| Working tree             | **clean** — no staged, unstaged or untracked changes                                         |
| Stashes                  | none                                                                                         |
| Open PRs                 | none                                                                                         |
| Last 4 CI runs on `main` | all **success**                                                                              |

**Rollback tags** (newest first): `recovery-point/pre-docs-consolidation-2026-08-01` · `recovery-point/pre-shell-restore-2026-08-01` · `recovery-point/pre-wp5d-2026-07-31` · `recovery-point/pre-wp5b-2026-07-31`

Nineteen feature branches remain on `origin` after merge. They are history, not work in progress; every one is merged into `main`.

## Hosted Supabase — `tori-family-pilot`

|             |                                                                                         |
| ----------- | --------------------------------------------------------------------------------------- |
| Project ref | `nrfelnchbmofwrfajfai` (eu-central-1, **non-production**)                               |
| Status      | `ACTIVE_HEALTHY`, CLI reports `linked: true`                                            |
| Migrations  | **all 5 applied remotely**; local ledger = remote ledger                                |
| Auth        | `external.email: true`, `disable_signup: true` — password sign-in on, public signup off |

Row counts, verified 2026-08-01:

| Table                     | Rows                                            |
| ------------------------- | ----------------------------------------------- |
| `task_templates`          | 3                                               |
| `task_instances`          | **68**                                          |
| `task_assignments`        | **68**                                          |
| `rotation_assignment_log` | **68**                                          |
| `rotation_rules`          | 3                                               |
| `rotation_members`        | 6                                               |
| `task_activity_log`       | **0** — correct; nothing has been completed yet |

Week of 2026-07-26 → 2026-08-01: **17 occurrences, all seven days populated**, 17/17 assigned, 17/17 carrying both a reason code and an algorithm version. The generated window runs to **2026-08-22**, so the week beginning 2026-08-02 is already populated.

⚠️ **CLI access to this project has proven intermittent.** During the 2026-08-01 session `supabase projects list` twice stopped showing the project and reported every project `linked: false`, then recovered. If hosted commands fail with a 403 on the login-role endpoint, that is this, not a new fault. Re-check before concluding anything.

## Live deployment — `https://home-flow-joy.lovable.app/`

|                  |                                                     |
| ---------------- | --------------------------------------------------- |
| Origin           | responds **HTTP 200**, correct title, RTL app shell |
| Frontend version | ❌ **STALE — predates PR #18**                      |

Verified by fetching every referenced asset and searching for strings introduced by each PR: neither the WP5D weekly view (`שדרוג הפיילוט ממתין`, PR #18) nor the restored navigation (`מטלות השבוע`, PR #20) is present in the live bundle.

**The live site is therefore at least four merged PRs behind `main`.** The backend is ready and the frontend is not.

## The single current blocker

**Lovable has not rebuilt/published since PR #18 (merged 2026-07-31 16:25 UTC).**

Everything else is done: code merged, CI green, migrations applied, hosted data generated. The restored navigation and the weekly chores module exist only in the repository.

No Lovable interface was authenticated in the environment where this was verified, so Publish could not be triggered from the CLI or by automation.

## Next action

See [`NEXT_STEPS.md`](./NEXT_STEPS.md). In one line: **press Publish in Lovable, then verify the live site**.
