import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { EditStudentForm } from '@/components/StudentForm';
import { requireSection } from '@/lib/auth';
import { canManageStudents } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Student' };

type Student = {
  id: string;
  admission_no: string;
  first_name: string;
  last_name: string;
  class_id: string | null;
  date_of_birth: string | null;
  boarding: boolean;
  status: string;
};

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSection('admin');
  if (!canManageStudents(session.role)) redirect('/admin/students');
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data: student }, { data: classData }] = await Promise.all([
    supabase
      .from('students')
      .select('id, admission_no, first_name, last_name, class_id, date_of_birth, boarding, status')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase.from('classes').select('id, name').is('deleted_at', null).order('name'),
  ]);
  if (!student) notFound();
  const s = student as Student;
  const classes = (classData as { id: string; name: string }[] | null) ?? [];

  return (
    <>
      <section className="card">
        <Link href="/admin/students" className="text-sm text-accent underline">&larr; All students</Link>
        <h1 className="mt-2 text-xl font-semibold">{s.first_name} {s.last_name}</h1>
        <p className="text-sm text-slate-600">Admission number {s.admission_no}</p>
      </section>
      <section className="card">
        <EditStudentForm classes={classes} student={s} />
      </section>
    </>
  );
}
