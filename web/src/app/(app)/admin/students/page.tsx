import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { AddStudentForm } from '@/components/StudentForm';
import { requireSection } from '@/lib/auth';
import { canManageStudents, canViewStudents } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Students' };

const PAGE_SIZE = 25;
const STATUS_FILTERS = ['active', 'withdrawn', 'transferred', 'graduated', 'all'];

type StudentRow = {
  id: string;
  admission_no: string;
  first_name: string;
  last_name: string;
  boarding: boolean;
  status: string;
  class_id: string | null;
  classes: { name: string } | { name: string }[] | null;
};

const className = (r: StudentRow) => (Array.isArray(r.classes) ? r.classes[0]?.name : r.classes?.name) ?? null;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSection('admin');
  if (!canViewStudents(session.role)) redirect('/admin');
  const canManage = canManageStudents(session.role);

  const sp = await searchParams;
  const one = (key: string) => (typeof sp[key] === 'string' ? (sp[key] as string) : '');
  const q = one('q').replace(/[%,()*\\]/g, ' ').trim().slice(0, 60);
  const classFilter = one('class');
  const status = STATUS_FILTERS.includes(one('status')) ? one('status') : 'active';
  const page = Math.max(1, parseInt(one('page') || '1', 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  let query = supabase
    .from('students')
    .select('id, admission_no, first_name, last_name, boarding, status, class_id, classes(name)', { count: 'exact' })
    .is('deleted_at', null)
    .order('last_name')
    .order('first_name')
    .range(from, from + PAGE_SIZE - 1);
  if (status !== 'all') query = query.eq('status', status);
  if (q) query = query.or(`first_name.ilike.*${q}*,last_name.ilike.*${q}*,admission_no.ilike.*${q}*`);
  if (classFilter === 'none') query = query.is('class_id', null);
  else if (z.uuid().safeParse(classFilter).success) query = query.eq('class_id', classFilter);

  const [{ data, count, error }, { data: classData }] = await Promise.all([
    query,
    supabase.from('classes').select('id, name').is('deleted_at', null).order('name'),
  ]);
  const students = (data as unknown as StudentRow[] | null) ?? [];
  const classes = (classData as { id: string; name: string }[] | null) ?? [];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (classFilter) params.set('class', classFilter);
    if (status !== 'active') params.set('status', status);
    if (p > 1) params.set('page', String(p));
    const s = params.toString();
    return `/admin/students${s ? `?${s}` : ''}`;
  };

  return (
    <>
      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Students</h1>
          <p className="text-sm text-slate-600">{total} {total === 1 ? 'student' : 'students'} match.</p>
        </div>
        {canManage && (
          <Link href="/admin/students/import" className="btn-secondary shrink-0">Import from CSV</Link>
        )}
      </section>

      {canManage && (
        <details className="card">
          <summary className="cursor-pointer text-lg font-semibold">Add a student</summary>
          <div className="mt-3"><AddStudentForm classes={classes} /></div>
        </details>
      )}

      <section className="card">
        <form method="get" className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="f-q">Search</label>
            <input id="f-q" name="q" defaultValue={q} placeholder="Name or admission number" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="f-class">Class</label>
            <select id="f-class" name="class" defaultValue={classFilter} className="input">
              <option value="">All classes</option>
              <option value="none">No class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-status">Status</label>
            <select id="f-status" name="status" defaultValue={status} className="input">
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn">Filter</button>
        </form>
      </section>

      <section className="card">
        {error && <p role="alert" className="text-sm text-red-700">Could not load students.</p>}
        {!error && students.length === 0 && (
          <p className="text-sm text-slate-600">
            No students found. {canManage ? 'Add one above or import a CSV file.' : ''}
          </p>
        )}
        <ul className="divide-y divide-slate-200">
          {students.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                {canManage ? (
                  <Link href={`/admin/students/${s.id}`} className="font-medium text-accent underline">
                    {s.last_name}, {s.first_name}
                  </Link>
                ) : (
                  <p className="font-medium">{s.last_name}, {s.first_name}</p>
                )}
                <p className="text-sm text-slate-600">
                  {s.admission_no} · {className(s) ?? 'No class'}{s.boarding ? ' · Boarding' : ''}
                </p>
              </div>
              {s.status !== 'active' && (
                <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  {s.status[0].toUpperCase() + s.status.slice(1)}
                </span>
              )}
            </li>
          ))}
        </ul>
        {pages > 1 && (
          <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pages">
            {page > 1 ? <Link href={href(page - 1)} className="btn-secondary">&larr; Previous</Link> : <span />}
            <span className="text-slate-600">Page {page} of {pages}</span>
            {page < pages ? <Link href={href(page + 1)} className="btn-secondary">Next &rarr;</Link> : <span />}
          </nav>
        )}
      </section>
    </>
  );
}
