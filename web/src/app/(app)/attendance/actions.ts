'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSection } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const integrationSchema = z.object({
  base_url: z.url().refine((v) => /^https?:\/\//i.test(v), 'Enter an http:// or https:// BioTime URL.'),
  api_username: z.string().trim().min(1).max(120),
});

const deviceSchema = z.object({
  integration_id: z.uuid(),
  terminal_sn: z.string().trim().min(1).max(120),
  terminal_alias: z.string().trim().max(120).optional(),
  location_type: z.enum(['school_entry', 'classroom_entry', 'school_exit', 'unassigned']),
  class_id: z.string().optional(),
});

async function manager() {
  const session = await requireSection('admin');
  if (!session.schoolId || !['owner', 'head', 'deputy'].includes(session.role ?? '')) {
    throw new Error('Only the school owner, head or deputy may configure biometric attendance.');
  }
  return session;
}

export async function saveIntegration(formData: FormData) {
  const session = await manager();
  const parsed = integrationSchema.safeParse({
    base_url: String(formData.get('base_url') ?? '').trim().replace(/\/$/, ''),
    api_username: String(formData.get('api_username') ?? '').trim(),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid BioTime settings.');

  const supabase = await createClient();
  const { data: existing, error: lookupError } = await supabase
    .from('attendance_integrations')
    .select('id')
    .eq('school_id', session.schoolId!)
    .eq('provider', 'biotime_8_5')
    .maybeSingle();
  if (lookupError) throw new Error('Could not check the existing BioTime connection.');

  const values = { ...parsed.data, timezone: 'Africa/Kampala', is_active: true };
  const result = existing
    ? await supabase.from('attendance_integrations').update(values).eq('id', existing.id).select('id').single()
    : await supabase.from('attendance_integrations').insert({
        ...values, school_id: session.schoolId!, provider: 'biotime_8_5', created_by: session.userId,
      }).select('id').single();
  if (result.error) throw new Error('Could not save BioTime connection. Check the URL and your permissions.');
  revalidatePath('/attendance');
}

export async function saveDevice(formData: FormData) {
  const session = await manager();
  const parsed = deviceSchema.safeParse({
    integration_id: String(formData.get('integration_id') ?? ''),
    terminal_sn: String(formData.get('terminal_sn') ?? ''),
    terminal_alias: String(formData.get('terminal_alias') ?? ''),
    location_type: String(formData.get('location_type') ?? 'unassigned'),
    class_id: String(formData.get('class_id') ?? '') || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid terminal details.');

  const supabase = await createClient();
  const { error } = await supabase.from('attendance_devices').insert({
    integration_id: parsed.data.integration_id,
    school_id: session.schoolId!,
    terminal_sn: parsed.data.terminal_sn,
    terminal_alias: parsed.data.terminal_alias || null,
    location_type: parsed.data.location_type,
    class_id: parsed.data.class_id || null,
    model: 'ZKTeco F18',
    is_active: true,
  });
  if (error) throw new Error('Could not register terminal. Check its serial number and selected class.');
  revalidatePath('/attendance');
}

export type TokenActionState = { token?: string; error?: string };

export async function rotateConnectorToken(): Promise<TokenActionState> {
  try {
    const session = await manager();
    const supabase = await createClient();
    const { data: integration, error: lookupError } = await supabase
      .from('attendance_integrations')
      .select('id')
      .eq('school_id', session.schoolId!)
      .eq('provider', 'biotime_8_5')
      .maybeSingle();
    if (lookupError || !integration) return { error: 'Save the BioTime connection before generating a connector token.' };

    const { data, error } = await supabase.rpc('rotate_attendance_connector_token', {
      p_integration_id: integration.id,
    });
    if (error || typeof data !== 'string') return { error: 'Could not generate the connector token. Check your permissions.' };
    revalidatePath('/attendance');
    return { token: data };
  } catch {
    return { error: 'You are not authorised to rotate this connector token.' };
  }
}
