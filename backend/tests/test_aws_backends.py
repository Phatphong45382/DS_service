"""The AWS backends' contracts, without AWS.

Live behaviour (a real bucket, table and endpoint) is proved by scripts/aws_deploy.py and the
smoke run recorded on ticket #9. What matters here is what no live call can guarantee: that a
dead endpoint is indistinguishable from a working one to everything upstream, and that a store
key always maps to the same DynamoDB item.
"""
import json
import io

import pytest

from backend.config import settings
from backend.model.service import LocalModel, SageMakerModel
from backend.store.service import INLINE_LIMIT, AwsStore

ROW = {
    "product_group": "Chips", "flavor": "BBQ", "size": "30g",
    "year": 2026, "month": 11, "month_id": (2026 - 2021) * 12 + 11,
    "promo_flag": 0, "promo_days_in_month": 0, "promo_discount_pct": 0, "promo_type": "No Promotion",
}


class Dead:
    """An endpoint that is cold, deleted, or refusing — every failure looks like this upstream."""

    def invoke_endpoint(self, **kwargs):
        raise TimeoutError("Read timeout on endpoint URL")


class Answering:
    def __init__(self, payload):
        self.payload = payload
        self.seen = None

    def invoke_endpoint(self, **kwargs):
        self.seen = json.loads(kwargs["Body"])
        return {"Body": io.BytesIO(json.dumps(self.payload).encode())}


@pytest.fixture
def sagemaker(model_dir):
    return SageMakerModel("demand-demo-forecast", LocalModel(model_dir))


def test_a_dead_endpoint_answers_exactly_like_the_local_model(sagemaker, model_dir):
    sagemaker.runtime = Dead()
    local = LocalModel(model_dir).predict([ROW], explain=True)
    served = sagemaker.predict([ROW], explain=True)
    assert served == local
    assert sagemaker.last_path == "fallback"


def test_the_endpoint_path_is_used_and_reported(sagemaker):
    answer = [{"prediction": 1234.0, "p10": 1000.0, "p90": 1500.0}]
    sagemaker.runtime = Answering({"predictions": answer})
    assert sagemaker.predict([ROW]) == answer
    assert sagemaker.last_path == "endpoint"
    assert sagemaker.runtime.seen == {"rows": [ROW], "explain": False}


def test_a_malformed_reply_falls_back_rather_than_raising(sagemaker):
    sagemaker.runtime = Answering({"unexpected": "shape"})
    out = sagemaker.predict([ROW])
    assert sagemaker.last_path == "fallback"
    assert out[0]["p10"] <= out[0]["prediction"] <= out[0]["p90"]


def test_model_info_reports_the_endpoint_and_the_path_taken(sagemaker):
    sagemaker.runtime = Dead()
    sagemaker.predict([ROW])
    assert settings.SAGEMAKER_ENDPOINT in sagemaker.version or "endpoint" in sagemaker.version
    assert sagemaker.last_path == "fallback"


def test_the_sagemaker_handler_matches_the_in_process_model(model_dir):
    """The endpoint and the fallback must be interchangeable, to the last decimal.

    They are two implementations of one thing. An early handler carried its own copy of the
    feature list in the wrong order: every prediction was wrong and nothing raised.
    """
    from backend.model import sagemaker_handler as handler

    art = handler.model_fn(model_dir)
    body, content_type = handler.output_fn(
        handler.predict_fn(handler.input_fn(json.dumps({"rows": [ROW], "explain": True})), art))
    assert content_type == "application/json"
    served = json.loads(body)["predictions"][0]
    local = LocalModel(model_dir).predict([ROW], explain=True)[0]

    assert served["prediction"] == pytest.approx(local["prediction"], rel=1e-9)
    assert served["p10"] == pytest.approx(local["p10"], rel=1e-9)
    assert served["p90"] == pytest.approx(local["p90"], rel=1e-9)
    assert served["explanations"] == pytest.approx(local["explanations"], rel=1e-9)
    assert served["base"] == pytest.approx(local["base"], rel=1e-9)


@pytest.mark.parametrize("key,expected", [
    ("runs/RUN-1/record.json", ("runs", "RUN-1/record.json")),
    ("runs/RUN-1/forecast.json", ("runs", "RUN-1/forecast.json")),
    ("uploads/UP-1.json", ("uploads", "UP-1.json")),
    ("runs/", ("runs", "runs")),          # a bare prefix: list_keys turns this back into "match all"
    ("prompts", ("prompts", "prompts")),
])
def test_a_store_key_always_maps_to_the_same_item(key, expected):
    assert AwsStore._split(key) == expected


def test_the_split_between_dynamodb_and_s3_falls_where_a_real_run_needs_it(client):
    """Measured on a real Run, not a guess: the record must be an item, the Forecast an S3 object.

    A DynamoDB item caps at 400 KB, so a Forecast that grows with the Horizon has to be a blob.
    """
    from backend.store.service import get_store

    run = client.post("/api/v1/runs", json={"horizon": 6}).json()["data"]
    store = get_store()
    record = len(json.dumps(store.get_json(f"runs/{run['run_id']}/record.json")).encode())
    forecast = len(json.dumps(store.get_json(f"runs/{run['run_id']}/forecast.json")).encode())
    assert record < INLINE_LIMIT < forecast, f"record {record:,} B, forecast {forecast:,} B, limit {INLINE_LIMIT:,} B"
    assert INLINE_LIMIT < 400 * 1024
