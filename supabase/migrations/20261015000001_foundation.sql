-- CyleSoma foundation: tenants, roles, memberships, JWT claims hook, audit log

create type public.app_role as enum (
  'platform_admin','owner','head','deputy','hod','bursar','registrar','hr',
  'teacher','librarian','nurse','storekeeper','boarding','transport','parent','student');
create type public.membership_status as enum ('invited','active','suspended');

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  motto text,
  primary_color text not null default '#053065',
  logo_path text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text,
  active_school_id uuid references public.schools on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  school_id uuid not null references public.schools on delete cascade,
  role public.app_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, school_id, role)
);
create index memberships_user_idx on public.memberships (user_id);
create index memberships_school_idx on public.memberships (school_id);

create trigger trg_schools_touch before update on public.schools for each row execute function public.touch_updated_at();
create trigger trg_profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger trg_memberships_touch before update on public.memberships for each row execute function public.touch_updated_at();

-- Helpers read claims added by the access-token hook below.
-- NOTE: the standard "role" claim is reserved by Supabase ('authenticated'), so we use "user_role".
create function public.current_school() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'school_id', '')::uuid $$;
create function public.current_user_role() returns text language sql stable as $$
  select auth.jwt() ->> 'user_role' $$;
create function public.has_role(roles text[]) returns boolean language sql stable as $$
  select coalesce(public.current_user_role() = any(roles), false) $$;

-- Audit log (written by triggers only)
create table public.audit_logs (
  id bigint generated always as identity primary key,
  school_id uuid,
  actor_id uuid default auth.uid(),
  action text not null,
  table_name text,
  record_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_school_idx on public.audit_logs (school_id, created_at desc);

create function public.audit_row() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (school_id, action, table_name, record_id, details)
  values (
    coalesce((to_jsonb(new) ->> 'school_id')::uuid, (to_jsonb(old) ->> 'school_id')::uuid),
    tg_op, tg_table_name,
    coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id'),
    jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)));
  return coalesce(new, old);
end $$;
create trigger trg_memberships_audit after insert or update or delete on public.memberships
  for each row execute function public.audit_row();

-- Custom access token hook: adds school_id + user_role to the JWT.
-- Enable in supabase/config.toml:
--   [auth.hook.custom_access_token]
--   enabled = true
--   uri = "pg-functions://postgres/public/custom_access_token_hook"
create function public.custom_access_token_hook(event jsonb) returns jsonb
language plpgsql stable as $$
declare
  claims jsonb := event -> 'claims';
  m record;
begin
  select ms.school_id, ms.role into m
  from public.memberships ms
  left join public.profiles p on p.user_id = ms.user_id
  where ms.user_id = (event ->> 'user_id')::uuid and ms.status = 'active'
  order by (ms.school_id = p.active_school_id) desc nulls last, ms.created_at
  limit 1;
  if found then
    claims := jsonb_set(claims, '{school_id}', to_jsonb(m.school_id));
    claims := jsonb_set(claims, '{user_role}', to_jsonb(m.role::text));
  end if;
  return jsonb_set(event, '{claims}', claims);
end $$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant select on public.memberships, public.profiles to supabase_auth_admin;

-- RLS
alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.audit_logs enable row level security;

create policy auth_admin_read_memberships on public.memberships for select to supabase_auth_admin using (true);
create policy auth_admin_read_profiles on public.profiles for select to supabase_auth_admin using (true);

create policy schools_read on public.schools for select using (id = public.current_school());
create policy schools_update on public.schools for update
  using (id = public.current_school() and public.has_role(array['head']))
  with check (id = public.current_school());

create policy profiles_own on public.profiles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy memberships_read on public.memberships for select
  using (user_id = auth.uid()
         or (school_id = public.current_school() and public.has_role(array['head','registrar','hr'])));
create policy memberships_write on public.memberships for all
  using (school_id = public.current_school() and public.has_role(array['head']))
  with check (school_id = public.current_school() and public.has_role(array['head']));

create policy audit_read on public.audit_logs for select
  using (school_id = public.current_school() and public.has_role(array['head','owner']));
