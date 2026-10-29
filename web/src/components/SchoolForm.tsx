'use client';

import { useActionState, useState } from 'react';
import { updateSchool } from '@/app/(app)/admin/school/actions';
import { FormMessage } from '@/components/FormMessage';
import { safeHexColor } from '@/lib/format';

export function SchoolForm({ name, motto, color }: { name: string; motto: string; color: string }) {
  const [state, action, pending] = useActionState(updateSchool, {});
  const [hex, setHex] = useState(color);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">School name</label>
        <input id="name" name="name" defaultValue={name} required maxLength={120} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="motto">Motto</label>
        <input id="motto" name="motto" defaultValue={motto} maxLength={200} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="color">Brand colour (hex)</label>
        <div className="flex items-center gap-3">
          <input
            id="color"
            name="color"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            pattern="#[0-9a-fA-F]{6}"
            required
            className="input"
          />
          <span
            aria-hidden
            className="h-11 w-11 shrink-0 rounded-lg border border-slate-300"
            style={{ backgroundColor: safeHexColor(hex, '#ffffff') }}
          />
        </div>
      </div>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="btn">{pending ? 'Saving…' : 'Save'}</button>
    </form>
  );
}
