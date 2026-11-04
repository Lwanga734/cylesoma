import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MemberRow } from '@/components/MemberRow';
import { requireSection } from '@/lib/auth';
import { getSchoolMembers } from '@/lib/data';
import { invitableRoles } from '@/lib/roles';

export const metadata = { title: 'Members' };

export default async function MembersPage() {
  const session = await requireSection('admin');
  const roles = invitableRoles(session.role);
  if (roles.length === 0) redirect('/admin');

  const { members, failed } = await getSchoolMembers();

  return (
    <>
      <section className="card flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Members</h1>
          <p className="text-sm text-slate-600">
            {session.role === 'head'
              ? 'Everyone in your school.'
              : 'The people in the groups you look after.'}
          </p>
        </div>
        <Link href="/admin/invite" className="btn shrink-0">Invite someone</Link>
      </section>

      <section className="card">
        {failed && <p role="alert" className="text-sm text-red-700">Could not load members. Try again.</p>}
        {!failed && members.length === 0 && <p className="text-sm text-slate-600">No members yet.</p>}
        <ul className="divide-y divide-slate-200">
          {members.map((m) => (
            <MemberRow key={m.membership_id} member={m} roles={roles} />
          ))}
        </ul>
      </section>
    </>
  );
}
