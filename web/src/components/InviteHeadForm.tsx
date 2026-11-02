'use client';

import { useActionState } from 'react';
import { inviteHead } from '@/app/(app)/platform/actions';
import { FormMessage } from '@/components/FormMessage';

export function InviteHeadForm({ schoolId }: { schoolId: string }) {
  const [state, action, pending] = useActionState(inviteHead, {});
  return (
    <form action={action} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <input type="hidden" name="school_id" value={schoolId} />
      <input name="head_name" placeholder="Head teacher name" required aria-label="Head teacher name" className="input" />
      <input name="head_email" type="email" placeholder="Head teacher email" required aria-label="Head teacher email" className="input" />
      <button type="submit" disabled={pending} className="btn">{pending ? 'Working…' : 'Invite head teacher'}</button>
      <select name="deliver" defaultValue="link" aria-label="How to send the invitation" className="input sm:col-span-3">
        <option value="link">Make a link I can share (WhatsApp)</option>
        <option value="email">Send an email invitation</option>
      </select>
      <div className="sm:col-span-3"><FormMessage state={state} /></div>
    </form>
  );
}
