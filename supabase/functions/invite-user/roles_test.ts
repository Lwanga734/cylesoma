import { canInvite, canPlatformInvite, decodeJwtPayload, invitableRoles, isUuid, isValidEmail } from './roles.ts';

function check(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

Deno.test('head can invite every school role but never platform_admin', () => {
  check(canInvite('head', 'teacher'), 'head->teacher');
  check(canInvite('head', 'parent'), 'head->parent');
  check(!canInvite('head', 'platform_admin'), 'head must not grant platform_admin');
});

Deno.test('registrar invites only parents and students', () => {
  check(canInvite('registrar', 'parent'), 'registrar->parent');
  check(canInvite('registrar', 'student'), 'registrar->student');
  check(!canInvite('registrar', 'teacher'), 'registrar must not invite teachers');
  check(!canInvite('registrar', 'head'), 'registrar must not invite heads');
});

Deno.test('hr invites staff but not leadership or finance', () => {
  check(canInvite('hr', 'teacher'), 'hr->teacher');
  check(!canInvite('hr', 'head'), 'hr must not invite head');
  check(!canInvite('hr', 'bursar'), 'hr must not invite bursar');
});

Deno.test('other roles and missing roles invite nobody', () => {
  check(invitableRoles('teacher').length === 0, 'teacher');
  check(invitableRoles('parent').length === 0, 'parent');
  check(invitableRoles(null).length === 0, 'null');
  check(invitableRoles(undefined).length === 0, 'undefined');
});

Deno.test('email and uuid validation', () => {
  check(isValidEmail('a@b.co'), 'valid email');
  check(!isValidEmail('not-an-email'), 'invalid email');
  check(!isValidEmail(42), 'non-string email');
  check(isUuid('11111111-1111-1111-1111-111111111111'), 'valid uuid');
  check(!isUuid('nope'), 'invalid uuid');
});

Deno.test('decodeJwtPayload reads base64url claims and tolerates junk', () => {
  const payload = btoa(JSON.stringify({ school_id: 's1', user_role: 'head' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const claims = decodeJwtPayload(`h.${payload}.sig`);
  check(claims.school_id === 's1' && claims.user_role === 'head', 'claims decoded');
  check(Object.keys(decodeJwtPayload('garbage')).length === 0, 'garbage -> empty');
});

Deno.test('platform admins can bootstrap a head or owner but nothing else', () => {
  check(canPlatformInvite('head'), 'platform->head');
  check(canPlatformInvite('owner'), 'platform->owner');
  check(!canPlatformInvite('teacher'), 'platform must not invite teachers');
  check(!canPlatformInvite('parent'), 'platform must not invite parents');
  check(!canPlatformInvite('platform_admin'), 'platform_admin can never be granted by invitation');
});
