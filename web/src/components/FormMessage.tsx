import type { ActionState } from '@/lib/action-state';

export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return <p role="alert" className="text-sm text-red-700">{state.error}</p>;
  }
  if (state.message) {
    return <p role="status" className="text-sm text-green-700">{state.message}</p>;
  }
  return null;
}
