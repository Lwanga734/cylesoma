// Invites a user into a school with a role.
// - School staff: the school ALWAYS comes from the caller's verified JWT, never from the request body.
// - Platform super admins (rows in public.platform_admins): may name any school, but only to bootstrap
//   its leadership (head or owner).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { canInvite, canPlatformInvite, decodeJwtPayload, isUuid, isValidEmail } from './roles.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization') ?? '';

  // 1. Identify the caller (server-verified), then read school/role claims from the same token.
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await caller.auth.getUser();
  if (userErr || !user) return json({ error: 'unauthorized' }, 401);

  const claims = decodeJwtPayload(authHeader.replace(/^Bearer\s+/i, ''));
  const callerRole = typeof claims.user_role === 'string' ? claims.user_role : null;

  // 2. Validate input.
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'invalid json' }, 400); }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim().slice(0, 120) : '';
  const role = typeof body.role === 'string' ? body.role : '';
  if (!isValidEmail(email)) return json({ error: 'invalid email' }, 400);
  if (!fullName) return json({ error: 'full name required' }, 400);

  // 3. Privileged work with the service role.
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: platformRow } = await admin
    .from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  const isPlatformAdmin = !!platformRow;

  // 4. Decide which school and whether this caller may grant this role there.
  let schoolId: string;
  if (isPlatformAdmin && isUuid(body.school_id)) {
    if (!canPlatformInvite(role)) {
      return json({ error: 'platform admins can only invite a head teacher or owner' }, 403);
    }
    const { data: school } = await admin.from('schools').select('id').eq('id', body.school_id).maybeSingle();
    if (!school) return json({ error: 'school not found' }, 404);
    schoolId = body.school_id;
  } else {
    const claimSchool = claims.school_id;
    if (!isUuid(claimSchool)) return json({ error: 'no active school' }, 403);
    if (!canInvite(callerRole, role)) return json({ error: 'you cannot invite this role' }, 403);
    schoolId = claimSchool;
  }

  // 5. Create or find the user, then add the membership.
  const { data: existingId } = await admin.rpc('find_user_id_by_email', { p_email: email });
  let userId = existingId as string | null;
  let invited = false;

  if (!userId) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: Deno.env.get('INVITE_REDIRECT_URL') ?? undefined,
    });
    if (error || !data.user) return json({ error: 'could not send invitation' }, 502);
    userId = data.user.id;
    invited = true;
  }

  // Create the profile if missing; never overwrite an existing user's active school or name.
  await admin.from('profiles').upsert(
    { user_id: userId, full_name: fullName, active_school_id: schoolId },
    { onConflict: 'user_id', ignoreDuplicates: true },
  );

  const { error: memErr } = await admin.from('memberships').insert({
    user_id: userId, school_id: schoolId, role, status: 'active', invited_by: user.id,
  });
  if (memErr) {
    if (memErr.code === '23505') return json({ error: 'already has this role in this school' }, 409);
    return json({ error: 'could not add member' }, 500);
  }
  return json({ user_id: userId, invited });
});
