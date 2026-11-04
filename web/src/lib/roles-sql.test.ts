import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { invitableRoles } from './roles';

// The member-management rules exist in three places (SQL, the Edge Function, the web app).
// This test keeps the SQL copy and the web copy in step.
const sql = readFileSync(
  fileURLToPath(new URL('../../../supabase/migrations/20261103000005_member_management.sql', import.meta.url)),
  'utf8',
);

describe('manageable_roles in SQL matches the web invite matrix', () => {
  const found = [...sql.matchAll(/when '(\w+)' then array\[([^\]]*)\]/g)];

  it('finds the three manager roles', () => {
    expect(found.map((m) => m[1]).sort()).toEqual(['head', 'hr', 'registrar']);
  });

  for (const match of found) {
    it(`${match[1]} manages the same roles in SQL and in the app`, () => {
      const sqlRoles = match[2].split(',').map((r) => r.trim().replace(/'/g, '')).sort();
      expect([...invitableRoles(match[1])].sort()).toEqual(sqlRoles);
    });
  }
});
