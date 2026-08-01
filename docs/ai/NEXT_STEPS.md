# Next Steps — ordered execution sequence

**Written 2026-08-01, 19:05 Asia/Jerusalem.** Re-verify [`CURRENT_STATE.md`](./CURRENT_STATE.md) before starting; a step already done is worse than a step not started.

Each step states its objective, prerequisites, the evidence that closes it, and whether an agent can do it alone.

---

## 1 — Publish the frontend from Lovable ⚠️ requires human/external access

**Objective.** Get the merged frontend onto `https://home-flow-joy.lovable.app/`. This is the only thing standing between the current repository and a working product.

**Prerequisites.** Access to the Lovable project UI. `main` is already green and contains everything needed.

**Action.** Open the Lovable project and press **Publish / Update**.

**Evidence of completion.** The live bundle contains strings from the merged work:

```bash
curl -s https://home-flow-joy.lovable.app/ -o /tmp/L.html
for a in $(grep -a -o '/assets/[^"]*\.js' /tmp/L.html | sort -u); do
  curl -s "https://home-flow-joy.lovable.app$a" | grep -aq 'מטלות השבוע' && echo "PUBLISHED: $a"
done
```

A hit proves PR #20 is live. No hit means it is still stale — do **not** proceed to step 2.

**Autonomous?** ❌ No. No Lovable interface was authenticated in the verified environment. If a future session _does_ have one, this becomes autonomous and should be done without asking.

---

## 2 — Verify the live flow in a real browser ⚠️ needs the pilot password

**Objective.** Confirm verified live user functionality, which is the project's definition of done — not merged code, not green tests, not database rows.

**Prerequisites.** Step 1 complete. The hosted pilot adult's password, which was **not available** in the verified environment. Either obtain it or set one through the Supabase Admin API (a hosted Auth change — record it as a decision).

**Action.** Drive the live site with browser automation at **360px and 390px**, Hebrew locale, service worker active and controlling.

**Evidence of completion.** All of:

- sign-in succeeds;
- the bottom navigation is visible and every primary module is reachable;
- `/chores` shows real dated chores for the current week, all seven days rendered, empty days rendered intentionally, today marked;
- assignee names and rotation explanations display;
- completing a chore persists across a refresh;
- a direct visit to `/chores` and a browser refresh both work;
- no request touches localhost, Docker, a local Supabase or a dev server;
- no unrelated failure is labelled "offline".

**Autonomous?** ⚠️ Partly. The browser work is autonomous; the credential is not.

---

## 3 — Keep the generated window rolling 🤖 autonomous

**Objective.** Ensure the weekly view never runs dry. Occurrences are generated to **2026-08-22**; past that date the view empties.

**Prerequisites.** Working Supabase CLI access to `nrfelnchbmofwrfajfai` (see the intermittency warning in `CURRENT_STATE.md`).

**Action.**

```bash
TORI_PILOT_MODE=hosted-preview \
TORI_HOSTED_PROJECT_REF=nrfelnchbmofwrfajfai \
TORI_HOSTED_SUPABASE_URL=https://nrfelnchbmofwrfajfai.supabase.co \
TORI_HOSTED_SERVICE_ROLE_KEY=… TORI_HOSTED_PILOT_PASSWORD=… \
bun run pilot:week:hosted
```

**Evidence of completion.** A second consecutive run reports `created — occurrences 0, assignments 0, decisions 0` with unchanged totals. That is the idempotency proof; anything else means a duplicate was created and must be investigated before continuing.

**Autonomous?** ✅ Yes, when CLI access works. There is no scheduler — this is currently a manual convergence step, and automating it is unclaimed work.

---

## 4 — Close the remaining WP5D acceptance gaps 🤖 autonomous

**Objective.** Finish what `PILOT_WEEKLY_CHORES.md` §8 asks for and WP5D did not deliver.

Not yet built:

- **Quick chore creation** ("הוספת מטלה") — an adult adding a recurring chore from the UI with no code change and no config edit;
- **editing** an existing recurring chore from the UI.

Both are described in §8 with an approved field list. The schema already supports them; only the UI is missing.

**Evidence of completion.** An adult can create and edit a recurring chore in the app, the change persists, future occurrences reflect it, and tests cover both.

**Autonomous?** ✅ Yes.

---

## 5 — Long-standing required work, still unscheduled

Neither blocks the pilot; both block production.

- **WP4.5 — Identity RPCs.** Membership and invitation mutations as authorized, audited, atomic `SECURITY DEFINER` RPCs (ADR-028).
- **WP4.6 — Auth account deletion.** `household_members.auth_user_id` is still `ON DELETE CASCADE`; deleting an Auth account silently removes memberships and can leave a household ownerless (ADR-031). **Blocks production onboarding and any account-deletion capability.**

See [`../todo.md`](../todo.md) for the full backlog.

---

## Open product question — not an agent decision

`PILOT_WEEKLY_CHORES.md` §10 lists decisions reserved for the owner. Two are still genuinely open and were **not** settled by implementation:

- whether a **child may undo their own completion**, and for how long;
- whether **adults appear** in the weekly chores view by default.

The database permits both; the product has not chosen. Do not infer an answer from the current UI — record any change as a decision in [`../decisions.md`](../decisions.md) first.
