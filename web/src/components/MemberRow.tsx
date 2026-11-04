'use client';

import { useActionState } from 'react';
import {
  memberSetupLink,
  removeMember,
  updateMember,
} from '@/app/(app)/admin/members/actions';
import { FormMessage } from '@/components/FormMessage';
import { formatDate } from '@/lib/format';
import type { Member } from '@/lib/data';
import { roleLabel } from '@/lib/roles';

export function MemberRow({ member, roles }: { member: Member; roles: readonly string[] }) {
  const [roleState, roleAction, rolePending] = useActionState(updateMember, {});
  const [statusState, statusAction, statusPending] = useActionState(updateMember, {});
  const [removeState, removeAction, removePending] = useActionState(removeMember, {});
  const [linkState, linkAction, linkPending] = useActionState(memberSetupLink, {});

  const suspended = member.status === 'suspended';
  const manageable = !member.is_self && roles.includes(member.role);

  return (
    <li className="py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {member.full_name || member.email}
            {member.is_self && <span className="ml-2 text-xs font-normal text-slate-500">(you)</span>}
          </p>
          <p className="truncate text-sm text-slate-600">{member.email}</p>
          <p className="mt-1 text-xs text-slate-500">
            {member.password_set
              ? member.last_sign_in_at
                ? `Last signed in ${formatDate(member.last_sign_in_at.slice(0, 10))}`
                : 'Has not signed in yet'
              : 'Has not set a password yet'}
            {member.invited_by_email ? ` · invited by ${member.invited_by_email}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-xs font-semibold">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">{roleLabel(member.role)}</span>
          <span
            className={`rounded-full px-3 py-1 ${
              suspended ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
            }`}
          >
            {suspended ? 'Suspended' : 'Active'}
          </span>
        </div>
      </div>

      {manageable && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <form action={roleAction} className="flex items-center gap-2">
            <input type="hidden" name="membership_id" value={member.membership_id} />
            <select name="role" defaultValue={member.role} aria-label="Role" className="input w-auto">
              {roles.map((r) => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </select>
            <button type="submit" disabled={rolePending} className="btn-secondary">Save role</button>
          </form>

          <form action={statusAction}>
            <input type="hidden" name="membership_id" value={member.membership_id} />
            <input type="hidden" name="status" value={suspended ? 'active' : 'suspended'} />
            <button type="submit" disabled={statusPending} className="btn-secondary">
              {suspended ? 'Reactivate' : 'Suspend'}
            </button>
          </form>

          {!member.password_set && !suspended && (
            <form action={linkAction}>
              <input type="hidden" name="membership_id" value={member.membership_id} />
              <button type="submit" disabled={linkPending} className="btn-secondary">New setup link</button>
            </form>
          )}

          <form
            action={removeAction}
            onSubmit={(e) => {
              if (!window.confirm(`Remove ${member.full_name || member.email} from your school?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="membership_id" value={member.membership_id} />
            <button type="submit" disabled={removePending} className="btn-secondary text-red-700">Remove</button>
          </form>
        </div>
      )}

      <div className="mt-2 space-y-1">
        <FormMessage state={roleState} />
        <FormMessage state={statusState} />
        <FormMessage state={removeState} />
        <FormMessage state={linkState} />
      </div>
    </li>
  );
}
