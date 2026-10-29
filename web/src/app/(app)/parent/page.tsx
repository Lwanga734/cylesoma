import { RoleHome } from '@/components/RoleHome';
import { requireSection } from '@/lib/auth';

export const metadata = { title: 'Parent' };

export default async function ParentPage() {
  const session = await requireSection('parent');
  return <RoleHome session={session} heading="Parent" />;
}
