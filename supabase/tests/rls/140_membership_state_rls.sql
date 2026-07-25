-- WP4 behavioural RLS — membership state fails closed.
-- Suspended, revoked, expired, deactivated profile and soft-deleted household
-- must all deny, including at the exact expiry boundary.
begin;
select plan(18);

select set_config('tori.a_suspended', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Suspended'), true);
select set_config('tori.a_revoked', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Revoked'), true);
select set_config('tori.a_expired', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Expired Guest'), true);
select set_config('tori.a_inactive', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Inactive Profile'), true);
select set_config('tori.a_guest', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Guest'), true);

-- Suspended -----------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_suspended'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is(current_user::text, 'authenticated', 'suspended block acts as authenticated');
select is((select count(*) from public.households), 0::bigint,
  'a suspended member sees no household');
select is((select count(*) from public.member_profiles), 0::bigint,
  'a suspended member sees no profiles');
select is((select count(*) from public.household_members), 0::bigint,
  'a suspended member sees no memberships');
reset role;

-- Revoked -------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_revoked'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.households), 0::bigint,
  'a revoked member sees no household');
select is((select count(*) from public.member_profiles), 0::bigint,
  'a revoked member sees no profiles');
select is((select count(*) from public.household_members), 0::bigint,
  'a revoked member sees no memberships — the audit row grants nothing');
reset role;

-- Expired temporary access ---------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_expired'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.households), 0::bigint,
  'a guest whose access_expires_at is in the past sees nothing');
select is((select count(*) from public.member_profiles), 0::bigint,
  'expired access grants no profile visibility');
reset role;

-- Deactivated caller profile --------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_inactive'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.households), 0::bigint,
  'an active membership whose member profile is deactivated grants no access');
select is((select count(*) from public.household_members), 0::bigint,
  'a deactivated profile sees no membership rows');
reset role;

-- Expiry boundary -------------------------------------------------------------
-- now() is fixed for the whole transaction, so these comparisons are exact.
-- The predicate is `access_expires_at > now()`, therefore a value equal to now()
-- is already expired.
update public.household_members set access_expires_at = now()
  where profile_id = 'aaaa0000-0000-4000-8000-000000000104';

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_guest'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.households), 0::bigint,
  'access_expires_at exactly equal to now() is expired and denied');
reset role;

update public.household_members set access_expires_at = now() + interval '1 microsecond'
  where profile_id = 'aaaa0000-0000-4000-8000-000000000104';

set local role authenticated;
select is((select count(*) from public.households), 1::bigint,
  'access_expires_at one microsecond after now() is still active — exact boundary');
reset role;

update public.household_members set access_expires_at = null
  where profile_id = 'aaaa0000-0000-4000-8000-000000000104';

set local role authenticated;
select is((select count(*) from public.households), 1::bigint,
  'a NULL access_expires_at means no expiry');
select is((select count(*) from public.member_profiles), 1::bigint,
  'an unexpired guest still sees only their own profile');
reset role;

-- Soft-deleted household ------------------------------------------------------
-- The A owner is also the active owner of the soft-deleted household D.
select set_config('tori.a_owner', (
  select m.auth_user_id::text from public.household_members m
  join public.member_profiles p on p.id = m.profile_id
  where p.display_name = 'A Owner'), true);
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tori.a_owner'), 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*) from public.households
           where id = 'dddd0000-0000-4000-8000-000000000001'), 0::bigint,
  'an active owner of a soft-deleted household sees nothing of it');
select is((select count(*) from public.member_profiles
           where household_id = 'dddd0000-0000-4000-8000-000000000001'), 0::bigint,
  'profiles of a soft-deleted household are invisible');
select is((select count(*) from public.household_members
           where household_id = 'dddd0000-0000-4000-8000-000000000001'), 0::bigint,
  'memberships of a soft-deleted household are invisible');
reset role;

select * from finish();
rollback;
