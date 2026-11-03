import { describe, expect, it } from 'vitest';
import { destinationAfterAuth, parseAuthHash } from './auth-hash';

describe('parseAuthHash', () => {
  it('reads an invitation redirect', () => {
    const r = parseAuthHash('#access_token=abc&refresh_token=def&expires_in=3600&token_type=bearer&type=invite');
    expect(r).toEqual({ kind: 'session', accessToken: 'abc', refreshToken: 'def', type: 'invite' });
  });
  it('treats error redirects and half-complete tokens as errors', () => {
    expect(parseAuthHash('#error=access_denied&error_code=otp_expired&error_description=expired')).toEqual({ kind: 'error' });
    expect(parseAuthHash('#access_token=abc&type=invite')).toEqual({ kind: 'error' });
  });
  it('ignores ordinary addresses', () => {
    expect(parseAuthHash('')).toBeNull();
    expect(parseAuthHash('#section-2')).toBeNull();
  });
});

describe('destinationAfterAuth', () => {
  it('sends invited and reset users to choose a password', () => {
    expect(destinationAfterAuth('invite')).toBe('/set-password');
    expect(destinationAfterAuth('recovery')).toBe('/set-password');
    expect(destinationAfterAuth(null)).toBe('/');
    expect(destinationAfterAuth('magiclink')).toBe('/');
  });
});
