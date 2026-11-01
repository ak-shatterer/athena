'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { safeEqual, SESSION_COOKIE, SESSION_MAX_AGE, sessionToken } from './session';

export async function login(_: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  const passcode = String(form.get('passcode') ?? '');
  const expected = process.env.ATHENA_PASSCODE ?? '';
  // Compare HMACs rather than raw strings so timing doesn't leak the length.
  if (!expected || !safeEqual(await sessionToken(passcode), await sessionToken(expected))) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return { error: 'That passcode is not right.' };
  }
  (await cookies()).set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
  const next = String(form.get('next') ?? '/');
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}
