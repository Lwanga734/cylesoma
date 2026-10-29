import { redirect } from 'next/navigation';
import { InviteForm } from '@/components/InviteForm';
import { requireSection } from '@/lib/auth';
import { invitableRoles } from '@/lib/roles';

export const metadata = { title: 'Invite users' };

export default async function InvitePage() {
  const session = await requireSection('admin');
  const roles = invitableRoles(session.role);
  if (roles.length === 0) redirect('/admin');
  return (
    <section className="card">
      <h1 className="mb-4 text-xl font-semibold">Invite a user</h1>
      <InviteForm roles={roles} />
    </section>
  );
}
