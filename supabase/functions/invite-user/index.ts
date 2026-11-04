// Invites a user into a school with a role, or re-issues a setup link for someone who never chose a password.
// - School staff: the school ALWAYS comes from the caller's verified JWT, never from the request body.
// - Platform super admins (rows in public.platform_admins): may name any school, but only to bootstrap
//   its leadership (head or owner).
// - Any permitted inviter may ask for `deliver: 'link'`: for a NEW account the user is created and a one-time
//   token is returned instead of sending an email (to share by WhatsApp, or while email is not set up).
//   Existing accounts are only added to the school; no link or email is ever produced for them.
// - `action: 'reissue_link'` (see below) creates a fresh link ONLY for an account that has never set a password
//   and belongs to no other school.
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

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'invalid json' }, 400); }

  // 2. Privileged client + platform-admin check.
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: platformRow } = await admin
    .from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  const isPlatformAdmin = !!platformRow;

  // ---- Re-issue a setup link for an existing member who never chose a password ----
  if (body.action === 'reissue_link') {
    if (!isUuid(body.membership_id)) return json({ error: 'membership_id required' }, 400);
    const { data: m } = await admin
      .from('memberships').select('user_id, school_id, role, status').eq('id', body.membership_id).maybeSingle();
    if (!m) return json({ error: 'member not found' }, 404);

    const sameSchool = isUuid(claims.school_id) && m.school_id === claims.school_id;
    const allowed = (sameSchool && canInvite(callerRole, m.role)) ||
      (isPlatformAdmin && canPlatformInvite(m.role));
    if (!allowed) return json({ error: 'you cannot manage this member' }, 403);
    if (m.user_id === user.id) return json({ error: 'you cannot create a setup link for yourself' }, 403);
    if (m.status !== 'active') return json({ error: 'this member is suspended; reactivate them first' }, 409);

    const { data: eligible } = await admin.rpc('can_reissue_link', { p_user_id: m.user_id, p_school_id: m.school_id });
    if (eligible !== true) {
      return json({ error: 'this person has already set a password (or belongs to another school), so no setup link can be made. Ask them to use "Forgot your password?"' }, 409);
    }
    const { data: target } = await admin.auth.admin.getUserById(m.user_id);
    const targetEmail = target?.user?.email;
    if (!targetEmail) return json({ error: 'member not found' }, 404);

    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: 'recovery', email: targetEmail });
    if (linkErr || !link?.properties?.hashed_token) return json({ error: 'could not create the setup link' }, 502);
    return json({ token_hash: link.properties.hashed_token, type: 'recovery' });
  }

  // ---- Invite (create or add) a member ----
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim().slice(0, 120) : '';
  const role = typeof body.role === 'string' ? body.role : '';
  if (!isValidEmail(email)) return json({ error: 'invalid email' }, 400);
  if (!fullName) return json({ error: 'full name required' }, 400);

  // Decide which school and whether this caller may grant this role there.
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

  // Create or find the user, then add the membership.
  // 'link' delivery sends no email. Whoever holds the link can set the new account's password, so it is
  // only ever created for brand-new accounts (see below), never for someone who already has an account.
  const deliver = body.deliver === 'link' ? 'link' : 'email';
  const { data: existingId } = await admin.rpc('find_user_id_by_email', { p_email: email });
  let userId = existingId as string | null;
  let invited = false;
  let tokenHash: string | null = null;

  if (!userId) {
    if (deliver === 'link') {
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: { data: { full_name: fullName } },
      });
      if (error || !data?.user || !data.properties?.hashed_token) {
        return json({ error: 'could not create the invitation link' }, 502);
      }
      userId = data.user.id;
      tokenHash = data.properties.hashed_token;
      invited = true;
    } else {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
        redirectTo: Deno.env.get('INVITE_REDIRECT_URL') ?? undefined,
      });
      if (error || !data.user) return json({ error: 'could not send invitation email' }, 502);
      userId = data.user.id;
      invited = true;
    }
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
  return json({ user_id: userId, invited, ...(tokenHash ? { token_hash: tokenHash } : {}) });
});
