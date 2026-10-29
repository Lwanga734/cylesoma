import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { homeForRole, type Section } from '@/lib/roles';

export type Session = {
  userId: string;
  email: string | null;
  schoolId: string | null;
  role: string | null;
};

/** Verified identity + school/role claims (added to the JWT by the custom access token hook). */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  const c = data.claims as Record<string, unknown>;
  return {
    userId: String(c.sub),
    email: typeof c.email === 'string' ? c.email : null,
    schoolId: typeof c.school_id === 'string' ? c.school_id : null,
    role: typeof c.user_role === 'string' ? c.user_role : null,
  };
});

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

/** UI-level guard. The database (RLS) is the real security boundary. */
export async function requireSection(section: Section): Promise<Session> {
  const session = await requireSession();
  const home = homeForRole(session.role);
  if (home !== `/${section}`) redirect(home);
  return session;
}
