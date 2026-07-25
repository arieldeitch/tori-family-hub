-- WP3 — household defaults and value constraints.
begin;
select plan(8);

insert into public.households (id, name)
values ('11111111-1111-1111-1111-111111111111', 'משפחת בדיקה');

-- Hebrew-first defaults (ADR-008).
select is((select timezone from public.households where id = '11111111-1111-1111-1111-111111111111'),
  'Asia/Jerusalem', 'household timezone defaults to Asia/Jerusalem');
select is((select locale from public.households where id = '11111111-1111-1111-1111-111111111111'),
  'he-IL', 'household locale defaults to he-IL');
select is((select week_starts_on from public.households where id = '11111111-1111-1111-1111-111111111111'),
  0::smallint, 'week_starts_on defaults to 0 (Sunday)');
select ok((select created_at is not null and updated_at is not null
           from public.households where id = '11111111-1111-1111-1111-111111111111'),
  'created_at and updated_at are populated by default');
select ok((select deleted_at is null
           from public.households where id = '11111111-1111-1111-1111-111111111111'),
  'a new household is not soft-deleted');

-- Value constraints.
select throws_ok(
  $$ insert into public.households (name) values ('   ') $$,
  '23514',
  null,
  'a blank household name is rejected'
);
select throws_ok(
  $$ insert into public.households (name, week_starts_on) values ('X', 7) $$,
  '23514',
  null,
  'week_starts_on outside 0..6 is rejected'
);

-- Soft delete is representable (ADR-007).
select lives_ok(
  $$ update public.households
       set deleted_at = now()
     where id = '11111111-1111-1111-1111-111111111111' $$,
  'a household can be soft-deleted'
);

select * from finish();
rollback;
