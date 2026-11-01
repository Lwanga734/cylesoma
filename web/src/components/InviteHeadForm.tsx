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
      <button type="submit" disabled={pending} className="btn">{pending ? 'Sending…' : 'Invite head teacher'}</button>
      <div className="sm:col-span-3"><FormMessage state={state} /></div>
    </form>
  );
}
