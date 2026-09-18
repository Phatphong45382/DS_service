"""The one place predictions come from.

MODEL_BACKEND=local loads the artifact in-process; sagemaker arrives with the AWS backends ticket
and uses this same local path as its fallback. predict() returns one dict per row:
prediction, p10, p90 and — with explain=True — per-feature SHAP contributions plus base.
"""
from __future__ import annotations

import logging
import pickle
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


@lru_cache(maxsize=1)
def _backend():
    if settings.MODEL_BACKEND == "local":
        return LocalModel(settings.MODEL_PATH)
    if settings.MODEL_BACKEND == "sagemaker":
        raise NotImplementedError("MODEL_BACKEND=sagemaker is delivered by the AWS backends ticket")
    raise ValueError(f"Unknown MODEL_BACKEND {settings.MODEL_BACKEND!r}")


def predict(rows: list[dict], explain: bool = False) -> list[dict]:
    return _backend().predict(rows, explain)


def model_info() -> dict:
    return {"backend": settings.MODEL_BACKEND, "version": _backend().version}
