'use server';

import { revalidatePath } from 'next/cache';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireSection } from '@/lib/auth';
import { slugify } from '@/lib/format';
import { friendlyInviteError, inviteLink } from '@/lib/invite-link';
import { createClient } from '@/lib/supabase/server';
import type { ActionState } from '@/lib/action-state';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type Deliver = 'link' | 'email';
type InviteResult = { error: string | null; invited: boolean; link?: string };

function parseDeliver(value: FormDataEntryValue | null): Deliver {
  return value === 'email' ? 'email' : 'link';
}

/** Asks the invite-user Edge Function to make `email` the head teacher of `schoolId`. */
async function inviteHeadTo(schoolId: string, name: string, email: string, deliver: Deliver): Promise<InviteResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: { school_id: schoolId, role: 'head', full_name: name, email, deliver },
  });
  if (!error) {
    const tokenHash = typeof data?.token_hash === 'string' ? data.token_hash : null;
    return {
      error: null,
      invited: data?.invited === true,
      link: tokenHash ? await inviteLink(tokenHash) : undefined,
    };
  }
  let message = 'The invitation failed.';
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (typeof body?.error === 'string') message = body.error;
    } catch {
      /* keep generic message */
    }
  }
  return { error: friendlyInviteError(message), invited: false };
}

const headSchema = z.object({ name: z.string().trim().min(1).max(120), email: z.email() });

export async function createSchool(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSection('platform');
  const raw = {
    name: String(formData.get('name') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    motto: String(formData.get('motto') ?? ''),
    color: String(formData.get('color') ?? '#053065'),
    head_name: String(formData.get('head_name') ?? ''),
    head_email: String(formData.get('head_email') ?? ''),
  };
  const deliver = parseDeliver(formData.get('deliver'));
  const fail = (error: string): ActionState => ({ error, values: raw });

  const name = raw.name.trim();
  if (name.length < 2 || name.length > 120) return fail('Enter the school name.');
  const slug = raw.slug.trim().toLowerCase() || slugify(name);
  if (!slug || slug.length > 50 || !SLUG.test(slug)) {
    return fail('The web name can only contain letters, numbers and single hyphens.');
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(raw.color)) return fail('Colour must look like #053065.');
  const motto = raw.motto.trim().slice(0, 200);

  const headName = raw.head_name.trim();
  const headEmail = raw.head_email.trim();
  const wantsHead = headName !== '' || headEmail !== '';
  if (wantsHead && !headSchema.safeParse({ name: headName, email: headEmail }).success) {
    return fail('Enter both a valid head teacher name and email, or leave both blank.');
  }

  const supabase = await createClient();
  const { data: schoolId, error } = await supabase.rpc('platform_create_school', {
    p_name: name,
    p_slug: slug,
    p_motto: motto,
    p_color: raw.color,
  });
  if (error || typeof schoolId !== 'string') {
    if (error?.code === '23505') return fail('That web name is already used by another school.');
    if (error?.code === '42501') return fail('You do not have permission to add schools.');
    return fail('Could not create the school.');
  }
  revalidatePath('/platform');

  if (!wantsHead) return { ok: true, message: `${name} was created. Invite its head teacher from the list below.` };

  const result = await inviteHeadTo(schoolId, headName, headEmail, deliver);
  if (result.error) {
    return {
      ok: true,
      message: `${name} was created, but the invitation failed (${result.error}). Use "Invite head teacher" in the list below.`,
    };
  }
  if (result.link) {
    return { ok: true, message: `${name} was created. Send this link to ${headEmail}:`, link: result.link };
  }
  return {
    ok: true,
    message: result.invited
      ? `${name} was created and an invitation email was sent to ${headEmail}.`
      : `${name} was created and ${headEmail} (already a user) was made its head teacher.`,
  };
}

export async function inviteHead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSection('platform');
  const parsed = z
    .object({
      school_id: z.uuid(),
      name: z.string().trim().min(1, 'Enter the head teacher’s name.').max(120),
      email: z.email('Enter a valid email.'),
    })
    .safeParse({
      school_id: formData.get('school_id'),
      name: formData.get('head_name'),
      email: String(formData.get('head_email') ?? '').trim(),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const result = await inviteHeadTo(
    parsed.data.school_id,
    parsed.data.name,
    parsed.data.email,
    parseDeliver(formData.get('deliver')),
  );
  if (result.error) return { error: result.error };
  revalidatePath('/platform');
  if (result.link) {
    return { ok: true, message: `Send this link to ${parsed.data.email}:`, link: result.link };
  }
  return {
    ok: true,
    message: result.invited
      ? `Invitation email sent to ${parsed.data.email}.`
      : `${parsed.data.email} (already a user) was made head teacher.`,
  };
}
