import Link from 'next/link';
import { requireSection } from '@/lib/auth';
import { getSchool } from '@/lib/data';
import { canViewStudents, invitableRoles, roleLabel } from '@/lib/roles';

export const metadata = { title: 'Administration' };

export default async function AdminHome() {
  const session = await requireSection('admin');
  const school = session.schoolId ? await getSchool(session.schoolId) : null;
  const canInvite = invitableRoles(session.role).length > 0;

  return (
    <>
      <section className="card">
        <h1 className="text-xl font-semibold">Administration</h1>
        <p className="mt-1 text-sm text-slate-600">
          Signed in as {roleLabel(session.role)}
          {school?.motto ? ` · ${school.motto}` : ''}
        </p>
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        {session.role === 'head' && (
          <Link href="/admin/school" className="card block hover:border-accent">
            <h2 className="font-semibold">School settings</h2>
            <p className="text-sm text-slate-600">Name, motto, brand colour, terms</p>
          </Link>
        )}
        {canViewStudents(session.role) && (
          <Link href="/admin/students" className="card block hover:border-accent">
            <h2 className="font-semibold">Students</h2>
            <p className="text-sm text-slate-600">Records, search, CSV import</p>
          </Link>
        )}
        {['owner', 'head', 'deputy', 'hod', 'registrar', 'hr'].includes(session.role ?? '') && (
          <Link href="/attendance" className="card block hover:border-accent">
            <h2 className="font-semibold">Biometric attendance</h2>
            <p className="text-sm text-slate-600">BioTime connection, ZKTeco F18 terminals, pupil scans and SMS queue</p>
          </Link>
        )}
        {canViewStudents(session.role) && (
          <Link href="/admin/classes" className="card block hover:border-accent">
            <h2 className="font-semibold">Classes</h2>
            <p className="text-sm text-slate-600">Classes and streams</p>
          </Link>
        )}
        {canInvite && (
          <Link href="/admin/members" className="card block hover:border-accent">
            <h2 className="font-semibold">Members</h2>
            <p className="text-sm text-slate-600">Change roles, suspend, remove, setup links</p>
          </Link>
        )}
        {canInvite && (
          <Link href="/admin/invite" className="card block hover:border-accent">
            <h2 className="font-semibold">Invite users</h2>
            <p className="text-sm text-slate-600">Teachers, staff, parents, students</p>
          </Link>
        )}
      </div>
    </>
  );
}
