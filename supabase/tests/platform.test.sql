begin;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1','super@t.test'),
  ('00000000-0000-0000-0000-0000000000c2','head@t.test');
insert into public.schools (id, name, slug) values
  ('11111111-1111-1111-1111-111111111111','School S','s'),
  ('22222222-2222-2222-2222-222222222222','School O','o');
insert into public.memberships (user_id, school_id, role) values
  ('00000000-0000-0000-0000-0000000000c2','11111111-1111-1111-1111-111111111111','head');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000c1');

-- ordinary school head
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","school_id":"11111111-1111-1111-1111-111111111111","user_role":"head"}', true);
set local role authenticated;
select is(public.is_platform_admin(), false, 'a school head is not a platform admin');
select throws_ok($$select public.platform_create_school('Sneaky School','sneaky')$$, '42501', null, 'school head cannot create schools');
select throws_ok($$select * from public.platform_school_overview()$$, '42501', null, 'school head cannot list all schools');
select is((select count(*) from public.schools)::int, 1, 'school head still sees only their own school');
reset role;

-- platform super admin (no school membership at all)
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.platform_create_school('New School','new-school','Motto','#0075e7')$$, 'platform admin can create a school');
select is((select count(*) from public.platform_school_overview())::int, 3, 'platform admin sees every school');
reset role;

select * from finish();
rollback;
