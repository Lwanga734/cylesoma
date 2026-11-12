import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSection } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { saveDevice, saveIntegration } from './actions';
import { TokenPanel } from './TokenPanel';

export const metadata = { title: 'Biometric attendance' };

type Integration = { id: string; base_url: string; api_username: string; is_active: boolean; last_success_at: string | null; last_error: string | null };
type Device = { id: string; terminal_sn: string; terminal_alias: string | null; location_type: string; is_active: boolean; last_seen_at: string | null };
type Event = {
  id: string; event_at: string; event_type: string; external_user_code: string | null;
  students: { first_name: string; last_name: string; admission_no: string } | null;
  attendance_devices: { terminal_alias: string | null; terminal_sn: string } | null;
};

const readable = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const when = (value: string | null) => value ? new Date(value).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Kampala' }) : 'Never';

export default async function AttendancePage() {
  const session = await requireSection('admin');
  if (!['owner', 'head', 'deputy', 'hod', 'registrar', 'hr'].includes(session.role ?? '')) redirect('/admin');

  const supabase = await createClient();
  const [{ data: integrations }, { data: devices }, { data: events }, { count: queuedSms }, { data: classes }] = await Promise.all([
    supabase.from('attendance_integrations')
      .select('id, base_url, api_username, is_active, last_success_at, last_error')
      .order('created_at', { ascending: false }).limit(1),
    supabase.from('attendance_devices')
      .select('id, terminal_sn, terminal_alias, location_type, is_active, last_seen_at')
      .order('created_at', { ascending: false }),
    supabase.from('attendance_events')
      .select('id, event_at, event_type, external_user_code, students(first_name,last_name,admission_no), attendance_devices(terminal_alias,terminal_sn)')
      .order('event_at', { ascending: false }).limit(20),
    supabase.from('attendance_sms_outbox').select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
    supabase.from('classes').select('id,name').is('deleted_at', null).order('name'),
  ]);

  const integration = (integrations?.[0] ?? null) as Integration | null;
  const terminalRows = (devices ?? []) as Device[];
  const eventRows = (events ?? []) as unknown as Event[];
  const classRows = (classes ?? []) as { id: string; name: string }[];
  const canConfigure = ['owner', 'head', 'deputy'].includes(session.role ?? '');

  return (
    <>
      <section className="card space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-accent">CyleSoma · Attendance</p>
            <h1 className="text-2xl font-semibold">Biometric attendance</h1>
          </div>
          <Link href="/admin" className="btn-secondary">Administration</Link>
        </div>
        <p className="text-sm text-slate-600">
          Monitor pupil arrival, classroom check-in and departure from ZKTeco terminals through BioTime 8.5.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card"><p className="text-sm text-slate-500">Registered terminals</p><p className="mt-1 text-2xl font-semibold">{terminalRows.length}</p></div>
        <div className="card"><p className="text-sm text-slate-500">Recent scans loaded</p><p className="mt-1 text-2xl font-semibold">{eventRows.length}</p></div>
        <div className="card"><p className="text-sm text-slate-500">SMS waiting in queue</p><p className="mt-1 text-2xl font-semibold">{queuedSms ?? 0}</p></div>
      </div>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">BioTime 8.5 connection</h2>
          <span className={integration?.is_active ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800' : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700'}>
            {integration?.is_active ? 'Enabled' : 'Not configured'}
          </span>
        </div>
        {integration ? (
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p><span className="text-slate-500">BioTime URL:</span> {integration.base_url}</p>
            <p><span className="text-slate-500">API username:</span> {integration.api_username}</p>
            <p><span className="text-slate-500">Timezone:</span> Africa/Kampala</p>
            <p><span className="text-slate-500">Last successful sync:</span> {when(integration.last_success_at)}</p>
            {integration.last_error && <p className="text-red-700 sm:col-span-2">Last connection error: {integration.last_error}</p>}
          </div>
        ) : <p className="text-sm text-slate-600">Connect the school's BioTime 8.5 server to begin registering terminals.</p>}
        {canConfigure && (
          <form action={saveIntegration} className="grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="biotime-url">BioTime server URL</label><input id="biotime-url" name="base_url" type="url" required placeholder="http://192.168.1.20:8081" defaultValue={integration?.base_url ?? ''} className="input" /></div>
            <div><label className="label" htmlFor="biotime-user">BioTime API username</label><input id="biotime-user" name="api_username" required defaultValue={integration?.api_username ?? ''} className="input" /></div>
            <p className="text-xs text-slate-500 sm:col-span-2">The BioTime password stays on the local Bridge computer. Do not enter it here.</p>
            <div className="sm:col-span-2"><button className="btn" type="submit">Save BioTime connection</button></div>
          </form>
        )}
      </section>

      {canConfigure && integration && <TokenPanel />}

      <section className="card space-y-3">
        <div><h2 className="font-semibold">ZKTeco F18 terminals</h2><p className="text-sm text-slate-600">Register each reader and assign its physical role at the school.</p></div>
        {terminalRows.length === 0 ? <p className="text-sm text-slate-500">No terminals registered yet.</p> : (
          <ul className="divide-y divide-slate-200">
            {terminalRows.map((d) => <li key={d.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
              <div><p className="font-medium">{d.terminal_alias || 'ZKTeco F18'} <span className="font-normal text-slate-500">· {d.terminal_sn}</span></p><p className="text-slate-500">{readable(d.location_type)} · Last seen {when(d.last_seen_at)}</p></div>
              <span className={d.is_active ? 'text-emerald-700' : 'text-slate-500'}>{d.is_active ? 'Active' : 'Inactive'}</span>
            </li>)}
          </ul>
        )}
        {canConfigure && integration && (
          <form action={saveDevice} className="grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2">
            <input type="hidden" name="integration_id" value={integration.id} />
            <div><label className="label" htmlFor="terminal-sn">Terminal serial number</label><input id="terminal-sn" name="terminal_sn" required className="input" placeholder="F18 serial number" /></div>
            <div><label className="label" htmlFor="terminal-alias">Terminal name / location</label><input id="terminal-alias" name="terminal_alias" className="input" placeholder="Main school gate" /></div>
            <div><label className="label" htmlFor="terminal-role">Reader purpose</label><select id="terminal-role" name="location_type" className="input" defaultValue="school_entry">
              <option value="school_entry">School entry</option><option value="classroom_entry">Classroom entry</option><option value="school_exit">School exit</option><option value="unassigned">Unassigned</option>
            </select></div>
            <div><label className="label" htmlFor="terminal-class">Class (for classroom readers)</label><select id="terminal-class" name="class_id" className="input" defaultValue=""><option value="">Not class-specific</option>{classRows.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="sm:col-span-2"><button className="btn" type="submit">Register terminal</button></div>
          </form>
        )}
      </section>

      <section className="card space-y-3">
        <div><h2 className="font-semibold">Latest biometric scans</h2><p className="text-sm text-slate-600">Most recent 20 events received from BioTime.</p></div>
        {eventRows.length === 0 ? <p className="text-sm text-slate-500">No scans have been received yet. Events will appear here after the local Bridge connects BioTime.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm">
            <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2 pr-3">Pupil</th><th className="py-2 pr-3">Event</th><th className="py-2 pr-3">Terminal</th><th className="py-2">Time (EAT)</th></tr></thead>
            <tbody>{eventRows.map((e) => <tr key={e.id} className="border-b border-slate-100">
              <td className="py-3 pr-3">{e.students ? <><span className="font-medium">{e.students.first_name} {e.students.last_name}</span><span className="block text-xs text-slate-500">{e.students.admission_no}</span></> : <span className="text-slate-500">Unmatched · {e.external_user_code ?? 'Unknown code'}</span>}</td>
              <td className="py-3 pr-3">{readable(e.event_type)}</td><td className="py-3 pr-3">{e.attendance_devices?.terminal_alias || e.attendance_devices?.terminal_sn || 'Unknown reader'}</td><td className="py-3">{when(e.event_at)}</td>
            </tr>)}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
