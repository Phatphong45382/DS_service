"""SageMaker handler for the demand-forecast LightGBM model.

The artifact carries its own feature list, column order and category levels, and this reads them
rather than restating them: a handler with its own copy of the feature order silently predicts
from the wrong columns, which is a wrong number rather than an error.
"""
import json
import os
import pickle

import numpy as np
import pandas as pd


def to_X(rows, art):
    """The training frame's exact columns, in the order the model was fitted with."""
    categorical, categories = art["categorical"], art["categories"]
    X = pd.DataFrame(index=rows.index)
    for c in art["features"]:
        if c in categorical:
            X[c] = pd.Categorical(rows[c].astype(str), categories=categories[c])
        else:
            X[c] = pd.to_numeric(rows[c]).astype(float)
    return X


def model_fn(model_dir):
    with open(os.path.join(model_dir, "model.pkl"), "rb") as f:
        art = pickle.load(f)
    art["explainer"] = None
    return art


def input_fn(body, content_type="application/json"):
    return json.loads(body)


def predict_fn(payload, art):
    rows, explain = payload["rows"], payload.get("explain", False)
    X = to_X(pd.DataFrame(rows), art)
    pred = art["model"].predict(X)
    out = [{"prediction": float(p), "p10": float(p * (1 + art["q10"])), "p90": float(p * (1 + art["q90"]))} for p in pred]
    if explain:
        import shap
        if art["explainer"] is None:
            art["explainer"] = shap.TreeExplainer(art["model"])
        contributions = np.asarray(art["explainer"].shap_values(X))
        base = float(np.ravel(art["explainer"].expected_value)[0])
        for o, row in zip(out, contributions):
            o["explanations"] = {f: float(v) for f, v in zip(art["features"], row)}
            o["base"] = base
    return {"predictions": out, "model_version": f"{art['model_name']} {art['version']}"}


def output_fn(prediction, accept="application/json"):
    return json.dumps(prediction), "application/json"
