// Pure helpers (no network) so they can be unit-tested with `deno test`.

export const SCHOOL_ROLES = [
  'owner', 'head', 'deputy', 'hod', 'bursar', 'registrar', 'hr', 'teacher',
  'librarian', 'nurse', 'storekeeper', 'boarding', 'transport', 'parent', 'student',
] as const;
export type SchoolRole = typeof SCHOOL_ROLES[number];

// Who may invite whom. 'platform_admin' can never be granted from inside a school.
const INVITE_MATRIX: Record<string, readonly SchoolRole[]> = {
  head: SCHOOL_ROLES,
  registrar: ['parent', 'student'],
  hr: ['teacher', 'librarian', 'nurse', 'storekeeper', 'boarding', 'transport'],
};

export function invitableRoles(callerRole: string | null | undefined): readonly SchoolRole[] {
  return INVITE_MATRIX[callerRole ?? ''] ?? [];
}

export function canInvite(callerRole: string | null | undefined, target: string): boolean {
  return (invitableRoles(callerRole) as readonly string[]).includes(target);
}

export function isValidEmail(s: unknown): s is string {
  return typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function isUuid(s: unknown): s is string {
  return typeof s === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split('.')[1];
  if (!part) return {};
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  try {
    return JSON.parse(atob(b64));
  } catch {
    return {};
  }
}
