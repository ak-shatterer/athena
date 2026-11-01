'use client';
import { useActionState } from 'react';
import { login } from '../lib/auth';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="mt-8 flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <input
        name="passcode"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        placeholder="Passcode"
        aria-label="Passcode"
        className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-lg outline-none focus:border-white/50"
      />
      {state?.error && <p className="text-sm font-semibold text-rose-400">{state.error}</p>}
      <button disabled={pending} className="rounded-full bg-white py-3.5 font-extrabold text-black disabled:opacity-50">
        {pending ? 'Checking…' : 'Sign in'}
      </button>
    </form>
  );
}
