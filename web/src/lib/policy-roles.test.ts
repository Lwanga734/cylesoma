import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { canManageClasses, canManageStudents, CLASS_WRITE_ROLES, STUDENT_WRITE_ROLES } from './roles';

// Keeps the role lists in the app in step with the database write policies (migration 8).
const sql = readFileSync(
  fileURLToPath(new URL('../../../supabase/migrations/20261104000008_fix_write_policy_roles.sql', import.meta.url)),
  'utf8',
);
const rolesIn = (policy: string): string[] => {
  const block = sql.split(`create policy ${policy} `)[1]?.split(';')[0] ?? '';
  const m = /has_role\(array\[([^\]]*)\]\)/.exec(block);
  return m ? m[1].split(',').map((r) => r.trim().replace(/'/g, '')).sort() : [];
};

describe('app role lists match database write policies', () => {
  it('classes', () => expect([...CLASS_WRITE_ROLES].sort()).toEqual(rolesIn('classes_write')));
  it('students', () => expect([...STUDENT_WRITE_ROLES].sort()).toEqual(rolesIn('students_write')));
  it('helpers use the lists', () => {
    expect(canManageStudents('registrar')).toBe(true);
    expect(canManageStudents('deputy')).toBe(false);
    expect(canManageClasses('deputy')).toBe(true);
    expect(canManageClasses('teacher')).toBe(false);
    expect(canManageClasses(null)).toBe(false);
  });
});
