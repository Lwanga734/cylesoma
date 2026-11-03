'use server';

import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { friendlyInviteError, inviteLink } from '@/lib/invite-link';
import { invitableRoles, roleLabel } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import type { ActionState } from '@/lib/action-state';

const inviteSchema = z.object({
  full_name: z.string().trim().min(1, 'Enter the full name.').max(120),
  email: z.email('Enter a valid email.'),
  role: z.string().min(1, 'Choose a role.'),
});

export async function inviteUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const raw = {
    full_name: String(formData.get('full_name') ?? ''),
    email: String(formData.get('email') ?? '').trim(),
    role: String(formData.get('role') ?? ''),
  };
  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.', values: raw };
  if (!(invitableRoles(session.role) as readonly string[]).includes(parsed.data.role)) {
    return { error: 'You cannot invite this role.', values: raw };
  }
  const deliver = formData.get('deliver') === 'email' ? 'email' : 'link';

  // The Edge Function re-checks everything and takes the school from the caller's JWT.
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: { ...parsed.data, deliver },
  });
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
    return { error: friendlyInviteError(message), values: raw };
  }

  const email = parsed.data.email;
  const label = roleLabel(parsed.data.role);
  const tokenHash = typeof data?.token_hash === 'string' ? data.token_hash : null;
  if (tokenHash) {
    return { ok: true, message: `${email} was added as ${label}. Send them this link:`, link: await inviteLink(tokenHash) };
  }
  if (data?.invited === true) {
    return { ok: true, message: `Invitation email sent to ${email} (${label}).` };
  }
  return {
    ok: true,
    message: `No email was sent because ${email} already has a CyleSoma account. They were added to your school as ${label} and can switch to it from Profile.`,
  };
}
