'use client';

import { useActionState } from 'react';
import { createSchool } from '@/app/(app)/platform/actions';
import { FormMessage } from '@/components/FormMessage';

export function AddSchoolForm() {
  const [state, action, pending] = useActionState(createSchool, {});
  const v = state.values ?? {};
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="s-name">School name</label>
        <input id="s-name" name="name" defaultValue={v.name} required minLength={2} maxLength={120} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="s-slug">Web name (optional)</label>
        <input id="s-slug" name="slug" defaultValue={v.slug} placeholder="made from the name" maxLength={50} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="s-color">Brand colour</label>
        <input id="s-color" name="color" defaultValue={v.color ?? '#053065'} pattern="#[0-9a-fA-F]{6}" required className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="s-motto">Motto (optional)</label>
        <input id="s-motto" name="motto" defaultValue={v.motto} maxLength={200} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="s-head-name">Head teacher name</label>
        <input id="s-head-name" name="head_name" defaultValue={v.head_name} maxLength={120} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="s-head-email">Head teacher email</label>
        <input id="s-head-email" name="head_email" type="email" defaultValue={v.head_email} className="input" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <p className="text-xs text-slate-600">
          Add the head teacher now and they receive an invitation email. You can also leave both blank and invite later.
        </p>
        <FormMessage state={state} />
        <button type="submit" disabled={pending} className="btn">{pending ? 'Creating…' : 'Add school'}</button>
      </div>
    </form>
  );
}
