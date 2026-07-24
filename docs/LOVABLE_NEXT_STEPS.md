# Next Steps

Recommended order. Each step is one focused prompt/PR.

## 1. Enable Lovable Cloud (Supabase)
- Provision the project, generate `src/integrations/supabase/*` clients.
- Add `.env` entries (`VITE_SUPABASE_URL`, publishable key). No service role in the app.

## 2. Auth
- Supabase email + (optionally) Google OAuth.
- `src/routes/_authenticated/route.tsx` gate.
- Replace UX-only role checks with real session + `user_roles` table + `has_role` security-definer function (see house rules for user roles).

## 3. Schema + RLS
- Tables: `households`, `household_members` (with role enum), `user_roles`, `tasks`, `task_templates`, `follow_ups`, `follow_up_actions`, `shopping_lists`, `shopping_items`, `transport_rides`, `errands`, `calendar_events`, `shift_rules`, `notifications`.
- Every `CREATE TABLE public.*` must ship with explicit `GRANT` + `ENABLE ROW LEVEL SECURITY` + policies in the same migration.
- Membership predicate: `EXISTS (SELECT 1 FROM household_members WHERE household_id = x AND user_id = auth.uid())`.

## 4. Replace repositories one module at a time
Suggested order (least → most cross-cutting):
1. `shoppingRepo` → Supabase (isolated, well-tested).
2. `tasksRepo` + `templatesRepo`.
3. `followUpRepo`.
4. `transportRepo`.
5. `errandsRepo`.
6. `calendarRepo`.
7. `notificationsRepo`.
8. `householdRepo` + `peopleDirectory` (remove alias table).
9. `todayRepo` → derive from Supabase queries via `todayService`.

Keep the `subscribe()` API surface — swap the internal source. Use Supabase realtime channels for change notifications.

## 5. Server-side rules
- Move `waiting_external → nextFollowUpAt/followUpDisabledReason` invariant into a DB trigger or check constraint.
- Move task/follow-up/transport transitions into `createServerFn` handlers or SQL functions to make them tamper-proof.

## 6. Real notifications
- Web Push (VAPID) + quiet-hours honoring the existing `notification` domain logic.
- Email via a provider connector (SendGrid/Resend) through the Lovable AI Gateway or a server function.

## 7. E2E tests
- Playwright smoke: onboarding → create task → complete → soft delete → restore.
- Child mode isolation.

## 8. Observability
- Sentry (or equivalent) + Supabase logs.

## 9. Deploy
- Confirm Cloudflare Worker build (`bun run build`) still green after each schema swap.
- Set custom domain when ready.
