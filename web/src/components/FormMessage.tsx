'use client';

import { useState } from 'react';
import type { ActionState } from '@/lib/action-state';

export function FormMessage({ state }: { state: ActionState }) {
  const [copied, setCopied] = useState(false);

  if (state.error) {
    return <p role="alert" className="text-sm text-red-700">{state.error}</p>;
  }
  if (!state.message) return null;

  return (
    <div role="status" className="space-y-2">
      <p className="text-sm text-green-700">{state.message}</p>
      {state.link && (
        <>
          <div className="flex gap-2">
            <input
              readOnly
              value={state.link}
              aria-label="Invitation link"
              onFocus={(e) => e.currentTarget.select()}
              className="input"
            />
            <button
              type="button"
              className="btn-secondary shrink-0"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(state.link!);
                  setCopied(true);
                } catch {
                  /* the field is selectable, so it can still be copied by hand */
                }
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-slate-600">
            Send this to the head teacher yourself, for example on WhatsApp. It is for one person only and
            expires, and they choose their own password. Do not post it anywhere public.
          </p>
        </>
      )}
    </div>
  );
}
