'use client';

import { useActionState } from 'react';
import { addClass, archiveClass, renameClass, restoreClass } from '@/app/(app)/admin/classes/actions';
import { FormMessage } from '@/components/FormMessage';

export type ClassItem = { id: string; name: string; level: string | null; students: number };

export function AddClassForm() {
  const [state, action, pending] = useActionState(addClass, {});
  const v = state.values ?? {};
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div>
        <label className="label" htmlFor="c-name">Class name</label>
        <input id="c-name" name="name" defaultValue={v.name} required maxLength={60} placeholder="e.g. P5 or Senior 2 East" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="c-level">Level (optional)</label>
        <input id="c-level" name="level" defaultValue={v.level} maxLength={40} placeholder="e.g. Primary" className="input" />
      </div>
      <button type="submit" disabled={pending} className="btn">{pending ? 'Adding…' : 'Add class'}</button>
      <div className="sm:col-span-3"><FormMessage state={state} /></div>
    </form>
  );
}

export function ClassRow({ item, canManage }: { item: ClassItem; canManage: boolean }) {
  const [renameState, renameAction, renamePending] = useActionState(renameClass, {});
  const [archiveState, archiveAction, archivePending] = useActionState(archiveClass, {});
  return (
    <li className="py-3">
      {canManage ? (
        <div className="flex flex-wrap items-center gap-2">
          <form action={renameAction} className="flex flex-1 flex-wrap items-center gap-2">
            <input type="hidden" name="class_id" value={item.id} />
            <input name="name" defaultValue={item.name} required maxLength={60} aria-label="Class name" className="input w-auto min-w-32 flex-1" />
            <input name="level" defaultValue={item.level ?? ''} maxLength={40} placeholder="Level" aria-label="Level" className="input w-auto min-w-28" />
            <button type="submit" disabled={renamePending} className="btn-secondary">Save</button>
          </form>
          <span className="text-sm text-slate-600">{item.students} {item.students === 1 ? 'student' : 'students'}</span>
          <form
            action={archiveAction}
            onSubmit={(e) => {
              if (!window.confirm(`Archive ${item.name}? It will be hidden from lists. You can restore it later.`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="class_id" value={item.id} />
            <button type="submit" disabled={archivePending} className="btn-secondary text-red-700">Archive</button>
          </form>
        </div>
      ) : (
        <p className="flex items-center justify-between">
          <span className="font-medium">{item.name}{item.level ? ` · ${item.level}` : ''}</span>
          <span className="text-sm text-slate-600">{item.students} {item.students === 1 ? 'student' : 'students'}</span>
        </p>
      )}
      <div className="mt-1 space-y-1">
        <FormMessage state={renameState} />
        <FormMessage state={archiveState} />
      </div>
    </li>
  );
}

export function ArchivedClassRow({ item }: { item: { id: string; name: string } }) {
  const [state, action, pending] = useActionState(restoreClass, {});
  return (
    <li className="py-2">
      <form action={action} className="flex items-center justify-between gap-3">
        <input type="hidden" name="class_id" value={item.id} />
        <span className="text-sm text-slate-700">{item.name}</span>
        <button type="submit" disabled={pending} className="btn-secondary">Restore</button>
      </form>
      <FormMessage state={state} />
    </li>
  );
}
