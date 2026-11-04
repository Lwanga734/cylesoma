import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export type School = {
  id: string;
  name: string;
  motto: string | null;
  primary_color: string;
  logo_path: string | null;
};
export type Term = {
  id: string;
  name: string;
  year: number;
  starts_on: string;
  ends_on: string;
  is_current: boolean;
};
export type Membership = { school_id: string; role: string; schools: { name: string } | null };

export const getSchool = cache(async (schoolId: string): Promise<School | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('schools')
    .select('id, name, motto, primary_color, logo_path')
    .eq('id', schoolId)
    .maybeSingle();
  return (data as School | null) ?? null;
});

export async function getTerms(): Promise<Term[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('terms')
    .select('id, name, year, starts_on, ends_on, is_current')
    .order('starts_on', { ascending: false });
  return (data as Term[] | null) ?? [];
}

export async function getMemberships(userId: string): Promise<Membership[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('memberships')
    .select('school_id, role, schools(name)')
    .eq('user_id', userId)
    .eq('status', 'active');
  return (data as unknown as Membership[] | null) ?? [];
}

export type Member = {
  membership_id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
  created_at: string;
  last_sign_in_at: string | null;
  password_set: boolean;
  invited_by_email: string | null;
  is_self: boolean;
};

/** The people this manager may see and manage in their school (the database decides which). */
export async function getSchoolMembers(): Promise<{ members: Member[]; failed: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('school_members');
  if (error) return { members: [], failed: true };
  return { members: (data as Member[] | null) ?? [], failed: false };
}
