-- Academic structure, students, guardians, teacher assignments, attendance

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  name text not null,
  level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (school_id, name)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  user_id uuid references auth.users on delete set null,
  admission_no text not null,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  class_id uuid references public.classes on delete set null,
  boarding boolean not null default false,
  status text not null default 'active',
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (school_id, admission_no)
);

create table public.student_guardians (
  student_id uuid not null references public.students on delete cascade,
  guardian_user_id uuid not null references auth.users on delete cascade,
  school_id uuid not null references public.schools on delete cascade,
  relationship text,
  can_pickup boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, guardian_user_id)
);

create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  teacher_id uuid not null references auth.users on delete cascade,
  class_id uuid not null references public.classes on delete cascade,
  is_class_teacher boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, class_id)
);

-- id is client-generated (offline-first), so no reliance on a server default
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  student_id uuid not null references public.students on delete cascade,
  att_date date not null,
  session text not null default 'morning' check (session in ('morning','afternoon','lesson')),
  status text not null check (status in ('present','absent','late','excused')),
  marked_by uuid default auth.uid(),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (student_id, att_date, session)
);

-- indexes: tenant + sync cursor
create index classes_sync_idx on public.classes (school_id, updated_at);
create index students_sync_idx on public.students (school_id, updated_at);
create index students_class_idx on public.students (class_id);
create index guardians_user_idx on public.student_guardians (guardian_user_id);
create index ta_teacher_idx on public.teacher_assignments (teacher_id);
create index attendance_sync_idx on public.attendance (school_id, updated_at);
create index attendance_student_idx on public.attendance (student_id, att_date);

do $$ declare t text; begin
  foreach t in array array['classes','students','student_guardians','teacher_assignments','attendance'] loop
    execute format('create trigger trg_%1$s_touch before update on public.%1$s for each row execute function public.touch_updated_at()', t);
    execute format('alter table public.%1$s enable row level security', t);
  end loop;
end $$;

-- classes: everyone in the school can read; admins write
create policy classes_read on public.classes for select using (school_id = public.current_school());
create policy classes_write on public.classes for all
  using (school_id = public.current_school() and public.has_role(array['head','deputy','registrar']))
  with check (school_id = public.current_school());

-- students
create policy students_read on public.students for select using (
  school_id = public.current_school() and (
    public.has_role(array['owner','head','deputy','hod','registrar','bursar'])
    or (public.has_role(array['teacher']) and class_id in
        (select ta.class_id from public.teacher_assignments ta where ta.teacher_id = auth.uid()))
    or (public.has_role(array['parent']) and id in
        (select sg.student_id from public.student_guardians sg where sg.guardian_user_id = auth.uid()))
    or user_id = auth.uid()
  ));
create policy students_write on public.students for all
  using (school_id = public.current_school() and public.has_role(array['head','registrar']))
  with check (school_id = public.current_school());

-- guardians
create policy guardians_read on public.student_guardians for select using (
  guardian_user_id = auth.uid()
  or (school_id = public.current_school() and public.has_role(array['owner','head','deputy','hod','registrar'])));
create policy guardians_write on public.student_guardians for all
  using (school_id = public.current_school() and public.has_role(array['head','registrar']))
  with check (school_id = public.current_school());

-- teacher assignments
create policy ta_read on public.teacher_assignments for select using (
  teacher_id = auth.uid()
  or (school_id = public.current_school() and public.has_role(array['owner','head','deputy','hod'])));
create policy ta_write on public.teacher_assignments for all
  using (school_id = public.current_school() and public.has_role(array['head','deputy']))
  with check (school_id = public.current_school());

-- attendance
create policy attendance_read on public.attendance for select using (
  school_id = public.current_school() and (
    public.has_role(array['owner','head','deputy','hod','registrar'])
    or (public.has_role(array['teacher']) and exists (
        select 1 from public.students s join public.teacher_assignments ta on ta.class_id = s.class_id
        where s.id = attendance.student_id and ta.teacher_id = auth.uid()))
    or (public.has_role(array['parent']) and student_id in
        (select sg.student_id from public.student_guardians sg where sg.guardian_user_id = auth.uid()))
    or student_id in (select s.id from public.students s where s.user_id = auth.uid())
  ));
create policy attendance_write on public.attendance for all
  using (school_id = public.current_school() and (
    public.has_role(array['head','deputy'])
    or (public.has_role(array['teacher']) and exists (
        select 1 from public.students s join public.teacher_assignments ta on ta.class_id = s.class_id
        where s.id = attendance.student_id and ta.teacher_id = auth.uid()))))
  with check (school_id = public.current_school() and (
    public.has_role(array['head','deputy'])
    or (public.has_role(array['teacher']) and exists (
        select 1 from public.students s join public.teacher_assignments ta on ta.class_id = s.class_id
        where s.id = attendance.student_id and ta.teacher_id = auth.uid()))));
