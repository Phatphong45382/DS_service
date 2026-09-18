/**
 * Client side of the single-password login.
 *
 * The token minted by the backend (`<expiry>.<hmac>`) lives in one cookie, readable by both the
 * middleware (to redirect) and this module (to set the bearer header). It is not HttpOnly on
 * purpose: the browser talks to the backend directly, so the script has to be able to send it.
 * The signature is what makes the token unforgeable, and it is worth one shared demo password
 * for twelve hours.
 */

export const AUTH_COOKIE = 'demand_token';  // middleware.ts carries its own copy; keep them equal

export function readToken(): string {
    if (typeof document === 'undefined') return '';
    const hit = document.cookie.split('; ').find((c) => c.startsWith(`${AUTH_COOKIE}=`));
    return hit ? decodeURIComponent(hit.slice(AUTH_COOKIE.length + 1)) : '';
}

export function storeToken(token: string, expiresAt: number): void {
    const expires = new Date(expiresAt * 1000).toUTCString();
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; Expires=${expires}; SameSite=Lax${secure}`;
}

export function clearToken(): void {
    document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/**
 * A backend without DEMO_PASSWORD accepts everything; give the middleware a cookie it will
 * accept so local development is not sent round the login page forever.
 */
export function markAuthDisabled(): void {
    const farFuture = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
    storeToken(`${farFuture}.no-auth`, farFuture);
}

/** Sent on every backend call; empty while auth is switched off, which the backend accepts. */
export function authHeader(): Record<string, string> {
    const token = readToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}
