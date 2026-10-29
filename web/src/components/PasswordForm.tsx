'use client';

import { useActionState } from 'react';
import { setPassword } from '@/app/actions/auth';
import { FormMessage } from '@/components/FormMessage';

export function PasswordForm() {
  const [state, action, pending] = useActionState(setPassword, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Confirm password</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className="input" />
      </div>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="btn w-full">
        {pending ? 'Saving…' : 'Save password'}
      </button>
    </form>
  );
}
