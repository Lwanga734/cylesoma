-- Fix: write policies must check the caller's ROLE in WITH CHECK as well as USING.
-- INSERT is governed by WITH CHECK alone, and the earlier policies only checked the school there, so any school
-- member who could read a table (for example a deputy, bursar or head of department) could also insert rows.
-- No school data existed when this was found, and the tables below were empty.

drop policy classes_write on public.classes;
create policy classes_write on public.classes for all
  using (school_id = public.current_school() and public.has_role(array['head','deputy','registrar']))
  with check (school_id = public.current_school() and public.has_role(array['head','deputy','registrar']));

drop policy students_write on public.students;
create policy students_write on public.students for all
  using (school_id = public.current_school() and public.has_role(array['head','registrar']))
  with check (school_id = public.current_school() and public.has_role(array['head','registrar']));

drop policy guardians_write on public.student_guardians;
create policy guardians_write on public.student_guardians for all
  using (school_id = public.current_school() and public.has_role(array['head','registrar']))
  with check (school_id = public.current_school() and public.has_role(array['head','registrar']));

drop policy ta_write on public.teacher_assignments;
create policy ta_write on public.teacher_assignments for all
  using (school_id = public.current_school() and public.has_role(array['head','deputy']))
  with check (school_id = public.current_school() and public.has_role(array['head','deputy']));

drop policy terms_write on public.terms;
create policy terms_write on public.terms for all
  using (school_id = public.current_school() and public.has_role(array['head','deputy']))
  with check (school_id = public.current_school() and public.has_role(array['head','deputy']));
