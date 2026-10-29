'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { ActionState } from '@/lib/action-state';

const schoolSchema = z.object({
  name: z.string().trim().min(1, 'School name is required.').max(120),
  motto: z.string().trim().max(200),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colour must look like #053065.'),
});

export async function updateSchool(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.schoolId) return { error: 'No school selected.' };
  const parsed = schoolSchema.safeParse({
    name: formData.get('name') ?? '',
    motto: formData.get('motto') ?? '',
    color: formData.get('color') ?? '',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const supabase = await createClient();
  // RLS only lets the head update; an empty result means no permission.
  const { data, error } = await supabase
    .from('schools')
    .update({
      name: parsed.data.name,
      motto: parsed.data.motto || null,
      primary_color: parsed.data.color.toLowerCase(),
    })
    .eq('id', session.schoolId)
    .select('id');
  if (error || !data?.length) return { error: 'You do not have permission to change school settings.' };

  revalidatePath('/', 'layout');
  return { ok: true, message: 'Saved.' };
}

const termSchema = z
  .object({
    name: z.string().trim().min(1, 'Term name is required.').max(60),
    year: z.coerce.number().int().min(2020).max(2100),
    starts_on: z.iso.date(),
    ends_on: z.iso.date(),
  })
  .refine((t) => t.ends_on > t.starts_on, { message: 'The end date must be after the start date.', path: ['ends_on'] });

export async function addTerm(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.schoolId) return { error: 'No school selected.' };
  const parsed = termSchema.safeParse({
    name: formData.get('name'),
    year: formData.get('year'),
    starts_on: formData.get('starts_on'),
    ends_on: formData.get('ends_on'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const supabase = await createClient();
  const { error } = await supabase.from('terms').insert({ ...parsed.data, school_id: session.schoolId });
  if (error) {
    return { error: error.code === '23505' ? 'That term already exists.' : 'Could not add the term (no permission?).' };
  }
  revalidatePath('/admin/school');
  return { ok: true, message: 'Term added.' };
}

export async function setCurrentTerm(formData: FormData): Promise<void> {
  await requireSession();
  const termId = z.uuid().safeParse(formData.get('term_id'));
  if (!termId.success) return;
  const supabase = await createClient();
  await supabase.rpc('set_current_term', { p_term_id: termId.data });
  revalidatePath('/admin/school');
}
