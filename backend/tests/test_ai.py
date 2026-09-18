"""AI backend seam: model tiers and backend reporting through the HTTP seam (no network),
plus the pure message mapping of the Bedrock backend. Live Bedrock/Gemini calls are not automated."""
import base64

import pytest

API = "/api/v1/ai"


def ok(resp):
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["success"] is True, body.get("error")
    return body["data"]


@pytest.fixture
def bedrock_settings():
    from backend.config import settings
    from backend.services import ai_service

    saved = (settings.AI_BACKEND, settings.BEDROCK_MODEL)
    settings.AI_BACKEND = "bedrock"
    settings.BEDROCK_MODEL = settings.BEDROCK_MODEL_BALANCED
    ai_service.reset()
    yield settings
    settings.AI_BACKEND, settings.BEDROCK_MODEL = saved
    ai_service.reset()


def test_gemini_is_the_default_backend_with_labelled_tiers(client):
    data = ok(client.get(f"{API}/model"))
    assert data["backend"] == "gemini"
    assert data["current"] == "gemini-2.5-flash-lite"
    assert [m["label"] for m in data["available"]] == ["Fast", "Balanced", "Advanced"]
    assert all({"id", "label", "description"} <= set(m) for m in data["available"])
    assert data["current"] in {m["id"] for m in data["available"]}


def test_switching_to_an_unknown_model_is_rejected(client):
    resp = client.put(f"{API}/model", json={"model": "nope"})
    assert resp.status_code == 200 and resp.json()["success"] is False


def test_bedrock_backend_reports_its_tiers_from_configuration(client, bedrock_settings):
    data = ok(client.get(f"{API}/model"))
    assert data["backend"] == "bedrock"
    ids = [m["id"] for m in data["available"]]
    assert ids == [bedrock_settings.BEDROCK_MODEL_FAST, bedrock_settings.BEDROCK_MODEL_BALANCED, bedrock_settings.BEDROCK_MODEL_ADVANCED]
    assert data["current"] == bedrock_settings.BEDROCK_MODEL_BALANCED
    assert [m["label"] for m in data["available"]] == ["Fast", "Balanced", "Advanced"]
    ok(client.put(f"{API}/model", json={"model": bedrock_settings.BEDROCK_MODEL_FAST}))
    assert ok(client.get(f"{API}/model"))["current"] == bedrock_settings.BEDROCK_MODEL_FAST


def test_health_names_the_active_ai_backend(client, bedrock_settings):
    deps = {d["name"]: d for d in ok(client.get("/api/v1/health"))["dependencies"]}
    assert "bedrock" in deps["ai"]["detail"] and bedrock_settings.BEDROCK_REGION in deps["ai"]["detail"]


def test_bedrock_message_mapping_matches_the_messages_api():
    from backend.services.bedrock_backend import to_messages, media_block

    msgs = to_messages([{"role": "user", "content": "hi"}, {"role": "model", "content": "hello"}, {"role": "assistant", "content": "again"}])
    assert [m["role"] for m in msgs] == ["user", "assistant", "assistant"]
    assert msgs[0]["content"] == "hi"

    img = media_block(b"\x89PNG", "image/png")
    assert img["type"] == "image" and img["source"]["media_type"] == "image/png"
    assert base64.b64decode(img["source"]["data"]) == b"\x89PNG"

    pdf = media_block(b"%PDF-1.4", "application/pdf")
    assert pdf["type"] == "document" and pdf["source"]["media_type"] == "application/pdf"


def test_bedrock_agent_tools_are_declared_as_strict_tools():
    from backend.services.bedrock_backend import AGENT_TOOLS

    names = [t["name"] for t in AGENT_TOOLS]
    assert names == ["query_sales_data", "analyze_data", "generate_report", "send_email", "get_product_list", "get_customer_list"]
    for t in AGENT_TOOLS:
        assert t["strict"] is True
        assert t["input_schema"]["additionalProperties"] is False
        assert "required" in t["input_schema"]


def test_an_uploaded_document_survives_a_backend_restart(client):
    """RAG documents belong in the store, like Runs and uploads (#6), not in process memory.

    Render sleeps between clicks. A document that lived in a dict vanished on the restart,
    so "upload, wait, ask" answered DOC_NOT_FOUND in the middle of a demo.
    """
    from backend.store import service as store_service

    files = {"file": ("policy.txt", b"Safety stock for Chips is 12 percent of forecast.\n", "text/plain")}
    up = client.post("/api/v1/ai/rag/upload", files=files).json()
    assert up["success"], up
    doc_id = up["data"]["doc_id"]
    assert store_service.get_store().get_json(f"docs/{doc_id}.json")["text"].startswith("Safety stock")

    store_service.reset()  # drop every in-process handle; the next call must reload from the store
    q = client.post("/api/v1/ai/rag/query", json={"doc_id": doc_id, "question": "Chips?"}).json()
    # no AI key in tests, so the answer itself fails later - but the document must have been found
    assert (q.get("error") or {}).get("code") != "DOC_NOT_FOUND", q
