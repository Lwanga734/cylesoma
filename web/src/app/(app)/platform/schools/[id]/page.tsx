import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { InviteHeadForm } from '@/components/InviteHeadForm';
import {
  DeleteSchoolForm,
  LeaderRow,
  SchoolEditForm,
  SchoolStatusForm,
} from '@/components/PlatformSchoolControls';
import { requireSection } from '@/lib/auth';
import type { Leader, PlatformSchool } from '@/lib/data';
import { formatDate } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Manage school' };

export default async function PlatformSchoolPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection('platform');
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data: overview }, { data: leaderRows }] = await Promise.all([
    supabase.rpc('platform_school_overview'),
    supabase.rpc('platform_school_leaders', { p_school_id: id }),
  ]);
  const school = ((overview as PlatformSchool[] | null) ?? []).find((s) => s.id === id);
  if (!school) notFound();
  const leaders = (leaderRows as Leader[] | null) ?? [];
  const suspended = school.status === 'suspended';

  return (
    <>
      <section className="card">
        <Link href="/platform" className="text-sm text-accent underline">&larr; All schools</Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{school.name}</h1>
            <p className="text-sm text-slate-600">
              {school.slug} · added {formatDate(school.created_at.slice(0, 10))} · {Number(school.members)}{' '}
              {Number(school.members) === 1 ? 'member' : 'members'}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              suspended ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
            }`}
          >
            {suspended ? 'Suspended' : 'Active'}
          </span>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">School details</h2>
        <SchoolEditForm school={school} />
      </section>

      <section className="card">
        <h2 className="mb-1 text-lg font-semibold">Head teachers and owners</h2>
        <p className="mb-2 text-sm text-slate-600">
          You manage each school&apos;s leadership. The head teacher manages everyone else in the school.
        </p>
        {leaders.length === 0 ? (
          <p className="text-sm text-slate-600">No head teacher yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {leaders.map((l) => (
              <LeaderRow key={l.membership_id} leader={l} schoolId={school.id} />
            ))}
          </ul>
        )}
        <h3 className="mt-4 text-sm font-semibold">Invite a head teacher</h3>
        <InviteHeadForm schoolId={school.id} />
      </section>

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">Access</h2>
        <SchoolStatusForm school={school} />
      </section>

      <section className="card border-red-200">
        <h2 className="mb-2 text-lg font-semibold text-red-800">Delete school</h2>
        <DeleteSchoolForm school={school} />
      </section>
    </>
  );
}
