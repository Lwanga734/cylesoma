'use client';

import { useActionState } from 'react';
import { addTerm } from '@/app/(app)/admin/school/actions';
import { FormMessage } from '@/components/FormMessage';

export function AddTermForm() {
  const [state, action, pending] = useActionState(addTerm, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="term-name">Name</label>
        <input id="term-name" name="name" defaultValue="Term 1" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="term-year">Year</label>
        <input id="term-year" name="year" type="number" defaultValue={new Date().getFullYear()} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="term-start">Starts</label>
        <input id="term-start" name="starts_on" type="date" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="term-end">Ends</label>
        <input id="term-end" name="ends_on" type="date" required className="input" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <FormMessage state={state} />
        <button type="submit" disabled={pending} className="btn">{pending ? 'Adding…' : 'Add term'}</button>
      </div>
    </form>
  );
}
