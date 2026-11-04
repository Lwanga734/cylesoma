'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireSection } from '@/lib/auth';
import type { PlatformSchool } from '@/lib/data';
import { functionErrorMessage, inviteLink } from '@/lib/invite-link';
import { createClient } from '@/lib/supabase/server';
import type { ActionState } from '@/lib/action-state';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const uuid = z.uuid();

function friendly(error: { code?: string; message?: string } | null): string {
  const m = error?.message ?? '';
  if (error?.code === '42501' || m === 'not allowed') return 'You do not have permission to do this.';
  if (error?.code === '23505') return 'That web name is already used by another school.';
  if (m.includes('at least one active head')) {
    return 'A school must keep at least one active head teacher. Invite a new head teacher first.';
  }
  if (m.includes('suspend the school before')) return 'Suspend the school first, then delete it.';
  if (m.includes('student records')) return 'This school has student records, so it cannot be deleted. Suspend it instead.';
  if (m === 'school not found' || m === 'member not found') return 'That no longer exists. Refresh the page.';
  return 'Something went wrong. Try again.';
}

function refresh(schoolId: string) {
  revalidatePath('/platform');
  revalidatePath(`/platform/schools/${schoolId}`);
}

export async function updateSchoolDetails(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSection('platform');
  const raw = {
    school_id: String(formData.get('school_id') ?? ''),
    name: String(formData.get('name') ?? '').trim(),
    slug: String(formData.get('slug') ?? '').trim().toLowerCase(),
    motto: String(formData.get('motto') ?? '').trim().slice(0, 200),
    color: String(formData.get('color') ?? ''),
  };
  const fail = (error: string): ActionState => ({ error, values: raw });
  if (!uuid.safeParse(raw.school_id).success) return fail('Invalid school.');
  if (raw.name.length < 2 || raw.name.length > 120) return fail('Enter the school name.');
  if (!raw.slug || raw.slug.length > 50 || !SLUG.test(raw.slug)) {
    return fail('The web name can only contain letters, numbers and single hyphens.');
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(raw.color)) return fail('Colour must look like #053065.');

  const supabase = await createClient();
  const { error } = await supabase.rpc('platform_update_school', {
    p_school_id: raw.school_id,
    p_name: raw.name,
    p_slug: raw.slug,
    p_motto: raw.motto,
    p_color: raw.color,
  });
  if (error) return fail(friendly(error));
  refresh(raw.school_id);
  return { ok: true, message: 'Saved.', values: raw };
}

export async function setSchoolStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSection('platform');
  const id = uuid.safeParse(formData.get('school_id'));
  const status = formData.get('status');
  if (!id.success || (status !== 'active' && status !== 'suspended')) return { error: 'Invalid request.' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('platform_set_school_status', { p_school_id: id.data, p_status: status });
  if (error) return { error: friendly(error) };
  refresh(id.data);
  return { ok: true, message: status === 'suspended' ? 'School suspended.' : 'School reactivated.' };
}

export async function updateLeader(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSection('platform');
  const id = uuid.safeParse(formData.get('membership_id'));
  const schoolId = uuid.safeParse(formData.get('school_id'));
  const status = formData.get('status');
  if (!id.success || !schoolId.success || (status !== 'active' && status !== 'suspended')) {
    return { error: 'Invalid request.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('platform_update_leader', { p_membership_id: id.data, p_status: status });
  if (error) return { error: friendly(error) };
  refresh(schoolId.data);
  return { ok: true, message: status === 'suspended' ? 'Suspended.' : 'Reactivated.' };
}

export async function removeLeader(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSection('platform');
  const id = uuid.safeParse(formData.get('membership_id'));
  const schoolId = uuid.safeParse(formData.get('school_id'));
  if (!id.success || !schoolId.success) return { error: 'Invalid request.' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('platform_remove_leader', { p_membership_id: id.data });
  if (error) return { error: friendly(error) };
  refresh(schoolId.data);
  return { ok: true, message: 'Removed.' };
}

/** New one-time setup link for a head teacher / owner who never chose a password. */
export async function leaderSetupLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSection('platform');
  const id = uuid.safeParse(formData.get('membership_id'));
  if (!id.success) return { error: 'Invalid request.' };
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: { action: 'reissue_link', membership_id: id.data },
  });
  if (error) return { error: await functionErrorMessage(error, 'Could not create the setup link.') };
  const tokenHash = typeof data?.token_hash === 'string' ? data.token_hash : null;
  if (!tokenHash) return { error: 'Could not create the setup link.' };
  return { ok: true, message: 'Send this setup link to the person:', link: await inviteLink(tokenHash, 'recovery') };
}

/** Permanent. Requires the school to be suspended, empty of student records, and its web name typed exactly. */
export async function deleteSchool(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSection('platform');
  const id = uuid.safeParse(formData.get('school_id'));
  if (!id.success) return { error: 'Invalid school.' };

  const supabase = await createClient();
  const { data } = await supabase.rpc('platform_school_overview');
  const school = ((data as PlatformSchool[] | null) ?? []).find((s) => s.id === id.data);
  if (!school) return { error: 'That school no longer exists.' };
  if (String(formData.get('confirm') ?? '').trim() !== school.slug) {
    return { error: `Type the web name (${school.slug}) exactly to confirm.` };
  }
  const { error } = await supabase.rpc('platform_delete_school', { p_school_id: id.data });
  if (error) return { error: friendly(error) };
  revalidatePath('/platform');
  redirect('/platform');
}
