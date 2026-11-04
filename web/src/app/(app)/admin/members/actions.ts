'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { functionErrorMessage, inviteLink } from '@/lib/invite-link';
import { invitableRoles } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import type { ActionState } from '@/lib/action-state';

/** Turns the database's short error texts into messages a school administrator can act on. */
function friendly(error: { code?: string; message?: string } | null): string {
  const m = error?.message ?? '';
  if (error?.code === '42501' || m === 'not allowed') return 'You are not allowed to change this member.';
  if (error?.code === '23505') return 'That person already has this role in your school.';
  if (m.includes('your own membership')) return 'You cannot change your own membership.';
  if (m.includes('at least one active head')) return 'A school must keep at least one active head teacher.';
  if (m === 'member not found') return 'That member no longer exists. Refresh the page.';
  return 'Could not update the member.';
}

const idSchema = z.uuid();

export async function updateMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = idSchema.safeParse(formData.get('membership_id'));
  if (!id.success) return { error: 'Invalid member.' };

  const roleRaw = formData.get('role');
  const statusRaw = formData.get('status');
  const role = typeof roleRaw === 'string' && roleRaw !== '' ? roleRaw : null;
  const status = statusRaw === 'active' || statusRaw === 'suspended' ? statusRaw : null;
  if (!role && !status) return { error: 'Nothing to change.' };
  if (role && !(invitableRoles(session.role) as readonly string[]).includes(role)) {
    return { error: 'You cannot assign that role.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('update_member', {
    p_membership_id: id.data,
    p_role: role,
    p_status: status,
  });
  if (error) return { error: friendly(error) };
  revalidatePath('/admin/members');
  return {
    ok: true,
    message: status === 'suspended' ? 'Suspended.' : status === 'active' ? 'Reactivated.' : 'Role updated.',
  };
}

export async function removeMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const id = idSchema.safeParse(formData.get('membership_id'));
  if (!id.success) return { error: 'Invalid member.' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('remove_member', { p_membership_id: id.data });
  if (error) return { error: friendly(error) };
  revalidatePath('/admin/members');
  return { ok: true, message: 'Removed.' };
}

/** New one-time setup link for someone who never chose a password (the Edge Function enforces who qualifies). */
export async function memberSetupLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const id = idSchema.safeParse(formData.get('membership_id'));
  if (!id.success) return { error: 'Invalid member.' };

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: { action: 'reissue_link', membership_id: id.data },
  });
  if (error) return { error: await functionErrorMessage(error, 'Could not create the setup link.') };

  const tokenHash = typeof data?.token_hash === 'string' ? data.token_hash : null;
  if (!tokenHash) return { error: 'Could not create the setup link.' };
  return { ok: true, message: 'Send this setup link to the person:', link: await inviteLink(tokenHash, 'recovery') };
}
