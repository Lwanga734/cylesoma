import { describe, expect, it } from 'vitest';
import { invitableRoles as edgeInvitable } from '../../../supabase/functions/invite-user/roles.ts';
import { homeForRole, invitableRoles, roleLabel } from './roles';

describe('homeForRole', () => {
  it('routes each role to its section', () => {
    expect(homeForRole('teacher')).toBe('/teacher');
    expect(homeForRole('parent')).toBe('/parent');
    expect(homeForRole('student')).toBe('/student');
    expect(homeForRole('head')).toBe('/admin');
    expect(homeForRole('bursar')).toBe('/admin');
  });
  it('sends users without a role to /no-access', () => {
    expect(homeForRole(null)).toBe('/no-access');
    expect(homeForRole(undefined)).toBe('/no-access');
    expect(homeForRole('')).toBe('/no-access');
  });
});

describe('invitableRoles', () => {
  it('matches the Edge Function rules for every caller role', () => {
    for (const caller of ['head', 'registrar', 'hr', 'teacher', 'parent', 'bursar', null]) {
      expect([...invitableRoles(caller)].sort()).toEqual([...edgeInvitable(caller)].sort());
    }
  });
  it('never offers platform_admin', () => {
    expect(invitableRoles('head') as readonly string[]).not.toContain('platform_admin');
  });
});

describe('roleLabel', () => {
  it('formats labels', () => {
    expect(roleLabel('teacher')).toBe('Teacher');
    expect(roleLabel('hod')).toBe('Head of department');
    expect(roleLabel(null)).toBe('Unknown');
  });
});

describe('landingPath', () => {
  it('sends platform admins to /platform and everyone else by role', async () => {
    const { landingPath } = await import('./roles');
    expect(landingPath(null, true)).toBe('/platform');
    expect(landingPath('teacher', true)).toBe('/platform');
    expect(landingPath('teacher', false)).toBe('/teacher');
    expect(landingPath(null, false)).toBe('/no-access');
  });
});
