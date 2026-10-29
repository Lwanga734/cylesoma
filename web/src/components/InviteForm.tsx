'use client';

import { useActionState } from 'react';
import { inviteUser } from '@/app/(app)/admin/invite/actions';
import { FormMessage } from '@/components/FormMessage';
import { roleLabel } from '@/lib/roles';

export function InviteForm({ roles }: { roles: readonly string[] }) {
  const [state, action, pending] = useActionState(inviteUser, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="full_name">Full name</label>
        <input id="full_name" name="full_name" required maxLength={120} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="role">Role</label>
        <select id="role" name="role" required defaultValue="" className="input">
          <option value="" disabled>Choose a role</option>
          {roles.map((r) => (
            <option key={r} value={r}>{roleLabel(r)}</option>
          ))}
        </select>
      </div>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="btn">{pending ? 'Sending…' : 'Send invitation'}</button>
    </form>
  );
}
