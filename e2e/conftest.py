"""End-to-end: the built web app in a real browser, against the real API, every backend local.

    cd malee-sales-app && npm run build      # once, or after a frontend change
    python -m pytest e2e -q

Starts the API on 8080 (the port baked into the frontend build) with a password set and a
throwaway store, and the frontend on 3000 from its build. No AWS credentials, no AI key: the
AI pages are tested for loading and for failing visibly, not for answering.
"""
from __future__ import annotations

import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "malee-sales-app"
API_PORT, WEB_PORT = 8080, 3000
API = f"http://127.0.0.1:{API_PORT}"
WEB = f"http://127.0.0.1:{WEB_PORT}"
PASSWORD = "e2e-password"


def _busy(port: int) -> bool:
    with socket.socket() as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def _wait(url: str, seconds: int = 90) -> None:
    deadline = time.time() + seconds
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=3) as r:
                if r.status == 200:
                    return
        except Exception:
            time.sleep(1)
    raise RuntimeError(f"{url} did not come up within {seconds}s")


def _stop(proc: subprocess.Popen) -> None:
    if os.name == "nt":  # kill the tree: uvicorn and next both spawn children
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True)
    else:
        proc.terminate()
    try:
        proc.wait(timeout=10)
    except Exception:
        proc.kill()


@pytest.fixture(scope="session")
def servers():
    for port in (API_PORT, WEB_PORT):
        if _busy(port):
            pytest.exit(f"port {port} is in use: stop the dev server first, the e2e suite starts its own", 2)
    if not (APP / ".next" / "BUILD_ID").exists():
        pytest.exit("no frontend build: run `npm run build` in malee-sales-app first", 2)

    store = tempfile.mkdtemp(prefix="e2e-store-")
    env = {**os.environ, "DATA_SOURCE": "local", "STORE_BACKEND": "local", "MODEL_BACKEND": "local",
           "STORE_PATH": store, "DEMO_PASSWORD": PASSWORD, "ENV": "development",
           "AI_BACKEND": "gemini", "GEMINI_API_KEY": ""}
    api = subprocess.Popen([sys.executable, "-m", "uvicorn", "backend.main:app", "--port", str(API_PORT)],
                           cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    npm = "npm.cmd" if os.name == "nt" else "npm"
    web = subprocess.Popen([npm, "run", "start", "--", "-p", str(WEB_PORT)], cwd=APP, env=os.environ,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        _wait(f"{API}/api/v1/health")
        _wait(f"{WEB}/login")
        yield {"api": API, "web": WEB}
    finally:
        _stop(web)
        _stop(api)
        shutil.rmtree(store, ignore_errors=True)


@pytest.fixture(scope="session")
def token(servers) -> str:
    import json

    req = urllib.request.Request(f"{API}/api/v1/auth/login", method="POST",
                                 data=json.dumps({"password": PASSWORD}).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.load(r)["data"]["token"]


@pytest.fixture(scope="session")
def api(token):
    """Call the API the way the browser does, for setup and for checking what a page did."""
    import json

    def call(method: str, path: str, body=None):
        req = urllib.request.Request(f"{API}/api/v1{path}", method=method,
                                     headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                                     data=json.dumps(body).encode() if body is not None else None)
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)["data"]
    return call


@pytest.fixture(scope="session")
def playwright():
    with sync_playwright() as p:
        yield p


@pytest.fixture(scope="session")
def browser(playwright):
    b = playwright.chromium.launch()
    yield b
    b.close()


@pytest.fixture(scope="session")
def signed_in_state(browser, servers):
    """Log in once through the real form; every test then starts from that cookie."""
    context = browser.new_context()
    page = context.new_page()
    page.goto(f"{WEB}/login")
    page.fill("#password", PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_url(f"{WEB}/", timeout=20000)
    state = context.storage_state()
    context.close()
    return state


@pytest.fixture
def page(browser, signed_in_state):
    context = browser.new_context(storage_state=signed_in_state, viewport={"width": 1440, "height": 900})
    p = context.new_page()
    p.set_default_timeout(20000)
    yield p
    context.close()


@pytest.fixture
def anon_page(browser, servers):
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    p = context.new_page()
    p.set_default_timeout(20000)
    yield p
    context.close()


@pytest.fixture(scope="session")
def run_id(api) -> str:
    """One real Run, so the Forecast, Runs, detail and Compare pages have something to show."""
    return api("POST", "/runs", {"horizon": 3, "notes": "e2e"})["run_id"]
