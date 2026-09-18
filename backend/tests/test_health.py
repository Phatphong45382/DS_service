"""Production hygiene through the HTTP seam: health per dependency, warm-up, production flag, CORS, prompt failures, JSON logs."""
import json
import logging

import pytest
from fastapi.testclient import TestClient

API = "/api/v1/health"


def ok(resp):
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["success"] is True, body.get("error")
    return body["data"]


def test_health_reports_every_dependency_with_latency(client):
    data = ok(client.get(API))
    assert data["status"] in ("ok", "degraded")
    deps = {d["name"]: d for d in data["dependencies"]}
    assert set(deps) == {"data", "store", "model", "ai"}
    for d in deps.values():
        assert d["status"] in ("ok", "degraded", "error")
        assert isinstance(d["latency_ms"], (int, float)) and d["latency_ms"] >= 0
        assert d["detail"]
    assert deps["data"]["status"] == "ok" and deps["model"]["status"] == "ok" and deps["store"]["status"] == "ok"


def test_warm_invokes_the_model_and_reports_latency(client):
    data = ok(client.get(f"{API}/warm"))
    assert data["backend"] == "local"
    assert data["model_latency_ms"] >= 0
    assert data["status"] == "warm"


def test_production_hides_docs_and_restricts_cors():
    from backend.config import settings
    from backend.main import create_app

    saved = settings.ENV, settings.CORS_ORIGINS
    settings.ENV, settings.CORS_ORIGINS = "production", ["https://demo.example"]
    try:
        with TestClient(create_app()) as prod:
            assert prod.get("/docs").status_code == 404
            assert prod.get("/redoc").status_code == 404
            assert prod.get("/api/v1/openapi.json").status_code == 404
            allowed = prod.get(API, headers={"Origin": "https://demo.example"})
            assert allowed.headers.get("access-control-allow-origin") == "https://demo.example"
            denied = prod.get(API, headers={"Origin": "https://evil.example"})
            assert "access-control-allow-origin" not in denied.headers
    finally:
        settings.ENV, settings.CORS_ORIGINS = saved


def test_development_keeps_docs(client):
    assert client.get("/docs").status_code == 200


def test_broken_model_backend_fails_fast_not_silently(client):
    from backend.config import settings
    from backend.model import service

    saved = settings.MODEL_BACKEND
    settings.MODEL_BACKEND = "nowhere"
    service._backend.cache_clear()
    try:
        resp = client.post("/api/v1/predict/compare", json={
            "product_group": "Chips", "flavor": "BBQ", "size": "30g", "year": 2026, "month": 11,
            "promo_days_in_month": 10, "promo_discount_pct": 20, "promo_type": "Weekly Deal",
        })
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is False and "nowhere" in body["error"]["message"]
        health = ok(client.get(API))
        assert health["status"] == "degraded"
        assert {d["name"]: d["status"] for d in health["dependencies"]}["model"] == "error"
    finally:
        settings.MODEL_BACKEND = saved
        service._backend.cache_clear()


def test_log_lines_are_json_objects():
    from backend.logging_setup import JsonFormatter

    record = logging.LogRecord("backend.test", logging.INFO, __file__, 1, "hello %s", ("world",), None)
    line = JsonFormatter().format(record)
    obj = json.loads(line)
    assert obj["message"] == "hello world" and obj["level"] == "INFO" and obj["logger"] == "backend.test"
    assert "time" in obj


def test_requests_are_logged_with_path_status_and_duration(client, caplog):
    with caplog.at_level(logging.INFO, logger="backend.request"):
        client.get(API)
    hits = [r for r in caplog.records if r.name == "backend.request"]
    assert hits, "no request log line"
    extra = hits[-1].__dict__
    assert extra["path"].endswith("/health") and extra["status"] == 200 and extra["duration_ms"] >= 0
