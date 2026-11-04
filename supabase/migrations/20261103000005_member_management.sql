-- Member management: list, change role, suspend/reactivate, remove, and setup-link eligibility.
-- All changes go through SECURITY DEFINER functions that re-check the caller against the database
-- (not just the JWT), so a removed or demoted person cannot keep acting on an old token.

alter table public.profiles add column password_set_at timestamptz;

-- Writes to memberships now happen only through the functions below and the invite Edge Function
-- (service role). Heads can no longer edit rows directly, which keeps the "last head" rule intact.
drop policy memberships_write on public.memberships;

-- Which roles each kind of manager may see and change. Mirrors web/src/lib/roles.ts and the
-- invite-user Edge Function (a unit test checks the web copy against this file).
create function public.manageable_roles(p_caller_role text) returns text[]
language sql immutable as $$
  select case p_caller_role
    when 'head' then array['owner','head','deputy','hod','bursar','registrar','hr','teacher','librarian','nurse','storekeeper','boarding','transport','parent','student']
    when 'registrar' then array['parent','student']
    when 'hr' then array['teacher','librarian','nurse','storekeeper','boarding','transport']
    else array[]::text[]
  end $$;

-- Roles the CURRENT caller may manage; empty unless the database confirms they really hold that role now.
create function public.caller_manageable_roles() returns text[]
language plpgsql stable security definer set search_path = public as $$
declare
  v_role text := public.current_user_role();
  v_school uuid := public.current_school();
begin
  if v_school is null or v_role is null or not exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid() and m.school_id = v_school
      and m.role::text = v_role and m.status = 'active'
  ) then
    return array[]::text[];
  end if;
  return public.manageable_roles(v_role);
end $$;
revoke all on function public.caller_manageable_roles() from public, anon, authenticated;

create function public.school_members() returns table (
  membership_id uuid, user_id uuid, email text, full_name text, role text, status text,
  created_at timestamptz, last_sign_in_at timestamptz, password_set boolean,
  invited_by_email text, is_self boolean
) language plpgsql stable security definer set search_path = public, auth as $$
declare v_roles text[] := public.caller_manageable_roles();
begin
  if cardinality(v_roles) = 0 then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select m.id, m.user_id, u.email::text, p.full_name, m.role::text, m.status::text,
         m.created_at, u.last_sign_in_at, (p.password_set_at is not null),
         ib.email::text, (m.user_id = auth.uid())
  from public.memberships m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.user_id = m.user_id
  left join auth.users ib on ib.id = m.invited_by
  where m.school_id = public.current_school()
    and (m.role::text = any(v_roles) or m.user_id = auth.uid())
  order by m.created_at;
end $$;
revoke all on function public.school_members() from public, anon;
grant execute on function public.school_members() to authenticated;

create function public.update_member(
  p_membership_id uuid, p_role text default null, p_status text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_roles text[] := public.caller_manageable_roles();
  v_m public.memberships%rowtype;
  v_new_role text;
  v_new_status text;
begin
  if cardinality(v_roles) = 0 then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into v_m from public.memberships
   where id = p_membership_id and school_id = public.current_school() for update;
  if not found then raise exception 'member not found'; end if;
  if v_m.user_id = auth.uid() then raise exception 'you cannot change your own membership'; end if;
  if not (v_m.role::text = any(v_roles)) then raise exception 'not allowed' using errcode = '42501'; end if;

  v_new_role := coalesce(p_role, v_m.role::text);
  v_new_status := coalesce(p_status, v_m.status::text);
  if not (v_new_role = any(v_roles)) then raise exception 'not allowed' using errcode = '42501'; end if;
  if v_new_status not in ('active', 'suspended') and v_new_status <> v_m.status::text then
    raise exception 'invalid status';
  end if;

  if v_m.role = 'head' and v_m.status = 'active'
     and (v_new_role <> 'head' or v_new_status <> 'active')
     and not exists (select 1 from public.memberships h
                     where h.school_id = v_m.school_id and h.role = 'head'
                       and h.status = 'active' and h.id <> v_m.id) then
    raise exception 'a school must keep at least one active head teacher';
  end if;

  update public.memberships
     set role = v_new_role::public.app_role, status = v_new_status::public.membership_status
   where id = v_m.id;
end $$;
revoke all on function public.update_member(uuid, text, text) from public, anon;
grant execute on function public.update_member(uuid, text, text) to authenticated;

create function public.remove_member(p_membership_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_roles text[] := public.caller_manageable_roles();
  v_m public.memberships%rowtype;
begin
  if cardinality(v_roles) = 0 then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into v_m from public.memberships
   where id = p_membership_id and school_id = public.current_school() for update;
  if not found then raise exception 'member not found'; end if;
  if v_m.user_id = auth.uid() then raise exception 'you cannot change your own membership'; end if;
  if not (v_m.role::text = any(v_roles)) then raise exception 'not allowed' using errcode = '42501'; end if;

  if v_m.role = 'head' and v_m.status = 'active'
     and not exists (select 1 from public.memberships h
                     where h.school_id = v_m.school_id and h.role = 'head'
                       and h.status = 'active' and h.id <> v_m.id) then
    raise exception 'a school must keep at least one active head teacher';
  end if;

  delete from public.memberships where id = v_m.id;
end $$;
revoke all on function public.remove_member(uuid) from public, anon;
grant execute on function public.remove_member(uuid) to authenticated;

-- A setup link may be re-issued only for someone who has never chosen a password AND belongs to no other
-- school, so it can never be used to take over an account that is already in use. Used by invite-user only.
create function public.can_reissue_link(p_user_id uuid, p_school_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.password_set_at is null from public.profiles p where p.user_id = p_user_id), false)
     and not exists (select 1 from public.memberships m
                     where m.user_id = p_user_id and m.school_id <> p_school_id and m.status = 'active') $$;
revoke all on function public.can_reissue_link(uuid, uuid) from public, anon, authenticated;
grant execute on function public.can_reissue_link(uuid, uuid) to service_role;
