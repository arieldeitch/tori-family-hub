-- WP3 — migrations apply cleanly and the seed stays business-empty.
-- Transactional and independent: every test file rolls back at the end.
begin;
select plan(7);

-- Migrations apply from a clean database, in order, on top of WP2.
select ok(
  exists (select 1 from supabase_migrations.schema_migrations where version = '20260724153731'),
  'WP2 foundation migration is applied'
);
select ok(
  exists (select 1 from supabase_migrations.schema_migrations where version = '20260725143927'),
  'WP3 identity/household migration is applied'
);
select is(
  (select version from supabase_migrations.schema_migrations order by version desc limit 1),
  '20260725143927',
  'WP3 migration is the newest applied migration, i.e. it applies after the WP2 foundation'
);

-- seed.sql must remain business-empty (decision D4): fixtures are transactional
-- and test-local, never persisted into the shared seed.
select is((select count(*) from public.households), 0::bigint,
  'seed creates no households');
select is((select count(*) from public.member_profiles), 0::bigint,
  'seed creates no member profiles');
select is((select count(*) from public.household_members), 0::bigint,
  'seed creates no household memberships');
select is((select count(*) from public.household_invitations), 0::bigint,
  'seed creates no invitations');

select * from finish();
rollback;
