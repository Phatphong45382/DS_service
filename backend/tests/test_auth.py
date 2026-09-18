"""The password gate, through the HTTP seam.

The shared `client` fixture runs with auth off (every other test calls the API unauthenticated);
these tests switch DEMO_PASSWORD on for the duration and use the same app.
"""
import time

import pytest

from backend import auth
from backend.config import settings

PASSWORD = "let-me-in"
GUARDED = ["/api/v1/analytics/filters", "/api/v1/runs", "/api/v1/dashboard/summary"]


@pytest.fixture
def secured(client):
    before = settings.DEMO_PASSWORD
    settings.DEMO_PASSWORD = PASSWORD
    yield client
    settings.DEMO_PASSWORD = before


def token(client) -> str:
    r = client.post("/api/v1/auth/login", json={"password": PASSWORD})
    assert r.status_code == 200 and r.json()["success"], r.text
    return r.json()["data"]["token"]


def test_login_rejects_the_wrong_password(secured):
    body = secured.post("/api/v1/auth/login", json={"password": "guess"}).json()
    assert body["success"] is False and body["error"]["code"] == "BAD_PASSWORD"


@pytest.mark.parametrize("path", GUARDED)
def test_no_token_is_401(secured, path):
    assert secured.get(path).status_code == 401


@pytest.mark.parametrize("path", GUARDED)
def test_a_minted_token_is_accepted(secured, path):
    assert secured.get(path, headers={"Authorization": f"Bearer {token(secured)}"}).status_code == 200


def test_tampered_token_is_401(secured):
    good = token(secured)
    expiry, _, signature = good.partition(".")
    forged = [
        good[:-1] + ("0" if good[-1] != "0" else "1"),          # signature flipped
        f"{int(expiry) + 86400}.{signature}",                    # expiry extended, old signature
        f"{int(expiry) + 86400}",                                # signature dropped
        "",
    ]
    for t in forged:
        r = secured.get(GUARDED[0], headers={"Authorization": f"Bearer {t}"})
        assert r.status_code == 401, t


def test_expired_token_is_401(secured):
    stale = auth.mint(now=time.time() - auth.TOKEN_TTL_SEC - 60)["token"]
    assert auth.valid(stale) is False
    assert secured.get(GUARDED[0], headers={"Authorization": f"Bearer {stale}"}).status_code == 401


def test_every_api_route_is_guarded(secured):
    """Walk the published API surface so a route added later cannot quietly be left open."""
    from backend.main import app

    checked = 0
    for path, operations in app.openapi()["paths"].items():
        # deliberately open (auth.OPEN_PATHS), or needs an id we do not have
        if any(path.startswith(settings.API_V1_STR + p) for p in auth.OPEN_PATHS) or "{" in path:
            continue
        method = "get" if "get" in operations else sorted(operations)[0]
        assert secured.request(method.upper(), path).status_code == 401, f"{method} {path} is not guarded"
        checked += 1
    assert checked > 10, f"only {checked} routes checked - the walk found nothing"


def test_health_and_login_stay_open(secured):
    assert secured.get("/api/v1/health").status_code == 200
    assert secured.post("/api/v1/auth/login", json={"password": "x"}).status_code == 200


def test_auth_off_lets_everything_through(client):
    assert settings.DEMO_PASSWORD == ""
    assert client.get(GUARDED[0]).status_code == 200
    assert client.post("/api/v1/auth/login", json={"password": ""}).json()["data"]["auth_required"] is False


def test_changing_the_password_invalidates_old_tokens(secured):
    old = token(secured)
    settings.DEMO_PASSWORD = "rotated"
    assert auth.valid(old) is False
