-- WP3 — invitation counters, expiry/revocation representability and token
-- hash uniqueness. No raw token is ever stored.
begin;
select plan(11);

insert into public.households (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Household A');

-- A valid invitation.
select lives_ok(
  $$ insert into public.household_invitations
       (id, household_id, role, token_hash, expires_at)
     values ('dddddddd-dddd-dddd-dddd-dddddddddddd',
             '11111111-1111-1111-1111-111111111111',
             'adult', decode('aa01', 'hex'), now() + interval '7 days') $$,
  'a valid invitation is accepted'
);

select is(
  (select used_count from public.household_invitations
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  0,
  'used_count starts at 0'
);
select is(
  (select max_uses from public.household_invitations
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  1,
  'max_uses defaults to 1 (single-use invitation)'
);

-- Counter constraints.
select throws_ok(
  $$ insert into public.household_invitations (household_id, role, token_hash, expires_at, max_uses)
     values ('11111111-1111-1111-1111-111111111111', 'adult',
             decode('aa02', 'hex'), now() + interval '1 day', 0) $$,
  '23514',
  null,
  'max_uses must be greater than zero'
);
select throws_ok(
  $$ insert into public.household_invitations (household_id, role, token_hash, expires_at, max_uses, used_count)
     values ('11111111-1111-1111-1111-111111111111', 'adult',
             decode('aa03', 'hex'), now() + interval '1 day', 1, -1) $$,
  '23514',
  null,
  'used_count cannot be negative'
);
select throws_ok(
  $$ insert into public.household_invitations (household_id, role, token_hash, expires_at, max_uses, used_count)
     values ('11111111-1111-1111-1111-111111111111', 'adult',
             decode('aa04', 'hex'), now() + interval '1 day', 2, 3) $$,
  '23514',
  null,
  'used_count cannot exceed max_uses'
);

-- Token hashes are unique: a replayed hash cannot address two invitations.
select throws_ok(
  $$ insert into public.household_invitations (household_id, role, token_hash, expires_at)
     values ('11111111-1111-1111-1111-111111111111', 'adult',
             decode('aa01', 'hex'), now() + interval '1 day') $$,
  '23505',
  null,
  'a duplicate invitation token_hash is rejected'
);

-- An invitation must never mint an owner.
select throws_ok(
  $$ insert into public.household_invitations (household_id, role, token_hash, expires_at)
     values ('11111111-1111-1111-1111-111111111111', 'owner',
             decode('aa05', 'hex'), now() + interval '1 day') $$,
  '23514',
  null,
  'an invitation cannot carry the owner role'
);

-- Expiry and revocation remain representable.
select lives_ok(
  $$ insert into public.household_invitations (household_id, role, token_hash, expires_at)
     values ('11111111-1111-1111-1111-111111111111', 'guest',
             decode('aa06', 'hex'), now() - interval '1 day') $$,
  'an already-expired invitation is representable (expiry is evaluated by the acceptance RPC)'
);
select lives_ok(
  $$ update public.household_invitations
       set revoked_at = now()
     where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' $$,
  'an invitation can be revoked'
);

-- No raw-token column exists anywhere: only the hash is persisted.
select is(
  (select count(*) from information_schema.columns
    where table_schema = 'public'
      and table_name = 'household_invitations'
      and column_name in ('token', 'raw_token', 'token_plain')),
  0::bigint,
  'no raw invitation token column exists — only token_hash is stored'
);

select * from finish();
rollback;
