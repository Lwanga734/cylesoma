'use client';

import { useActionState } from 'react';
import { inviteUser } from '@/app/(app)/admin/invite/actions';
import { FormMessage } from '@/components/FormMessage';
import { roleLabel } from '@/lib/roles';

export function InviteForm({ roles }: { roles: readonly string[] }) {
  const [state, action, pending] = useActionState(inviteUser, {});
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="full_name">Full name</label>
        <input id="full_name" name="full_name" defaultValue={v.full_name} required maxLength={120} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" defaultValue={v.email} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="role">Role</label>
        <select id="role" name="role" required defaultValue={v.role ?? ''} className="input">
          <option value="" disabled>Choose a role</option>
          {roles.map((r) => (
            <option key={r} value={r}>{roleLabel(r)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="deliver">How to send the invitation</label>
        <select id="deliver" name="deliver" defaultValue="link" className="input">
          <option value="link">Make a link I can share (WhatsApp)</option>
          <option value="email">Send an email invitation</option>
        </select>
      </div>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="btn">{pending ? 'Working…' : 'Create invitation'}</button>
    </form>
  );
}
