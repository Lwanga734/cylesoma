export type AuthHash =
  | { kind: 'session'; accessToken: string; refreshToken: string; type: string | null }
  | { kind: 'error' }
  | null;

/**
 * Supabase's default invitation / reset emails send people back with the sign-in tokens in the
 * address bar after a "#" (e.g. /login#access_token=...&type=invite). Servers never see that part,
 * so the browser has to read it. Returns null when the address has no auth data.
 */
export function parseAuthHash(hash: string): AuthHash {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (params.get('error') || params.get('error_description') || params.get('error_code')) {
    return { kind: 'error' };
  }
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    return { kind: 'session', accessToken, refreshToken, type: params.get('type') };
  }
  if (accessToken) return { kind: 'error' };
  return null;
}

/** New and reset accounts must choose a password before anything else. */
export function destinationAfterAuth(type: string | null): string {
  return type === 'invite' || type === 'recovery' ? '/set-password' : '/';
}
