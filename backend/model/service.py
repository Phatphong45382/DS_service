"""The one place predictions come from.

MODEL_BACKEND=local loads the artifact in-process; sagemaker invokes the Serverless Inference
endpoint in one call and falls back to the local path on timeout or error, logging which one
served the request (see ADR-0001). predict() returns one dict per row:
prediction, p10, p90 and — with explain=True — per-feature SHAP contributions plus base.
"""
from __future__ import annotations

import json
import logging
import pickle
import time
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd
import shap

from ..config import settings
from .train import FEATURES, to_X

logger = logging.getLogger(__name__)


class LocalModel:
    def __init__(self, path: str | Path):
        with open(Path(path) / "model.pkl", "rb") as f:
            art = pickle.load(f)
        self.model = art["model"]
        self.categories = art["categories"]
        self.q10, self.q90 = art["q10"], art["q90"]
        self.version = f"{art['model_name']} {art['version']}"
        self.metrics = art.get("metrics", {})  # holdout WAPE/bias measured at training time on unseen months
        self.explainer = shap.TreeExplainer(self.model)
        logger.info("Loaded %s from %s", self.version, path)

    def predict(self, rows: list[dict], explain: bool = False) -> list[dict]:
        X = to_X(pd.DataFrame(rows), self.categories)
        pred = self.model.predict(X)
        out = [{"prediction": float(p), "p10": float(p * (1 + self.q10)), "p90": float(p * (1 + self.q90))} for p in pred]
        if explain:
            contributions = np.asarray(self.explainer.shap_values(X))
            base = float(np.ravel(self.explainer.expected_value)[0])
            for o, row in zip(out, contributions):
                o["explanations"] = {f: float(v) for f, v in zip(FEATURES, row)}
                o["base"] = base
        return out


class SageMakerModel:
    """One JSON call to the Serverless endpoint, with the in-process model as the fallback.

    A cold endpoint takes tens of seconds to wake (ADR-0001), which is what /health/warm is for.
    Past SAGEMAKER_TIMEOUT_SEC the call is abandoned and the local model answers instead, so a
    cold start or a deleted endpoint can never break a demo.
    """

    def __init__(self, endpoint: str, fallback: LocalModel):
        from ..aws import client
        self.endpoint = endpoint
        self.fallback = fallback
        self.runtime = client("sagemaker-runtime", read_timeout=settings.SAGEMAKER_TIMEOUT_SEC,
                              region=settings.SAGEMAKER_REGION, total_attempts=1)
        self.version = f"{fallback.version} via endpoint {endpoint}"
        self.metrics = fallback.metrics
        self.last_path = "unknown"  # "endpoint" or "fallback": /health reports it

    def predict(self, rows: list[dict], explain: bool = False) -> list[dict]:
        started = time.perf_counter()
        try:
            response = self.runtime.invoke_endpoint(
                EndpointName=self.endpoint,
                ContentType="application/json",
                Accept="application/json",
                Body=json.dumps({"rows": rows, "explain": explain}).encode(),
            )
            out = json.loads(response["Body"].read())["predictions"]
            # An endpoint running an older handler can answer well-formed but wrong: too few rows,
            # or no explanations. Trusting that returns silent nonsense; the fallback is correct.
            if len(out) != len(rows):
                raise ValueError(f"endpoint returned {len(out)} predictions for {len(rows)} rows")
            if explain and not all("explanations" in o for o in out):
                raise ValueError("endpoint ignored explain=True")
            self.last_path = "endpoint"
            logger.info("predict served by endpoint", extra={"rows": len(rows), "path": "endpoint",
                                                             "ms": round((time.perf_counter() - started) * 1000, 1)})
            return out
        except Exception as e:
            self.last_path = "fallback"
            logger.warning("predict fell back to the in-process model", extra={
                "rows": len(rows), "path": "fallback", "endpoint": self.endpoint,
                "reason": f"{type(e).__name__}: {e}", "ms": round((time.perf_counter() - started) * 1000, 1)})
            return self.fallback.predict(rows, explain)


@lru_cache(maxsize=1)
def _backend():
    if settings.MODEL_BACKEND == "local":
        return LocalModel(settings.MODEL_PATH)
    if settings.MODEL_BACKEND == "sagemaker":
        return SageMakerModel(settings.SAGEMAKER_ENDPOINT, LocalModel(settings.MODEL_PATH))
    raise ValueError(f"Unknown MODEL_BACKEND {settings.MODEL_BACKEND!r}")


def predict(rows: list[dict], explain: bool = False) -> list[dict]:
    return _backend().predict(rows, explain)


def model_info() -> dict:
    b = _backend()
    return {"backend": settings.MODEL_BACKEND, "version": b.version, "metrics": getattr(b, "metrics", {}),
            "last_path": getattr(b, "last_path", "local")}


def reset() -> None:
    """Drop the loaded model (tests, and a backend switch at runtime)."""
    _backend.cache_clear()
