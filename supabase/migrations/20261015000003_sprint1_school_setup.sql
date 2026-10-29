-- Sprint 1: terms, active-school switching, invitation helpers

alter table public.memberships add column invited_by uuid references auth.users on delete set null;

-- Members can read the name of any school they belong to (needed for the school switcher).
create policy schools_member_read on public.schools for select using (
  id in (select m.school_id from public.memberships m where m.user_id = auth.uid() and m.status = 'active'));

create table public.terms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  name text not null,
  year int not null,
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on > starts_on),
  unique (school_id, year, name)
);
create unique index terms_one_current_idx on public.terms (school_id) where is_current;
create index terms_school_idx on public.terms (school_id);
create trigger trg_terms_touch before update on public.terms for each row execute function public.touch_updated_at();
alter table public.terms enable row level security;

create policy terms_read on public.terms for select using (school_id = public.current_school());
create policy terms_write on public.terms for all
  using (school_id = public.current_school() and public.has_role(array['head','deputy']))
  with check (school_id = public.current_school());

create function public.set_current_term(p_term_id uuid) returns void language plpgsql as $$
declare v_school uuid;
begin
  select school_id into v_school from public.terms where id = p_term_id;
  if v_school is null or v_school <> public.current_school()
     or not public.has_role(array['head','deputy']) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.terms set is_current = false where school_id = v_school and is_current and id <> p_term_id;
  update public.terms set is_current = true where id = p_term_id;
end $$;

-- Switch the school used for the next token refresh (client then calls auth.refreshSession()).
create function public.set_active_school(p_school_id uuid) returns void language plpgsql as $$
begin
  if not exists (select 1 from public.memberships
                 where user_id = auth.uid() and school_id = p_school_id and status = 'active') then
    raise exception 'not a member';
  end if;
  insert into public.profiles (user_id, active_school_id) values (auth.uid(), p_school_id)
  on conflict (user_id) do update set active_school_id = excluded.active_school_id;
end $$;

-- Used only by the invite-user Edge Function (service role).
create function public.find_user_id_by_email(p_email text) returns uuid
language sql security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1 $$;
revoke all on function public.find_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;
