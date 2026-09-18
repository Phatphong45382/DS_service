"""One password for the whole demo.

POST /auth/login trades DEMO_PASSWORD for a token; every other API route needs it as a
bearer header. The token is `<expiry>.<hmac>` — standard library only, no session store, so
it survives a restart and works across instances. The signing key is derived from the
password, which means changing the password invalidates every token that was handed out.

Auth is off when DEMO_PASSWORD is empty (local development); production refuses to start
without one, see main.create_app.
"""
from __future__ import annotations

import hashlib
import hmac
import time

from fastapi import Request
from fastapi.responses import JSONResponse

from .config import settings

TOKEN_TTL_SEC = 12 * 3600
# health is the readiness probe Render and the presenter call before logging in; login is the door itself.
# The schema is not an API route: ENV=production already removes it, so the token does not govern it.
OPEN_PATHS = ("/health", "/auth/login", "/openapi.json")


def enabled() -> bool:
    return bool(settings.DEMO_PASSWORD)


def _key() -> bytes:
    return (settings.AUTH_SECRET or hashlib.sha256(f"demand-demo|{settings.DEMO_PASSWORD}".encode()).hexdigest()).encode()


def _sign(expires_at: int) -> str:
    return hmac.new(_key(), str(expires_at).encode(), hashlib.sha256).hexdigest()


def mint(now: float | None = None) -> dict:
    expires_at = int((now or time.time()) + TOKEN_TTL_SEC)
    return {"token": f"{expires_at}.{_sign(expires_at)}", "expires_at": expires_at}


def valid(token: str) -> bool:
    expiry, _, signature = (token or "").partition(".")
    if not expiry.isdigit() or not signature:
        return False
    if not hmac.compare_digest(signature, _sign(int(expiry))):
        return False
    return int(expiry) > time.time()


def check_password(password: str) -> bool:
    return hmac.compare_digest(password or "", settings.DEMO_PASSWORD)


def _open(path: str) -> bool:
    rest = path[len(settings.API_V1_STR):]
    return any(rest == p or rest.startswith(p + "/") for p in OPEN_PATHS)


async def require_token(request: Request, call_next):
    """Starlette middleware: 401 on every API route but health and login."""
    guarded = (
        enabled()
        and request.url.path.startswith(settings.API_V1_STR)
        and request.method != "OPTIONS"  # CORS preflight carries no credentials by design
        and not _open(request.url.path)
    )
    if guarded:
        header = request.headers.get("authorization", "")
        token = header[7:] if header[:7].lower() == "bearer " else ""
        if not valid(token):
            return JSONResponse(
                status_code=401,
                content={"success": False, "error": {"code": "UNAUTHORIZED", "message": "Sign in to use this demo"}},
            )
    return await call_next(request)
