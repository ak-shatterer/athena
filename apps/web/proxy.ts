import { NextResponse, type NextRequest } from 'next/server';
import { isValidSession, SESSION_COOKIE } from './app/lib/session';

// Sends anyone without a session to /login. Server actions check again
// themselves (requireSession), since this is only a first line of defence.
export async function proxy(request: NextRequest) {
  if (await isValidSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith('/api/')) return new NextResponse('Unauthorized', { status: 401 });
  const login = new URL('/login', request.url);
  login.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!login|_next/static|_next/image|icon.svg|manifest.webmanifest|favicon.ico).*)'],
};
