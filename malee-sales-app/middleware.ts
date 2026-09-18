import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE, tokenLooksValid } from '@/lib/auth';

/**
 * Sends anyone without a session cookie to the login page.
 *
 * This is navigation UX only: it checks that a token exists and has not expired, not that it
 * is genuine. The backend verifies the HMAC on every API call, so a forged cookie buys an
 * empty page shell whose every request comes back 401.
 */
export function middleware(request: NextRequest) {
    if (tokenLooksValid(request.cookies.get(AUTH_COOKIE)?.value)) return NextResponse.next();

    const login = new URL('/login', request.url);
    login.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
}

export const config = {
    // everything except the login page itself, Next's own assets, and static files
    matcher: ['/((?!login|api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|xlsx|csv)$).*)'],
};
