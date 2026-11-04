'use client';

import { useActionState, useState } from 'react';
import {
  deleteSchool,
  leaderSetupLink,
  removeLeader,
  setSchoolStatus,
  updateLeader,
  updateSchoolDetails,
} from '@/app/(app)/platform/schools/[id]/actions';
import { FormMessage } from '@/components/FormMessage';
import { formatDate, safeHexColor } from '@/lib/format';
import type { Leader, PlatformSchool } from '@/lib/data';
import { roleLabel } from '@/lib/roles';

export function SchoolEditForm({ school }: { school: PlatformSchool }) {
  const [state, action, pending] = useActionState(updateSchoolDetails, {});
  const v = state.values ?? {};
  const [hex, setHex] = useState(v.color ?? school.primary_color);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="school_id" value={school.id} />
      <div className="sm:col-span-2">
        <label className="label" htmlFor="e-name">School name</label>
        <input id="e-name" name="name" defaultValue={v.name ?? school.name} required minLength={2} maxLength={120} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="e-slug">Web name</label>
        <input id="e-slug" name="slug" defaultValue={v.slug ?? school.slug} required maxLength={50} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="e-color">Brand colour</label>
        <div className="flex items-center gap-3">
          <input
            id="e-color"
            name="color"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            pattern="#[0-9a-fA-F]{6}"
            required
            className="input"
          />
          <span
            aria-hidden
            className="h-11 w-11 shrink-0 rounded-lg border border-slate-300"
            style={{ backgroundColor: safeHexColor(hex, '#ffffff') }}
          />
        </div>
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="e-motto">Motto</label>
        <input id="e-motto" name="motto" defaultValue={v.motto ?? school.motto ?? ''} maxLength={200} className="input" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <FormMessage state={state} />
        <button type="submit" disabled={pending} className="btn">{pending ? 'Saving…' : 'Save changes'}</button>
      </div>
    </form>
  );
}

export function SchoolStatusForm({ school }: { school: PlatformSchool }) {
  const [state, action, pending] = useActionState(setSchoolStatus, {});
  const suspended = school.status === 'suspended';
  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(e) => {
        if (!suspended && !window.confirm(`Suspend ${school.name}? Everyone in the school loses access to its data until you reactivate it.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="school_id" value={school.id} />
      <input type="hidden" name="status" value={suspended ? 'active' : 'suspended'} />
      <p className="text-sm text-slate-600">
        {suspended
          ? 'This school is suspended. Its people cannot use its data. Reactivate it to restore access.'
          : 'Suspending pauses access to the school for everyone in it. Nothing is deleted, and you can reactivate it at any time.'}
      </p>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={suspended ? 'btn' : 'btn-secondary text-amber-800'}>
        {suspended ? 'Reactivate school' : 'Suspend school'}
      </button>
    </form>
  );
}

export function LeaderRow({ leader, schoolId }: { leader: Leader; schoolId: string }) {
  const [statusState, statusAction, statusPending] = useActionState(updateLeader, {});
  const [removeState, removeAction, removePending] = useActionState(removeLeader, {});
  const [linkState, linkAction, linkPending] = useActionState(leaderSetupLink, {});
  const suspended = leader.status === 'suspended';

  return (
    <li className="py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{leader.full_name || leader.email}</p>
          <p className="truncate text-sm text-slate-600">{leader.email}</p>
          <p className="mt-1 text-xs text-slate-500">
            {leader.password_set
              ? leader.last_sign_in_at
                ? `Last signed in ${formatDate(leader.last_sign_in_at.slice(0, 10))}`
                : 'Has not signed in yet'
              : 'Has not set a password yet'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-xs font-semibold">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">{roleLabel(leader.role)}</span>
          <span className={`rounded-full px-3 py-1 ${suspended ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
            {suspended ? 'Suspended' : 'Active'}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <form action={statusAction}>
          <input type="hidden" name="membership_id" value={leader.membership_id} />
          <input type="hidden" name="school_id" value={schoolId} />
          <input type="hidden" name="status" value={suspended ? 'active' : 'suspended'} />
          <button type="submit" disabled={statusPending} className="btn-secondary">
            {suspended ? 'Reactivate' : 'Suspend'}
          </button>
        </form>
        {!leader.password_set && !suspended && (
          <form action={linkAction}>
            <input type="hidden" name="membership_id" value={leader.membership_id} />
            <button type="submit" disabled={linkPending} className="btn-secondary">New setup link</button>
          </form>
        )}
        <form
          action={removeAction}
          onSubmit={(e) => {
            if (!window.confirm(`Remove ${leader.full_name || leader.email} from this school?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="membership_id" value={leader.membership_id} />
          <input type="hidden" name="school_id" value={schoolId} />
          <button type="submit" disabled={removePending} className="btn-secondary text-red-700">Remove</button>
        </form>
      </div>
      <div className="mt-2 space-y-1">
        <FormMessage state={statusState} />
        <FormMessage state={removeState} />
        <FormMessage state={linkState} />
      </div>
    </li>
  );
}

export function DeleteSchoolForm({ school }: { school: PlatformSchool }) {
  const [state, action, pending] = useActionState(deleteSchool, {});
  const suspended = school.status === 'suspended';
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="school_id" value={school.id} />
      <p className="text-sm text-slate-700">
        Deleting a school is <strong>permanent</strong>. It removes the school and its memberships. People&apos;s accounts
        stay. It only works for a suspended school that has no student records.
      </p>
      {!suspended && <p className="text-sm text-amber-800">Suspend the school first to enable deletion.</p>}
      <div>
        <label className="label" htmlFor="d-confirm">Type the web name <code>{school.slug}</code> to confirm</label>
        <input id="d-confirm" name="confirm" autoComplete="off" disabled={!suspended} className="input" />
      </div>
      <FormMessage state={state} />
      <button type="submit" disabled={!suspended || pending} className="btn-secondary text-red-700">
        {pending ? 'Deleting…' : 'Delete school permanently'}
      </button>
    </form>
  );
}
