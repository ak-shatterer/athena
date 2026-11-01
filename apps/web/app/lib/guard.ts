import 'server-only';
import { cookies } from 'next/headers';
import { isValidSession, SESSION_COOKIE } from './session';

// Kept out of the 'use server' files so it isn't exposed as an action itself.
export async function requireSession() {
  if (!(await isValidSession((await cookies()).get(SESSION_COOKIE)?.value))) throw new Error('Not signed in');
}
