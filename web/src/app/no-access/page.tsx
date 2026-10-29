import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/AuthShell';
import { signOut } from '@/app/actions/auth';
import { requireSession } from '@/lib/auth';
import { homeForRole } from '@/lib/roles';

export const metadata = { title: 'No access' };

export default async function NoAccessPage() {
  const session = await requireSession();
  if (session.role) redirect(homeForRole(session.role));
  return (
    <AuthShell title="No access yet">
      <p className="mb-4 text-sm text-slate-700">
        Your account is not linked to a school yet. Contact your school administrator.
      </p>
      <form action={signOut}>
        <button className="btn-secondary w-full">Sign out</button>
      </form>
    </AuthShell>
  );
}
