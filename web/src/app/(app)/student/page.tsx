import { RoleHome } from '@/components/RoleHome';
import { requireSection } from '@/lib/auth';

export const metadata = { title: 'Student' };

export default async function StudentPage() {
  const session = await requireSection('student');
  return <RoleHome session={session} heading="Student" />;
}
