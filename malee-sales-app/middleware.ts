import { NextResponse, type NextRequest } from 'next/server';

/**
 * Sends anyone without a session cookie to the login page.
 *
 * This is navigation UX only: it checks that a token exists and has not expired, not that it is
 * genuine. The backend verifies the HMAC on every API call, so a forged cookie buys an empty page
 * shell whose every request comes back 401.
 *
 * Deliberately imports nothing but `next/server`. Middleware is bundled on its own for the Edge
 * runtime, and Vercel refused the build when this file imported `@/lib/auth`:
 * "The Edge Function middleware is referencing unsupported modules". The two values below are
 * small enough to carry here; `lib/auth.ts` is their counterpart for the browser and the cookie
 * name has to match it.
 */
const AUTH_COOKIE = 'demand_token';   // must match AUTH_COOKIE in lib/auth.ts

/** Token is `<unix expiry>.<hmac>`; structure and expiry only, the backend checks the signature. */
function tokenLooksValid(token: string | undefined): boolean {
    const [expiry, signature] = (token ?? '').split('.');
    return Boolean(signature) && /^\d+$/.test(expiry ?? '') && Number(expiry) * 1000 > Date.now();
}

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
