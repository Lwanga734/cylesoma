'use client';

import { useActionState } from 'react';
import { addStudent, updateStudent } from '@/app/(app)/admin/students/actions';
import { FormMessage } from '@/components/FormMessage';
import type { ActionState } from '@/lib/action-state';

export type StudentValues = {
  id?: string;
  admission_no: string;
  first_name: string;
  last_name: string;
  class_id: string | null;
  date_of_birth: string | null;
  boarding: boolean;
  status: string;
};

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function Fields({
  classes,
  initial,
  state,
  action,
  pending,
  submitLabel,
  showStatus,
}: {
  classes: { id: string; name: string }[];
  initial?: StudentValues;
  state: ActionState;
  action: (formData: FormData) => void;
  pending: boolean;
  submitLabel: string;
  showStatus: boolean;
}) {
  const v = state.values ?? {};
  const val = (key: keyof StudentValues, fallback = '') =>
    (v[key as string] ?? (initial?.[key] as string | null | undefined) ?? fallback) as string;
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {initial?.id && <input type="hidden" name="student_id" value={initial.id} />}
      <div>
        <label className="label" htmlFor="st-adm">Admission number</label>
        <input id="st-adm" name="admission_no" defaultValue={val('admission_no')} required maxLength={40} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="st-class">Class</label>
        <select id="st-class" name="class_id" defaultValue={val('class_id')} className="input">
          <option value="">No class yet</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="st-first">First name</label>
        <input id="st-first" name="first_name" defaultValue={val('first_name')} required maxLength={80} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="st-last">Last name</label>
        <input id="st-last" name="last_name" defaultValue={val('last_name')} required maxLength={80} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="st-dob">Date of birth (optional)</label>
        <input id="st-dob" name="date_of_birth" type="date" defaultValue={val('date_of_birth')} className="input" />
      </div>
      {showStatus ? (
        <div>
          <label className="label" htmlFor="st-status">Status</label>
          <select id="st-status" name="status" defaultValue={val('status', 'active')} className="input">
            <option value="active">Active</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="transferred">Transferred</option>
            <option value="graduated">Graduated</option>
          </select>
        </div>
      ) : (
        <input type="hidden" name="status" value="active" />
      )}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="boarding"
          defaultChecked={v.boarding !== undefined ? v.boarding === 'on' : initial?.boarding ?? false}
          className="h-4 w-4"
        />
        Boarding student
      </label>
      <div className="space-y-2 sm:col-span-2">
        <FormMessage state={state} />
        <button type="submit" disabled={pending} className="btn">{pending ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}

export function AddStudentForm({ classes }: { classes: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(addStudent as Action, {});
  return <Fields classes={classes} state={state} action={action} pending={pending} submitLabel="Add student" showStatus={false} />;
}

export function EditStudentForm({ classes, student }: { classes: { id: string; name: string }[]; student: StudentValues }) {
  const [state, action, pending] = useActionState(updateStudent as Action, {});
  return (
    <Fields classes={classes} initial={student} state={state} action={action} pending={pending} submitLabel="Save changes" showStatus />
  );
}
