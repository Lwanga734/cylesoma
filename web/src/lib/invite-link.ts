import { headers } from 'next/headers';

/** Builds the one-time setup link from the address the inviter is using right now. */
export async function inviteLink(tokenHash: string, type: 'invite' | 'recovery' = 'invite'): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${type}&next=%2Fset-password`;
}

/** Turns the Edge Function's terse errors into something a school administrator can act on. */
export function friendlyInviteError(message: string): string {
  if (message === 'could not send invitation email') {
    return 'The email could not be sent (email sending may not be set up yet). Choose "Make a link I can share" instead.';
  }
  return message;
}

/** Reads the `error` text our Edge Function returns, falling back to a generic message. */
export async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = (await context.json()) as { error?: unknown } | null;
      if (typeof body?.error === 'string') return friendlyInviteError(body.error);
    } catch {
      /* keep fallback */
    }
  }
  return fallback;
}
