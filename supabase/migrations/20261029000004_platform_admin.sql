-- Platform super admin: manage schools across the whole platform

create table public.platform_admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
-- No policies for anon/authenticated: the table is readable only through the functions below.

create function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid()) $$;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- Platform admins can see and update every school row (names and settings only; no student data).
create policy schools_platform_read on public.schools for select using (public.is_platform_admin());
create policy schools_platform_update on public.schools for update
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create function public.platform_create_school(
  p_name text, p_slug text, p_motto text default null, p_color text default '#053065'
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if length(trim(p_name)) < 2 or length(p_name) > 120 then raise exception 'invalid school name'; end if;
  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug) > 50 then raise exception 'invalid slug'; end if;
  if p_color !~ '^#[0-9a-fA-F]{6}$' then raise exception 'invalid colour'; end if;

  insert into public.schools (name, slug, motto, primary_color)
  values (trim(p_name), p_slug, nullif(trim(coalesce(p_motto, '')), ''), lower(p_color))
  returning id into v_id;

  insert into public.audit_logs (school_id, action, table_name, record_id, details)
  values (v_id, 'PLATFORM_CREATE_SCHOOL', 'schools', v_id::text,
          jsonb_build_object('name', trim(p_name), 'slug', p_slug));
  return v_id;
end $$;
revoke all on function public.platform_create_school(text, text, text, text) from public, anon;
grant execute on function public.platform_create_school(text, text, text, text) to authenticated;

create function public.platform_school_overview() returns table (
  id uuid, name text, slug text, status text, primary_color text,
  created_at timestamptz, members bigint, heads bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select s.id, s.name, s.slug, s.status, s.primary_color, s.created_at,
    (select count(*) from public.memberships m where m.school_id = s.id and m.status = 'active'),
    (select count(*) from public.memberships m where m.school_id = s.id and m.status = 'active' and m.role = 'head')
  from public.schools s
  order by s.created_at desc;
end $$;
revoke all on function public.platform_school_overview() from public, anon;
grant execute on function public.platform_school_overview() to authenticated;
