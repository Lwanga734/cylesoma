-- Students/classes/import self-check. Run in the Supabase SQL editor (default postgres role). Always rolls back;
-- the 15 results are printed in the error message at the bottom.
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  u_reg uuid := gen_random_uuid(); u_dep uuid := gen_random_uuid(); u_t uuid := gen_random_uuid(); u_h uuid := gen_random_uuid();
  c5 uuid; c6 uuid; res text[] := '{}'; n int; j jsonb; v text;
begin
  insert into auth.users (id,email) values (u_reg,'sreg@t.test'),(u_dep,'sdep@t.test'),(u_t,'st@t.test'),(u_h,'sh@t.test');
  insert into public.schools (id,name,slug) values (a,'Sprint2 A','s2a-'||left(a::text,8)),(b,'Sprint2 B','s2b-'||left(b::text,8));
  insert into public.memberships (user_id,school_id,role) values (u_reg,a,'registrar'),(u_dep,a,'deputy'),(u_t,a,'teacher'),(u_h,a,'head');
  insert into public.students (school_id, admission_no, first_name, last_name) values (b,'B1','Other','School');

  execute 'set local role authenticated';

  perform set_config('request.jwt.claims', jsonb_build_object('sub',u_reg,'role','authenticated','school_id',a,'user_role','registrar')::text, true);
  j := public.import_students('[{"admission_no":"A1","first_name":"Ann","last_name":"One","class_name":"P5","date_of_birth":"2015-03-02","boarding":true},
                                 {"admission_no":"A2","first_name":"Ben","last_name":"Two","class_name":"p5"},
                                 {"admission_no":"A3","first_name":"Cy","last_name":"Three","class_name":"P6"}]'::jsonb);
  res := res || ('1 registrar import (expect inserted 3, classes_created 2): '||j::text);
  select count(*) into n from public.classes where school_id=a; res := res || ('2 classes created, case-insensitive match (expect 2): '||n);

  j := public.import_students('[{"admission_no":"A1","first_name":"Ann","last_name":"One","class_name":"P5"},
                                 {"admission_no":"A4","first_name":"Dee","last_name":"Four","class_name":"P5"}]'::jsonb);
  res := res || ('3 re-import: duplicate skipped (expect inserted 1, skipped 1): '||j::text);

  begin perform public.import_students('[{"admission_no":"A9","first_name":"Zed","last_name":""}]'::jsonb); res := res || '4 bad row: ALLOWED (BAD)'::text;
  exception when others then res := res || ('4 row missing last name rejected: '||sqlerrm); end;
  begin perform public.import_students('[{"admission_no":"A8","first_name":"Ok","last_name":"Fine"},{"admission_no":"A7","first_name":"Bad","last_name":"Row","date_of_birth":"not-a-date"}]'::jsonb); res := res || '5 bad date: ALLOWED (BAD)'::text;
  exception when others then res := res || ('5 bad date rejects the whole batch: '||sqlerrm); end;
  select count(*) into n from public.students where school_id=a and admission_no in ('A8','A7'); res := res || ('6 nothing from the failed batch was kept (expect 0): '||n);

  select id into c6 from public.classes where school_id=a and name='P6';
  update public.classes set deleted_at = now() where id = c6;
  j := public.import_students('[{"admission_no":"A5","first_name":"Eve","last_name":"Five","class_name":"P6"}]'::jsonb);
  select (deleted_at is null)::text into v from public.classes where id=c6; res := res || ('7 archived class reused and restored (expect true, classes_created 0): '||v||' '||j::text);

  perform set_config('request.jwt.claims', jsonb_build_object('sub',u_dep,'role','authenticated','school_id',a,'user_role','deputy')::text, true);
  begin perform public.import_students('[{"admission_no":"D1","first_name":"No","last_name":"Right"}]'::jsonb); res := res || '8 deputy imports students: ALLOWED (BAD)'::text;
  exception when others then res := res || ('8 deputy cannot import students: '||sqlerrm); end;
  insert into public.classes (school_id,name) values (a,'P7'); res := res || '9 deputy can create a class (ok)'::text;

  perform set_config('request.jwt.claims', jsonb_build_object('sub',u_t,'role','authenticated','school_id',a,'user_role','teacher')::text, true);
  begin perform public.import_students('[{"admission_no":"T1","first_name":"No","last_name":"Right"}]'::jsonb); res := res || '10 teacher imports: ALLOWED (BAD)'::text;
  exception when others then res := res || ('10 teacher cannot import: '||sqlerrm); end;
  select count(*) into n from public.students; res := res || ('11 unassigned teacher sees students (expect 0): '||n);
  execute 'reset role';
  select id into c5 from public.classes where school_id=a and name='P5';
  insert into public.teacher_assignments (school_id, teacher_id, class_id) values (a,u_t,c5);
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', jsonb_build_object('sub',u_t,'role','authenticated','school_id',a,'user_role','teacher')::text, true);
  select count(*) into n from public.students; res := res || ('12 teacher assigned to P5 sees only P5 students (expect 3: A1,A2,A4): '||n);

  perform set_config('request.jwt.claims', jsonb_build_object('sub',u_h,'role','authenticated','school_id',a,'user_role','head')::text, true);
  select count(*) into n from public.students; res := res || ('13 head sees all of own school, none of other (expect 5): '||n);
  begin update public.students set status='banana' where admission_no='A1'; res := res || '14 invalid status: ALLOWED (BAD)'::text;
  exception when others then res := res || ('14 invalid status rejected: '||sqlerrm); end;
  update public.students set status='withdrawn' where admission_no='A1'; select status into v from public.students where admission_no='A1';
  res := res || ('15 head withdraws a student (expect withdrawn): '||v);

  raise exception E'TEST RESULTS (rolled back):\n%', array_to_string(res, E'\n');
end $$;
