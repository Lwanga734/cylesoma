'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { canManageStudents } from '@/lib/roles';
import { MAX_IMPORT_ROWS } from '@/lib/student-import';
import { createClient } from '@/lib/supabase/server';
import type { ActionState } from '@/lib/action-state';

// The browser already checked these rows; the server checks them again and never trusts the browser.
const rowSchema = z
  .object({
    admission_no: z.string().trim().min(1).max(40),
    first_name: z.string().trim().min(1).max(80),
    last_name: z.string().trim().min(1).max(80),
    class_name: z.string().trim().min(1).max(60).nullable(),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    boarding: z.boolean(),
  })
  .strict();

export async function importStudents(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!canManageStudents(session.role)) return { error: 'You are not allowed to import students.' };

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get('payload') ?? ''));
  } catch {
    return { error: 'The import data could not be read. Choose the file again.' };
  }
  const parsed = z.array(rowSchema).min(1).max(MAX_IMPORT_ROWS).safeParse(payload);
  if (!parsed.success) return { error: 'The import data is not valid. Choose the file again.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('import_students', {
    p_rows: parsed.data,
    p_create_classes: formData.get('create_classes') === 'on',
  });
  if (error) {
    if (error.code === '42501' || /row-level security/i.test(error.message)) {
      return { error: 'You are not allowed to import students.' };
    }
    return { error: 'The import failed and nothing was saved. Check the file and try again.' };
  }

  const r = data as { inserted?: number; skipped?: number; classes_created?: number } | null;
  revalidatePath('/admin/students');
  revalidatePath('/admin/classes');
  const parts = [`Imported ${r?.inserted ?? 0} ${r?.inserted === 1 ? 'student' : 'students'}.`];
  if (r?.skipped) parts.push(`${r.skipped} already existed (same admission number) and were skipped.`);
  if (r?.classes_created) parts.push(`${r.classes_created} new ${r.classes_created === 1 ? 'class was' : 'classes were'} created.`);
  return { ok: true, message: parts.join(' ') };
}
