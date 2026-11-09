import { redirect } from 'next/navigation';
import { AddClassForm, ArchivedClassRow, ClassRow, type ClassItem } from '@/components/ClassForms';
import { requireSection } from '@/lib/auth';
import { canManageClasses, canViewStudents } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Classes' };

type Row = { id: string; name: string; level: string | null; deleted_at: string | null; students: { count: number }[] | null };

export default async function ClassesPage() {
  const session = await requireSection('admin');
  if (!canViewStudents(session.role) && !canManageClasses(session.role)) redirect('/admin');
  const canManage = canManageClasses(session.role);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, level, deleted_at, students(count)')
    .order('name');
  const rows = (data as unknown as Row[] | null) ?? [];
  const active: ClassItem[] = rows
    .filter((c) => !c.deleted_at)
    .map((c) => ({ id: c.id, name: c.name, level: c.level, students: c.students?.[0]?.count ?? 0 }));
  const archived = rows.filter((c) => c.deleted_at);

  return (
    <>
      <section className="card">
        <h1 className="text-xl font-semibold">Classes</h1>
        <p className="text-sm text-slate-600">The classes and streams in your school.</p>
      </section>

      {canManage && (
        <section className="card">
          <h2 className="mb-3 text-lg font-semibold">Add a class</h2>
          <AddClassForm />
        </section>
      )}

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">Classes ({active.length})</h2>
        {error && <p role="alert" className="text-sm text-red-700">Could not load classes.</p>}
        {!error && active.length === 0 && <p className="text-sm text-slate-600">No classes yet. Add one above, or import students with a class column.</p>}
        <ul className="divide-y divide-slate-200">
          {active.map((c) => (
            <ClassRow key={c.id} item={c} canManage={canManage} />
          ))}
        </ul>
      </section>

      {canManage && archived.length > 0 && (
        <section className="card">
          <h2 className="mb-2 text-lg font-semibold">Archived</h2>
          <ul className="divide-y divide-slate-200">
            {archived.map((c) => (
              <ArchivedClassRow key={c.id} item={c} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
