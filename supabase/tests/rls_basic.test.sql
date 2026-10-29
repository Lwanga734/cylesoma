begin;
select plan(6);

-- fixtures (as postgres)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1','teacher@t.test'),
  ('00000000-0000-0000-0000-0000000000a2','parent@t.test'),
  ('00000000-0000-0000-0000-0000000000a3','bursar@t.test');
insert into public.schools (id, name, slug) values
  ('11111111-1111-1111-1111-111111111111','Test School','test'),
  ('22222222-2222-2222-2222-222222222222','Other School','other');
insert into public.classes (id, school_id, name) values
  ('c1111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','P5'),
  ('c2222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222','P5');
insert into public.students (id, school_id, admission_no, first_name, last_name, class_id) values
  ('51111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','A1','Ann','One','c1111111-1111-1111-1111-111111111111'),
  ('52222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','A2','Ben','Two','c1111111-1111-1111-1111-111111111111'),
  ('53333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','B1','Cy','Three','c2222222-2222-2222-2222-222222222222');
insert into public.student_guardians (student_id, guardian_user_id, school_id) values
  ('51111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000a2','11111111-1111-1111-1111-111111111111');
insert into public.teacher_assignments (school_id, teacher_id, class_id) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000a1','c1111111-1111-1111-1111-111111111111');
insert into public.attendance (school_id, student_id, att_date, status) values
  ('11111111-1111-1111-1111-111111111111','51111111-1111-1111-1111-111111111111','2026-10-01','present'),
  ('11111111-1111-1111-1111-111111111111','52222222-2222-2222-2222-222222222222','2026-10-01','absent');

-- parent
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","school_id":"11111111-1111-1111-1111-111111111111","user_role":"parent"}', true);
set local role authenticated;
select is((select count(*) from public.students)::int, 1, 'parent sees only their own child');
select is((select count(*) from public.attendance)::int, 1, 'parent sees only their child attendance');
reset role;

-- teacher
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","school_id":"11111111-1111-1111-1111-111111111111","user_role":"teacher"}', true);
set local role authenticated;
select is((select count(*) from public.students)::int, 2, 'teacher sees only students in assigned class (not other schools)');
select lives_ok($$insert into public.attendance (school_id, student_id, att_date, status)
  values ('11111111-1111-1111-1111-111111111111','51111111-1111-1111-1111-111111111111','2026-10-02','present')$$,
  'teacher can mark attendance for assigned class');
reset role;

-- bursar
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated","school_id":"11111111-1111-1111-1111-111111111111","user_role":"bursar"}', true);
set local role authenticated;
select is((select count(*) from public.attendance)::int, 0, 'bursar cannot read attendance');
select throws_ok($$insert into public.attendance (school_id, student_id, att_date, status)
  values ('11111111-1111-1111-1111-111111111111','51111111-1111-1111-1111-111111111111','2026-10-03','present')$$,
  '42501', null, 'bursar cannot write attendance');
reset role;

select * from finish();
rollback;
