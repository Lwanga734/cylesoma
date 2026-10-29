import { RoleHome } from '@/components/RoleHome';
import { requireSection } from '@/lib/auth';

export const metadata = { title: 'Teacher' };

export default async function TeacherPage() {
  const session = await requireSection('teacher');
  return <RoleHome session={session} heading="Teacher" />;
}
