-- Platform school-management self-check. Run in the Supabase SQL editor (default postgres role).
-- Builds throw-away users and a school, tries allowed and forbidden actions, and ALWAYS rolls back.
-- The results are printed in the error message at the bottom.
do $$
declare
  a uuid := gen_random_uuid(); sa uuid := gen_random_uuid(); u_h uuid := gen_random_uuid(); u_h2 uuid := gen_random_uuid();
  u_t uuid := gen_random_uuid(); u_plat uuid := gen_random_uuid();
  m_h uuid; m_h2 uuid; m_t uuid; res text[] := '{}'; n int; v text;
begin
  insert into auth.users (id,email) values (u_h,'ph@t.test'),(u_h2,'ph2@t.test'),(u_t,'pt@t.test'),(u_plat,'pplat@t.test');
  insert into public.schools (id,name,slug) values (a,'Plat Test','plat-test-'||left(a::text,8));
  insert into public.memberships (user_id,school_id,role) values (u_h,a,'head'),(u_h2,a,'head'),(u_t,a,'teacher');
  select id into m_h from public.memberships where user_id=u_h; select id into m_h2 from public.memberships where user_id=u_h2;
  select id into m_t from public.memberships where user_id=u_t;
  insert into public.platform_admins (user_id) values (u_plat);

  execute 'set local role authenticated';

  perform set_config('request.jwt.claims', jsonb_build_object('sub',u_h,'role','authenticated','school_id',a,'user_role','head')::text, true);
  begin perform public.platform_set_school_status(a,'suspended'); res := res || '1 head suspends own school: ALLOWED (BAD)';
  exception when others then res := res || ('1 head suspends own school blocked: '||sqlerrm); end;
  begin perform public.platform_delete_school(a); res := res || '2 head deletes school: ALLOWED (BAD)';
  exception when others then res := res || ('2 head deletes school blocked: '||sqlerrm); end;
  select count(*) into n from public.school_members(); res := res || ('3 active school: head sees members (expect 3): '||n);

  perform set_config('request.jwt.claims', jsonb_build_object('sub',u_plat,'role','authenticated')::text, true);
  perform public.platform_update_school(a,'Plat Test Renamed','plat-renamed-'||left(a::text,8),'A motto','#0075E7');
  select name into v from public.schools where id=a; res := res || ('4 platform renames school (expect Plat Test Renamed): '||v);
  select count(*) into n from public.platform_school_leaders(a); res := res || ('5 leaders listed (expect 2 heads): '||n);
  begin perform public.platform_delete_school(a); res := res || '6 delete while active: ALLOWED (BAD)';
  exception when others then res := res || ('6 delete while active blocked: '||sqlerrm); end;
  begin perform public.platform_update_leader(m_t,'suspended'); res := res || '7 platform edits a teacher via leader function: ALLOWED (BAD)';
  exception when others then res := res || ('7 leader function on a teacher blocked: '||sqlerrm); end;
  perform public.platform_update_leader(m_h2,'suspended');
  begin perform public.platform_update_leader(m_h,'suspended'); res := res || '8 suspend LAST active head: ALLOWED (BAD)';
  exception when others then res := res || ('8 suspend last active head blocked: '||sqlerrm); end;
  perform public.platform_update_leader(m_h2,'active');

  perform public.platform_set_school_status(a,'suspended');

  perform set_config('request.jwt.claims', jsonb_build_object('sub',u_h,'role','authenticated','school_id',a,'user_role','head')::text, true);
  begin perform * from public.school_members(); res := res || '9 head of SUSPENDED school lists members: ALLOWED (BAD)';
  exception when others then res := res || ('9 head of suspended school blocked: '||sqlerrm); end;
  select status into v from public.schools where id=a; res := res || ('10 head can still read school row to see why (expect suspended): '||coalesce(v,'NULL'));

  perform set_config('request.jwt.claims', jsonb_build_object('sub',u_plat,'role','authenticated')::text, true);
  perform public.platform_set_school_status(a,'active');
  perform set_config('request.jwt.claims', jsonb_build_object('sub',u_h,'role','authenticated','school_id',a,'user_role','head')::text, true);
  select count(*) into n from public.school_members(); res := res || ('11 after reactivation head sees members again (expect 3): '||n);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',u_plat,'role','authenticated')::text, true);
  perform public.platform_set_school_status(a,'suspended');
  perform public.platform_delete_school(a);
  execute 'reset role';
  select count(*) into n from public.schools where id=a; res := res || ('12 suspended empty school deleted (expect 0 left): '||n);
  select count(*) into n from public.memberships where school_id=a; res := res || ('13 its memberships removed too (expect 0): '||n);
  select count(*) into n from public.audit_logs where school_id=a and action like 'PLATFORM_%'; res := res || ('14 platform actions in audit log (expect >=4): '||n);

  raise exception E'TEST RESULTS (rolled back):\n%', array_to_string(res, E'\n');
end $$;
