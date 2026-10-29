import { requireSection } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSection('admin');
  return children;
}
