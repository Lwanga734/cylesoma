import { redirect } from 'next/navigation';
import { AddTermForm } from '@/components/AddTermForm';
import { SchoolForm } from '@/components/SchoolForm';
import { requireSection } from '@/lib/auth';
import { getSchool, getTerms } from '@/lib/data';
import { formatDate } from '@/lib/format';
import { setCurrentTerm } from './actions';

export const metadata = { title: 'School settings' };

export default async function SchoolSettingsPage() {
  const session = await requireSection('admin');
  if (session.role !== 'head' || !session.schoolId) redirect('/admin');

  const [school, terms] = await Promise.all([getSchool(session.schoolId), getTerms()]);
  if (!school) redirect('/admin');

  return (
    <>
      <section className="card">
        <h1 className="mb-4 text-xl font-semibold">School details</h1>
        <SchoolForm name={school.name} motto={school.motto ?? ''} color={school.primary_color} />
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">Terms</h2>
        {terms.length === 0 ? (
          <p className="mb-4 text-sm text-slate-600">No terms yet.</p>
        ) : (
          <ul className="mb-4 divide-y divide-slate-200">
            {terms.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{t.name} {t.year}</p>
                  <p className="text-sm text-slate-600">{formatDate(t.starts_on)} to {formatDate(t.ends_on)}</p>
                </div>
                {t.is_current ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">Current</span>
                ) : (
                  <form action={setCurrentTerm}>
                    <input type="hidden" name="term_id" value={t.id} />
                    <button className="btn-secondary">Set current</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        <AddTermForm />
      </section>
    </>
  );
}
