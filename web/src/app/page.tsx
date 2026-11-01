import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { landingPath } from '@/lib/roles';

export default async function Home() {
  const session = await getSession();
  redirect(session ? landingPath(session.role, session.isPlatformAdmin) : '/login');
}
