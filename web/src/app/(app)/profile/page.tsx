import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { getMemberships, getSchool } from '@/lib/data';
import { roleLabel } from '@/lib/roles';
import { switchSchool } from './actions';

export const metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const session = await requireSession();
  const [school, memberships] = await Promise.all([
    session.schoolId ? getSchool(session.schoolId) : null,
    getMemberships(session.userId),
  ]);

  return (
    <>
      <section className="card space-y-1">
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="text-sm">{session.email}</p>
        <p className="text-sm text-slate-600">
          {roleLabel(session.role)} · {school?.name ?? 'No school selected'}
        </p>
      </section>

      {memberships.length > 1 && (
        <section className="card">
          <h2 className="mb-2 font-semibold">Switch school</h2>
          <ul className="divide-y divide-slate-200">
            {memberships.map((m) => (
              <li key={`${m.school_id}-${m.role}`} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{m.schools?.name ?? 'School'}</p>
                  <p className="text-sm text-slate-600">{roleLabel(m.role)}</p>
                </div>
                {m.school_id === session.schoolId ? (
                  <span className="text-sm font-semibold text-green-800">Current</span>
                ) : (
                  <form action={switchSchool}>
                    <input type="hidden" name="school_id" value={m.school_id} />
                    <button className="btn-secondary">Switch</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <Link href="/set-password" className="text-accent underline">Change password</Link>
      </section>
    </>
  );
}
