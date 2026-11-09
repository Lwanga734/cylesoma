'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { canManageClasses } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import type { ActionState } from '@/lib/action-state';

const idSchema = z.uuid();
const fieldSchema = z.object({
  name: z.string().trim().min(1, 'Enter a class name.').max(60, 'The class name is too long.'),
  level: z.string().trim().max(40, 'The level is too long.'),
});

async function guard() {
  const session = await requireSession();
  return canManageClasses(session.role) && session.schoolId ? session : null;
}

export async function addClass(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await guard();
  if (!session) return { error: 'You are not allowed to change classes.' };
  const raw = { name: String(formData.get('name') ?? ''), level: String(formData.get('level') ?? '') };
  const parsed = fieldSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.', values: raw };

  const supabase = await createClient();
  const { error } = await supabase
    .from('classes')
    .insert({ school_id: session.schoolId, name: parsed.data.name, level: parsed.data.level || null });
  if (error) {
    return {
      error: error.code === '23505' ? 'A class with that name already exists (it may be archived below).' : 'Could not add the class.',
      values: raw,
    };
  }
  revalidatePath('/admin/classes');
  return { ok: true, message: `${parsed.data.name} added.` };
}

export async function renameClass(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await guard();
  if (!session) return { error: 'You are not allowed to change classes.' };
  const id = idSchema.safeParse(formData.get('class_id'));
  const parsed = fieldSchema.safeParse({
    name: String(formData.get('name') ?? ''),
    level: String(formData.get('level') ?? ''),
  });
  if (!id.success) return { error: 'Invalid class.' };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('classes')
    .update({ name: parsed.data.name, level: parsed.data.level || null })
    .eq('id', id.data)
    .select('id');
  if (error) {
    return { error: error.code === '23505' ? 'Another class already has that name.' : 'Could not save the class.' };
  }
  if (!data?.length) return { error: 'You are not allowed to change this class.' };
  revalidatePath('/admin/classes');
  revalidatePath('/admin/students');
  return { ok: true, message: 'Saved.' };
}

/** Archiving hides a class. It is refused while active students are still in it. */
export async function archiveClass(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await guard();
  if (!session) return { error: 'You are not allowed to change classes.' };
  const id = idSchema.safeParse(formData.get('class_id'));
  if (!id.success) return { error: 'Invalid class.' };

  const supabase = await createClient();
  const { count } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', id.data)
    .eq('status', 'active')
    .is('deleted_at', null);
  if ((count ?? 0) > 0) {
    return { error: `${count} active ${count === 1 ? 'student is' : 'students are'} still in this class. Move or withdraw them first.` };
  }
  const { data, error } = await supabase
    .from('classes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id.data)
    .select('id');
  if (error || !data?.length) return { error: 'Could not archive the class.' };
  revalidatePath('/admin/classes');
  return { ok: true, message: 'Archived.' };
}

export async function restoreClass(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await guard();
  if (!session) return { error: 'You are not allowed to change classes.' };
  const id = idSchema.safeParse(formData.get('class_id'));
  if (!id.success) return { error: 'Invalid class.' };
  const supabase = await createClient();
  const { data, error } = await supabase.from('classes').update({ deleted_at: null }).eq('id', id.data).select('id');
  if (error || !data?.length) return { error: 'Could not restore the class.' };
  revalidatePath('/admin/classes');
  return { ok: true, message: 'Restored.' };
}
