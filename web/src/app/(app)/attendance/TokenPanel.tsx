'use client';

import { useActionState } from 'react';
import { rotateConnectorToken, type TokenActionState } from './actions';

const initialState: TokenActionState = {};

export function TokenPanel() {
  const [state, action, pending] = useActionState(rotateConnectorToken, initialState);
  return (
    <section className="card space-y-3">
      <div>
        <h2 className="font-semibold">Secure bridge token</h2>
        <p className="text-sm text-slate-600">
          Generate a token for the CyleSoma Bridge running beside BioTime. The token is shown once; copy it into the
          bridge's local environment file and never share it in screenshots or messages.
        </p>
      </div>
      <form action={action}>
        <button className="btn-secondary" type="submit" disabled={pending}>
          {pending ? 'Generating…' : 'Generate / rotate token'}
        </button>
      </form>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.token && (
        <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">Copy this token now. It will not be shown again.</p>
          <code className="block break-all rounded bg-white p-3 text-xs text-slate-900">{state.token}</code>
          <button type="button" className="btn-secondary" onClick={() => navigator.clipboard.writeText(state.token!)}>
            Copy token
          </button>
        </div>
      )}
    </section>
  );
}
