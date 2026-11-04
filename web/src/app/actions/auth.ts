'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { ActionState } from '@/lib/action-state';

const signInSchema = z.object({ email: z.email(), password: z.string().min(1) });

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
  });
  if (!parsed.success) return { error: 'Enter a valid email and your password.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: 'Sign-in failed. Check your email and password.' };
  redirect('/');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.email().safeParse(String(formData.get('email') ?? '').trim());
  if (parsed.success) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data);
  }
  // Same answer either way, so the form cannot be used to discover which emails have accounts.
  return { ok: true, message: 'If that email has an account, a reset link has been sent.' };
}

const passwordSchema = z
  .object({ password: z.string().min(8, 'Use at least 8 characters.'), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'Passwords do not match.', path: ['confirm'] });

export async function setPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = passwordSchema.safeParse({
    password: String(formData.get('password') ?? ''),
    confirm: String(formData.get('confirm') ?? ''),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid password.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: 'Could not save the password. Try again.' };

  // Remember that this person has chosen a password, so nobody can re-issue a setup link for the account.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (typeof userId === 'string') {
    await supabase
      .from('profiles')
      .upsert({ user_id: userId, password_set_at: new Date().toISOString() }, { onConflict: 'user_id' });
  }
  redirect('/');
}
