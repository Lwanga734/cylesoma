import { requireSection } from '@/lib/auth';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  await requireSection('platform');
  return children;
}
