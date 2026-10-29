'use client';

import { useActionState } from 'react';
import { requestPasswordReset } from '@/app/actions/auth';
import { FormMessage } from '@/components/FormMessage';

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="btn w-full">
        {pending ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  );
}
