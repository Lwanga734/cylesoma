'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

/** Stores the choice server-side, then refreshes the token so claims point at the new school. */
export async function switchSchool(formData: FormData): Promise<void> {
  await requireSession();
  const schoolId = z.uuid().safeParse(formData.get('school_id'));
  if (!schoolId.success) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_active_school', { p_school_id: schoolId.data });
  if (error) return;
  await supabase.auth.refreshSession();
  revalidatePath('/', 'layout');
  redirect('/');
}
