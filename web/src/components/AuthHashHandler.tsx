'use client';

import { useEffect, useState } from 'react';
import { destinationAfterAuth, parseAuthHash } from '@/lib/auth-hash';
import { createClient } from '@/lib/supabase/client';

const BAD_LINK =
  'That link is invalid or has expired. Ask your administrator for a new invitation, or use "Forgot your password?" on the sign-in page.';

/**
 * Finishes sign-in for emails that return with tokens in the address bar (Supabase's default invite and
 * reset emails). Runs on every page, removes the tokens from the address immediately, stores the session,
 * and sends new or reset users to choose their password.
 */
export function AuthHashHandler() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const parsed = parseAuthHash(window.location.hash);
    if (!parsed) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (parsed.kind === 'error') {
      setMessage(BAD_LINK);
      return;
    }
    createClient()
      .auth.setSession({ access_token: parsed.accessToken, refresh_token: parsed.refreshToken })
      .then(({ error }) => {
        if (error) setMessage(BAD_LINK);
        else window.location.replace(destinationAfterAuth(parsed.type));
      })
      .catch(() => setMessage(BAD_LINK));
  }, []);

  if (!message) return null;
  return (
    <p role="alert" className="mx-auto mt-4 max-w-md rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      {message}
    </p>
  );
}
