'use server';

import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { invitableRoles } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import type { ActionState } from '@/lib/action-state';

const inviteSchema = z.object({
  full_name: z.string().trim().min(1, 'Enter the full name.').max(120),
  email: z.email('Enter a valid email.'),
  role: z.string().min(1, 'Choose a role.'),
});

export async function inviteUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const parsed = inviteSchema.safeParse({
    full_name: formData.get('full_name'),
    email: String(formData.get('email') ?? '').trim(),
    role: formData.get('role'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  if (!(invitableRoles(session.role) as readonly string[]).includes(parsed.data.role)) {
    return { error: 'You cannot invite this role.' };
  }

  // The Edge Function re-checks everything and takes the school from the caller's JWT.
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke('invite-user', { body: parsed.data });
  if (error) {
    let message = 'Invitation failed.';
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        if (typeof body?.error === 'string') message = body.error;
      } catch {
        /* keep generic message */
      }
    }
    return { error: message };
  }
  const email = parsed.data.email;
  return {
    ok: true,
    message: data?.invited ? `Invitation sent to ${email}.` : `${email} already has an account and was added.`,
  };
}
