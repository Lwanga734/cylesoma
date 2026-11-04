-- Platform school management: edit, suspend/reactivate, manage head teachers, safe delete.
-- Every function re-checks is_platform_admin() and writes to the audit log.

alter table public.schools add constraint schools_status_check check (status in ('active', 'suspended'));

-- A suspended school's people lose access to its data at once: current_school() returns null for them, so
-- every row-level-security rule that depends on it stops matching. SECURITY DEFINER avoids a policy loop
-- (the schools table's own policy calls this function).
create or replace function public.current_school() returns uuid
language sql stable security definer set search_path = public as $$
  select s.id from public.schools s
  where s.id = nullif(auth.jwt() ->> 'school_id', '')::uuid and s.status = 'active' $$;

-- The overview now also returns the motto (needed by the edit form).
drop function public.platform_school_overview();
create function public.platform_school_overview() returns table (
  id uuid, name text, slug text, motto text, status text, primary_color text,
  created_at timestamptz, members bigint, heads bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  select s.id, s.name, s.slug, s.motto, s.status, s.primary_color, s.created_at,
    (select count(*) from public.memberships m where m.school_id = s.id and m.status = 'active'),
    (select count(*) from public.memberships m where m.school_id = s.id and m.status = 'active' and m.role = 'head')
  from public.schools s
  order by s.created_at desc;
end $$;
revoke all on function public.platform_school_overview() from public, anon;
grant execute on function public.platform_school_overview() to authenticated;

create function public.platform_update_school(
  p_school_id uuid, p_name text, p_slug text, p_motto text, p_color text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if length(trim(p_name)) < 2 or length(p_name) > 120 then raise exception 'invalid school name'; end if;
  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug) > 50 then raise exception 'invalid slug'; end if;
  if p_color !~ '^#[0-9a-fA-F]{6}$' then raise exception 'invalid colour'; end if;
  update public.schools
     set name = trim(p_name), slug = p_slug,
         motto = nullif(trim(coalesce(p_motto, '')), ''), primary_color = lower(p_color)
   where id = p_school_id;
  if not found then raise exception 'school not found'; end if;
  insert into public.audit_logs (school_id, action, table_name, record_id, details)
  values (p_school_id, 'PLATFORM_UPDATE_SCHOOL', 'schools', p_school_id::text,
          jsonb_build_object('name', trim(p_name), 'slug', p_slug));
end $$;
revoke all on function public.platform_update_school(uuid, text, text, text, text) from public, anon;
grant execute on function public.platform_update_school(uuid, text, text, text, text) to authenticated;

create function public.platform_set_school_status(p_school_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_status not in ('active', 'suspended') then raise exception 'invalid status'; end if;
  update public.schools set status = p_status where id = p_school_id;
  if not found then raise exception 'school not found'; end if;
  insert into public.audit_logs (school_id, action, table_name, record_id, details)
  values (p_school_id, 'PLATFORM_SET_SCHOOL_STATUS', 'schools', p_school_id::text,
          jsonb_build_object('status', p_status));
end $$;
revoke all on function public.platform_set_school_status(uuid, text) from public, anon;
grant execute on function public.platform_set_school_status(uuid, text) to authenticated;

create function public.platform_school_leaders(p_school_id uuid) returns table (
  membership_id uuid, user_id uuid, email text, full_name text, role text, status text,
  created_at timestamptz, last_sign_in_at timestamptz, password_set boolean
) language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  select m.id, m.user_id, u.email::text, p.full_name, m.role::text, m.status::text,
         m.created_at, u.last_sign_in_at, (p.password_set_at is not null)
  from public.memberships m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.user_id = m.user_id
  where m.school_id = p_school_id and m.role in ('head', 'owner')
  order by m.created_at;
end $$;
revoke all on function public.platform_school_leaders(uuid) from public, anon;
grant execute on function public.platform_school_leaders(uuid) to authenticated;

create function public.platform_update_leader(p_membership_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare v_m public.memberships%rowtype;
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_status not in ('active', 'suspended') then raise exception 'invalid status'; end if;
  select * into v_m from public.memberships where id = p_membership_id for update;
  if not found then raise exception 'member not found'; end if;
  if v_m.role not in ('head', 'owner') then raise exception 'not allowed' using errcode = '42501'; end if;
  if v_m.role = 'head' and v_m.status = 'active' and p_status <> 'active'
     and not exists (select 1 from public.memberships h
                     where h.school_id = v_m.school_id and h.role = 'head' and h.status = 'active' and h.id <> v_m.id) then
    raise exception 'a school must keep at least one active head teacher';
  end if;
  update public.memberships set status = p_status::public.membership_status where id = v_m.id;
end $$;
revoke all on function public.platform_update_leader(uuid, text) from public, anon;
grant execute on function public.platform_update_leader(uuid, text) to authenticated;

create function public.platform_remove_leader(p_membership_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_m public.memberships%rowtype;
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into v_m from public.memberships where id = p_membership_id for update;
  if not found then raise exception 'member not found'; end if;
  if v_m.role not in ('head', 'owner') then raise exception 'not allowed' using errcode = '42501'; end if;
  if v_m.role = 'head' and v_m.status = 'active'
     and not exists (select 1 from public.memberships h
                     where h.school_id = v_m.school_id and h.role = 'head' and h.status = 'active' and h.id <> v_m.id) then
    raise exception 'a school must keep at least one active head teacher';
  end if;
  delete from public.memberships where id = v_m.id;
end $$;
revoke all on function public.platform_remove_leader(uuid) from public, anon;
grant execute on function public.platform_remove_leader(uuid) to authenticated;

-- Deleting a school is permanent. Only a suspended school with no student records can be deleted.
-- (Extend the data check below whenever a new module stores school data.)
create function public.platform_delete_school(p_school_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_school public.schools%rowtype;
begin
  if not public.is_platform_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into v_school from public.schools where id = p_school_id for update;
  if not found then raise exception 'school not found'; end if;
  if v_school.status <> 'suspended' then raise exception 'suspend the school before deleting it'; end if;
  if exists (select 1 from public.students where school_id = p_school_id)
     or exists (select 1 from public.attendance where school_id = p_school_id) then
    raise exception 'this school has student records and cannot be deleted';
  end if;
  insert into public.audit_logs (school_id, action, table_name, record_id, details)
  values (p_school_id, 'PLATFORM_DELETE_SCHOOL', 'schools', p_school_id::text,
          jsonb_build_object('name', v_school.name, 'slug', v_school.slug));
  delete from public.schools where id = p_school_id;
end $$;
revoke all on function public.platform_delete_school(uuid) from public, anon;
grant execute on function public.platform_delete_school(uuid) to authenticated;
