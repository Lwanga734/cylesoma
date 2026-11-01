import { AddSchoolForm } from '@/components/AddSchoolForm';
import { InviteHeadForm } from '@/components/InviteHeadForm';
import { requireSection } from '@/lib/auth';
import { formatDate, safeHexColor } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Platform' };

type SchoolRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  primary_color: string;
  created_at: string;
  members: number;
  heads: number;
};

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
                    <p className="font-medium">{s.name}</p>
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
