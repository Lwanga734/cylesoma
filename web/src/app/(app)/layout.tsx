import Link from 'next/link';
import { signOut } from '@/app/actions/auth';
import { requireSession } from '@/lib/auth';
import { getSchool } from '@/lib/data';
import { safeHexColor } from '@/lib/format';
import { homeForRole } from '@/lib/roles';

/** Everything behind sign-in. The school's own brand colour themes the whole shell. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const school = session.schoolId ? await getSchool(session.schoolId) : null;
  const brand = safeHexColor(school?.primary_color);

  return (
    <div style={{ '--brand': brand } as React.CSSProperties} className="min-h-screen">
      <header className="bg-brand text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 p-4">
          <Link href="/" className="truncate text-lg font-semibold">
            {school?.name ?? 'CyleSoma'}
          </Link>
          <nav className="flex shrink-0 items-center gap-2 text-sm">
            {session.isPlatformAdmin && (
              <Link href="/platform" className="rounded-lg px-3 py-2 hover:bg-white/10">Platform</Link>
            )}
            {session.isPlatformAdmin && session.role && (
              <Link href={homeForRole(session.role)} className="rounded-lg px-3 py-2 hover:bg-white/10">My school</Link>
            )}
            <Link href="/profile" className="rounded-lg px-3 py-2 hover:bg-white/10">Profile</Link>
            <form action={signOut}>
              <button className="rounded-lg px-3 py-2 hover:bg-white/10">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 p-4">{children}</main>
    </div>
  );
}
