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
