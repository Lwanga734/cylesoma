-- Sprint 2: students and classes. Status rule + bulk CSV import.
-- Runs as the CALLER (security invoker), so row-level security decides who may add students and classes:
-- students: head, registrar; classes: head, deputy, registrar. A suspended school has no current_school(), so imports fail.

alter table public.students add constraint students_status_check
  check (status in ('active', 'withdrawn', 'transferred', 'graduated'));

create function public.import_students(p_rows jsonb, p_create_classes boolean default true) returns jsonb
language plpgsql set search_path = public as $$
declare
  v_school uuid := public.current_school();
  r jsonb;
  v_class uuid;
  v_name text;
  v_n int;
  v_inserted int := 0;
  v_skipped int := 0;
  v_created int := 0;
begin
  if v_school is null then raise exception 'not allowed' using errcode = '42501'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'rows must be an array'; end if;
  if jsonb_array_length(p_rows) > 2000 then raise exception 'too many rows (max 2000)'; end if;

  for r in select value from jsonb_array_elements(p_rows) loop
    if coalesce(trim(r ->> 'admission_no'), '') = '' or coalesce(trim(r ->> 'first_name'), '') = ''
       or coalesce(trim(r ->> 'last_name'), '') = '' then
      raise exception 'every row needs an admission number, first name and last name';
    end if;

    v_class := null;
    v_name := nullif(trim(coalesce(r ->> 'class_name', '')), '');
    if v_name is not null then
      select c.id into v_class from public.classes c
       where c.school_id = v_school and lower(c.name) = lower(v_name) limit 1;
      if v_class is not null then
        update public.classes set deleted_at = null where id = v_class and deleted_at is not null;
      elsif p_create_classes then
        insert into public.classes (school_id, name) values (v_school, v_name) returning id into v_class;
        v_created := v_created + 1;
      end if;
    end if;

    insert into public.students (school_id, admission_no, first_name, last_name, date_of_birth, class_id, boarding)
    values (v_school, trim(r ->> 'admission_no'), trim(r ->> 'first_name'), trim(r ->> 'last_name'),
            nullif(r ->> 'date_of_birth', '')::date, v_class, coalesce((r ->> 'boarding')::boolean, false))
    on conflict (school_id, admission_no) do nothing;
    get diagnostics v_n = row_count;
    if v_n > 0 then v_inserted := v_inserted + 1; else v_skipped := v_skipped + 1; end if;
  end loop;

  return jsonb_build_object('inserted', v_inserted, 'skipped', v_skipped, 'classes_created', v_created);
end $$;
revoke all on function public.import_students(jsonb, boolean) from public, anon;
grant execute on function public.import_students(jsonb, boolean) to authenticated;
