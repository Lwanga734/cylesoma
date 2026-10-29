import { getSchool } from '@/lib/data';
import { roleLabel } from '@/lib/roles';
import type { Session } from '@/lib/auth';

/** Placeholder landing page for each role section. Replaced module by module. */
export async function RoleHome({ session, heading }: { session: Session; heading: string }) {
  const school = session.schoolId ? await getSchool(session.schoolId) : null;
  return (
    <section className="card">
      <h1 className="text-xl font-semibold">{heading}</h1>
      <p className="mt-1 text-sm text-slate-600">
        Signed in as {roleLabel(session.role)}
        {school?.motto ? ` · ${school.motto}` : ''}
      </p>
      <p className="mt-4 text-sm text-slate-600">Your tools will appear here as modules are released.</p>
    </section>
  );
}
