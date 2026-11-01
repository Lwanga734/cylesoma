export const SCHOOL_ROLES = [
  'owner', 'head', 'deputy', 'hod', 'bursar', 'registrar', 'hr', 'teacher',
  'librarian', 'nurse', 'storekeeper', 'boarding', 'transport', 'parent', 'student',
] as const;
export type SchoolRole = (typeof SCHOOL_ROLES)[number];

export type Section = 'admin' | 'teacher' | 'parent' | 'student' | 'platform';

/** Which section each role lands in. Staff roles share /admin for now. */
export function homeForRole(role: string | null | undefined): string {
  switch (role) {
    case null:
    case undefined:
    case '':
      return '/no-access';
    case 'parent':
      return '/parent';
    case 'student':
      return '/student';
    case 'teacher':
      return '/teacher';
    default:
      return '/admin';
  }
}

/** Where a signed-in user lands. Platform super admins always land on /platform. */
export function landingPath(role: string | null | undefined, isPlatformAdmin = false): string {
  return isPlatformAdmin ? '/platform' : homeForRole(role);
}

/**
 * UI mirror of supabase/functions/invite-user/roles.ts. The Edge Function is the real
 * enforcement; a unit test keeps the two in sync.
 */
const INVITE_MATRIX: Record<string, readonly SchoolRole[]> = {
  head: SCHOOL_ROLES,
  registrar: ['parent', 'student'],
  hr: ['teacher', 'librarian', 'nurse', 'storekeeper', 'boarding', 'transport'],
};

export function invitableRoles(callerRole: string | null | undefined): readonly SchoolRole[] {
  return INVITE_MATRIX[callerRole ?? ''] ?? [];
}

export function roleLabel(role: string | null | undefined): string {
  switch (role) {
    case null:
    case undefined:
    case '':
      return 'Unknown';
    case 'hod':
      return 'Head of department';
    case 'hr':
      return 'HR officer';
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
}
