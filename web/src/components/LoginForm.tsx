'use client';

import { useActionState } from 'react';
import { signIn } from '@/app/actions/auth';
import { FormMessage } from '@/components/FormMessage';

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="btn w-full">
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
