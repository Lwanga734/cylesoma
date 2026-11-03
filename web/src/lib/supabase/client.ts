import { createBrowserClient } from '@supabase/ssr';
import { supabaseEnv } from './env';

/** Browser-side client. Used only to turn sign-in tokens from an email link into a session cookie. */
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
