import Link from 'next/link';
import { AddSchoolForm } from '@/components/AddSchoolForm';
import { InviteHeadForm } from '@/components/InviteHeadForm';
import { requireSection } from '@/lib/auth';
import type { PlatformSchool } from '@/lib/data';
import { formatDate, safeHexColor } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Platform' };

type SchoolRow = PlatformSchool;

export default async function PlatformPage() {
  await requireSection('platform');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('platform_school_overview');
  const schools = (data as SchoolRow[] | null) ?? [];

  return (
    <>
      <section className="card">
        <h1 className="text-xl font-semibold">Platform</h1>
        <p className="mt-1 text-sm text-slate-600">
          Add schools and invite their head teachers. School data stays private to each school.
        </p>
      </section>

      <section className="grid grid-cols-3 gap-3 text-center">
        <div className="card">
          <p className="text-2xl font-semibold">{schools.length}</p>
          <p className="text-xs text-slate-600">Schools</p>
        </div>
        <div className="card">
          <p className="text-2xl font-semibold">{schools.filter((s) => s.status === 'active').length}</p>
          <p className="text-xs text-slate-600">Active</p>
        </div>
        <div className="card">
          <p className="text-2xl font-semibold">{schools.reduce((n, s) => n + Number(s.members), 0)}</p>
          <p className="text-xs text-slate-600">Members</p>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">Add a school</h2>
        <AddSchoolForm />
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">Schools ({schools.length})</h2>
        {error && <p role="alert" className="text-sm text-red-700">Could not load schools.</p>}
        {!error && schools.length === 0 && <p className="text-sm text-slate-600">No schools yet.</p>}
        <ul className="divide-y divide-slate-200">
          {schools.map((s) => (
            <li key={s.id} className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="h-8 w-8 shrink-0 rounded-lg border border-slate-300"
                    style={{ backgroundColor: safeHexColor(s.primary_color) }}
                  />
                  <div>
                    <Link href={`/platform/schools/${s.id}`} className="font-medium text-accent underline">
                      {s.name}
                    </Link>
                    {s.status !== 'active' && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        Suspended
                      </span>
                    )}
                    <p className="text-sm text-slate-600">
                      {s.slug} · added {formatDate(s.created_at.slice(0, 10))}
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm text-slate-600">
                  <p>{Number(s.members)} {Number(s.members) === 1 ? 'member' : 'members'}</p>
                  <p>{Number(s.heads) > 0 ? 'Head teacher set' : 'No head teacher yet'}</p>
                </div>
              </div>
              {Number(s.heads) === 0 && <InviteHeadForm schoolId={s.id} />}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
