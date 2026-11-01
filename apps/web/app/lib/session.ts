// Single-user passcode auth. The cookie holds an HMAC of a fixed label keyed by
// ATHENA_PASSCODE, so changing the passcode signs everyone out. Web Crypto only,
// so it runs in both the proxy and server actions. With no passcode set
// (local dev), auth is off.

export const SESSION_COOKIE = 'athena_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

export const authEnabled = () => !!process.env.ATHENA_PASSCODE;

export async function sessionToken(passcode = process.env.ATHENA_PASSCODE ?? ''): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(passcode), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('athena-session-v1'));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidSession(cookie: string | undefined): Promise<boolean> {
  if (!authEnabled()) return true;
  return !!cookie && safeEqual(cookie, await sessionToken());
}
