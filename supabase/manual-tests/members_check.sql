-- Member-management self-check. Run in the Supabase SQL editor (as the default postgres role).
-- It builds throw-away schools and users, tries the allowed and forbidden actions as each role, and ALWAYS
-- rolls back at the end, so nothing is kept. The results are printed in the error message at the bottom.
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  h uuid := gen_random_uuid(); h2 uuid := gen_random_uuid(); r uuid := gen_random_uuid();
  t uuid := gen_random_uuid(); p uuid := gen_random_uuid(); x uuid := gen_random_uuid();
  m_t uuid; m_p uuid; m_x uuid; m_h uuid;
  res text[] := '{}'; n int; v text; ok boolean;
begin
  insert into auth.users (id, email) values
    (h,'th@t.test'),(h2,'th2@t.test'),(r,'tr@t.test'),(t,'tt@t.test'),(p,'tp@t.test'),(x,'tx@t.test');
  insert into public.schools (id,name,slug) values (a,'Test A','test-a-'||left(a::text,8)),(b,'Test B','test-b-'||left(b::text,8));
  insert into public.memberships (user_id,school_id,role) values
    (h,a,'head'),(h2,a,'head'),(r,a,'registrar'),(t,a,'teacher'),(p,a,'parent'),(x,b,'head');
  select id into m_t from public.memberships where user_id=t; select id into m_p from public.memberships where user_id=p;
  select id into m_x from public.memberships where user_id=x; select id into m_h from public.memberships where user_id=h;
  insert into public.profiles (user_id) values (t),(p);

  execute 'set local role authenticated';

  -- head
  perform set_config('request.jwt.claims', jsonb_build_object('sub',h,'role','authenticated','school_id',a,'user_role','head')::text, true);
  select count(*) into n from public.school_members(); res := res || ('1 head sees members (expect 5): '||n);
  perform public.update_member(m_t, 'librarian'); select role::text into v from public.memberships where id=m_t;
  res := res || ('2 head changes teacher->librarian (expect librarian): '||v);
  perform public.update_member(m_t, null, 'suspended'); select status::text into v from public.memberships where id=m_t;
  res := res || ('3 head suspends (expect suspended): '||v);
  perform public.update_member(m_t, null, 'active');
  begin perform public.update_member(m_h, 'teacher'); res := res || '4 head edits self: ALLOWED (BAD)';
  exception when others then res := res || ('4 head edits self blocked: '||sqlerrm); end;
  begin perform public.update_member(m_x, 'student'); res := res || '5 head edits other school: ALLOWED (BAD)';
  exception when others then res := res || ('5 head edits other school blocked: '||sqlerrm); end;
  update public.memberships set role='student' where id=m_t; get diagnostics n = row_count;
  res := res || ('6 head direct table update affects rows (expect 0): '||n);

  -- registrar
  perform set_config('request.jwt.claims', jsonb_build_object('sub',r,'role','authenticated','school_id',a,'user_role','registrar')::text, true);
  select count(*) into n from public.school_members(); res := res || ('7 registrar sees (expect 2: parent + self): '||n);
  begin perform public.update_member(m_t, 'teacher', 'suspended'); res := res || '8 registrar edits teacher: ALLOWED (BAD)';
  exception when others then res := res || ('8 registrar edits teacher blocked: '||sqlerrm); end;
  begin perform public.update_member(m_p, 'teacher'); res := res || '9 registrar promotes parent->teacher: ALLOWED (BAD)';
  exception when others then res := res || ('9 registrar promotes parent->teacher blocked: '||sqlerrm); end;
  perform public.update_member(m_p, null, 'suspended'); select status::text into v from public.memberships where id=m_p;
  res := res || ('10 registrar suspends parent (expect suspended): '||v);

  -- teacher
  perform set_config('request.jwt.claims', jsonb_build_object('sub',t,'role','authenticated','school_id',a,'user_role','teacher')::text, true);
  begin perform * from public.school_members(); res := res || '11 teacher lists members: ALLOWED (BAD)';
  exception when others then res := res || ('11 teacher lists members blocked: '||sqlerrm); end;

  -- removal, and a removed person with an old token
  perform set_config('request.jwt.claims', jsonb_build_object('sub',h,'role','authenticated','school_id',a,'user_role','head')::text, true);
  perform public.remove_member(m_p);
  select count(*) into n from public.memberships where id=m_p; res := res || ('12 head removes parent (expect 0 rows left): '||n);
  execute 'reset role';
  delete from public.memberships where user_id = h2;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', jsonb_build_object('sub',h2,'role','authenticated','school_id',a,'user_role','head')::text, true);
  begin perform * from public.school_members(); res := res || '13 removed head with old token lists members: ALLOWED (BAD)';
  exception when others then res := res || ('13 removed head with old token blocked: '||sqlerrm); end;

  -- setup-link eligibility (service-side function)
  execute 'reset role';
  select public.can_reissue_link(t, a) into ok; res := res || ('14 link eligible, no password set (expect true): '||ok);
  update public.profiles set password_set_at = now() where user_id = t;
  select public.can_reissue_link(t, a) into ok; res := res || ('15 link eligible after password set (expect false): '||ok);
  select public.can_reissue_link(x, b) into ok; res := res || ('16 link for user with no profile row (expect false): '||ok);

  raise exception E'TEST RESULTS (rolled back):\n%', array_to_string(res, E'\n');
end $$;
