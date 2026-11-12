-- Write-permission matrix self-check. Run in the Supabase SQL editor (default postgres role).
-- For every role it tries to INSERT into classes, students, terms, student_guardians and teacher_assignments and compares
-- the result with who SHOULD be allowed. Always rolls back; the answer is printed in the error message at the bottom.
-- Expected last line: "MISMATCHES: none". Extend `tabs` and the CASE when you add tables with write policies.
do $$
declare
  a uuid := gen_random_uuid(); roles text[] := array['head','deputy','registrar','teacher','bursar','hod','owner','parent','student','hr','librarian'];
  tabs text[] := array['classes','students','terms','guardians','assignments'];
  r text; tb text; u uuid; guardian uuid := gen_random_uuid(); stu uuid := gen_random_uuid(); cls uuid := gen_random_uuid(); tchr uuid := gen_random_uuid();
  allowed boolean; got boolean; checked int := 0; bad text[] := '{}';
begin
  insert into public.schools (id,name,slug) values (a,'Matrix','matrix-'||left(a::text,8));
  insert into auth.users (id,email) values (guardian,'mg@t.test'),(tchr,'mt@t.test');
  insert into public.classes (id,school_id,name) values (cls,a,'Fixture');
  insert into public.students (id,school_id,admission_no,first_name,last_name) values (stu,a,'FIX','Fix','Ture');

  foreach r in array roles loop
    u := gen_random_uuid();
    insert into auth.users (id,email) values (u, r||'@matrix.test');
    insert into public.memberships (user_id,school_id,role) values (u,a,r::public.app_role);
  end loop;

  foreach r in array roles loop
    select user_id into u from public.memberships where school_id=a and role=r::public.app_role;
    foreach tb in array tabs loop
      allowed := case tb
        when 'classes' then r in ('head','deputy','registrar')
        when 'students' then r in ('head','registrar')
        when 'terms' then r in ('head','deputy')
        when 'guardians' then r in ('head','registrar')
        when 'assignments' then r in ('head','deputy') end;
      execute 'set local role authenticated';
      perform set_config('request.jwt.claims', jsonb_build_object('sub',u,'role','authenticated','school_id',a,'user_role',r)::text, true);
      got := true;
      begin
        if tb='classes' then insert into public.classes (school_id,name) values (a,'C-'||r);
        elsif tb='students' then insert into public.students (school_id,admission_no,first_name,last_name) values (a,'S-'||r,'T','T');
        elsif tb='terms' then insert into public.terms (school_id,name,year,starts_on,ends_on) values (a,'T-'||r,2027,'2027-01-01','2027-04-01');
        elsif tb='guardians' then insert into public.student_guardians (student_id,guardian_user_id,school_id) values (stu,guardian,a);
        else insert into public.teacher_assignments (school_id,teacher_id,class_id) values (a,tchr,cls);
        end if;
      exception when others then got := false; end;
      execute 'reset role';
      delete from public.student_guardians where student_id=stu; delete from public.teacher_assignments where school_id=a;
      checked := checked + 1;
      if got <> allowed then bad := bad || (r||' on '||tb||': got '||got||', expected '||allowed); end if;
    end loop;
  end loop;

  raise exception E'MATRIX: % combinations checked. MISMATCHES: %', checked, case when cardinality(bad)=0 then 'none' else array_to_string(bad, '; ') end;
end $$;
