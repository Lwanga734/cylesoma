'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { canManageStudents } from '@/lib/roles';
import { parseDate } from '@/lib/student-import';
import { createClient } from '@/lib/supabase/server';
import type { ActionState } from '@/lib/action-state';

const STATUSES = ['active', 'withdrawn', 'transferred', 'graduated'] as const;

function read(formData: FormData) {
  return {
    admission_no: String(formData.get('admission_no') ?? '').trim(),
    first_name: String(formData.get('first_name') ?? '').trim(),
    last_name: String(formData.get('last_name') ?? '').trim(),
    class_id: String(formData.get('class_id') ?? ''),
    date_of_birth: String(formData.get('date_of_birth') ?? '').trim(),
    boarding: formData.get('boarding') === 'on',
    status: String(formData.get('status') ?? 'active'),
  };
}

function validate(raw: ReturnType<typeof read>): { error: string } | { value: Record<string, unknown> } {
  if (!raw.admission_no || raw.admission_no.length > 40) return { error: 'Enter an admission number (up to 40 characters).' };
  if (!raw.first_name || raw.first_name.length > 80) return { error: 'Enter the first name.' };
  if (!raw.last_name || raw.last_name.length > 80) return { error: 'Enter the last name.' };
  if (raw.class_id && !z.uuid().safeParse(raw.class_id).success) return { error: 'Choose a valid class.' };
  let dob: string | null = null;
  if (raw.date_of_birth) {
    dob = parseDate(raw.date_of_birth);
    if (!dob) return { error: 'Enter a valid date of birth in the past.' };
  }
  if (!(STATUSES as readonly string[]).includes(raw.status)) return { error: 'Choose a valid status.' };
  return {
    value: {
      admission_no: raw.admission_no,
      first_name: raw.first_name,
      last_name: raw.last_name,
      class_id: raw.class_id || null,
      date_of_birth: dob,
      boarding: raw.boarding,
      status: raw.status,
    },
  };
}

function toValues(raw: ReturnType<typeof read>): Record<string, string> {
  return { ...raw, boarding: raw.boarding ? 'on' : '' };
}

export async function addStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!canManageStudents(session.role) || !session.schoolId) return { error: 'You are not allowed to add students.' };
  const raw = read(formData);
  const result = validate(raw);
  if ('error' in result) return { error: result.error, values: toValues(raw) };

  const supabase = await createClient();
  const { error } = await supabase.from('students').insert({ ...result.value, school_id: session.schoolId });
  if (error) {
    return {
      error: error.code === '23505' ? 'That admission number is already used by another student.' : 'Could not add the student.',
      values: toValues(raw),
    };
  }
  revalidatePath('/admin/students');
  return { ok: true, message: `${raw.first_name} ${raw.last_name} was added.` };
}

export async function updateStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!canManageStudents(session.role)) return { error: 'You are not allowed to change students.' };
  const id = z.uuid().safeParse(formData.get('student_id'));
  if (!id.success) return { error: 'Invalid student.' };
  const raw = read(formData);
  const result = validate(raw);
  if ('error' in result) return { error: result.error, values: toValues(raw) };

  const supabase = await createClient();
  const { data, error } = await supabase.from('students').update(result.value).eq('id', id.data).select('id');
  if (error) {
    return {
      error: error.code === '23505' ? 'That admission number is already used by another student.' : 'Could not save the student.',
      values: toValues(raw),
    };
  }
  if (!data?.length) return { error: 'You are not allowed to change this student.' };
  revalidatePath('/admin/students');
  revalidatePath(`/admin/students/${id.data}`);
  return { ok: true, message: 'Saved.', values: toValues(raw) };
}
