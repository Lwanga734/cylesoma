import { headers } from 'next/headers';

/** Builds the one-time sign-in link from the address the inviter is using right now. */
export async function inviteLink(tokenHash: string): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=invite&next=%2Fset-password`;
}

/** Turns the Edge Function's terse errors into something a school administrator can act on. */
export function friendlyInviteError(message: string): string {
  if (message === 'could not send invitation email') {
    return 'The email could not be sent (email sending may not be set up yet). Choose "Make a link I can share" instead.';
  }
  return message;
}
