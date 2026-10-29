import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { homeForRole } from '@/lib/roles';

export default async function Home() {
  const session = await getSession();
  redirect(session ? homeForRole(session.role) : '/login');
}
