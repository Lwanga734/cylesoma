begin;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1','head@t.test'),
  ('00000000-0000-0000-0000-0000000000b2','teacher@t.test'),
  ('00000000-0000-0000-0000-0000000000b3','outsider@t.test');
insert into public.schools (id, name, slug) values
  ('61111111-1111-1111-1111-111111111111','School S','s'),
  ('62222222-2222-2222-2222-222222222222','School O','o');
insert into public.memberships (user_id, school_id, role) values
  ('00000000-0000-0000-0000-0000000000b1','61111111-1111-1111-1111-111111111111','head'),
  ('00000000-0000-0000-0000-0000000000b2','61111111-1111-1111-1111-111111111111','teacher');
insert into public.terms (id, school_id, name, year, starts_on, ends_on) values
  ('71111111-1111-1111-1111-111111111111','61111111-1111-1111-1111-111111111111','Term 1',2027,'2027-02-01','2027-05-01'),
  ('72222222-2222-2222-2222-222222222222','62222222-2222-2222-2222-222222222222','Term 1',2027,'2027-02-01','2027-05-01');

-- teacher
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated","school_id":"61111111-1111-1111-1111-111111111111","user_role":"teacher"}', true);
set local role authenticated;
select is((select count(*) from public.terms)::int, 1, 'teacher sees only own school terms');
select throws_ok($$insert into public.terms (school_id,name,year,starts_on,ends_on)
  values ('61111111-1111-1111-1111-111111111111','Term 2',2027,'2027-06-01','2027-09-01')$$,
  '42501', null, 'teacher cannot create terms');
select lives_ok($$select public.set_active_school('61111111-1111-1111-1111-111111111111')$$, 'member can set active school');
select is((select active_school_id from public.profiles where user_id = '00000000-0000-0000-0000-0000000000b2'),
  '61111111-1111-1111-1111-111111111111'::uuid, 'active school stored');
reset role;

-- head
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","school_id":"61111111-1111-1111-1111-111111111111","user_role":"head"}', true);
set local role authenticated;
select lives_ok($$select public.set_current_term('71111111-1111-1111-1111-111111111111')$$, 'head can set current term');
reset role;

-- outsider (not a member of any school)
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.set_active_school('61111111-1111-1111-1111-111111111111')$$,
  'P0001', 'not a member', 'non-member cannot switch into a school');
select is((select count(*) from public.terms)::int, 0, 'outsider sees no terms');
reset role;

select * from finish();
rollback;
