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
        return pickle.load(f)


def input_fn(body, content_type="application/json"):
    return json.loads(body)


def predict_fn(payload, art):
    rows, explain = payload["rows"], payload.get("explain", False)
    X = to_X(pd.DataFrame(rows), art)
    pred = art["model"].predict(X)
    out = [{"prediction": float(p), "p10": float(p * (1 + art["q10"])), "p90": float(p * (1 + art["q90"]))} for p in pred]
    if explain:
        # LightGBM computes TreeSHAP itself, to the same values shap.TreeExplainer returns, with
        # the base value in the last column. Using it keeps shap - and numba, and a numpy ABI
        # this container cannot satisfy - out of the image entirely.
        contributions = np.asarray(art["model"].predict(X, pred_contrib=True))
        for o, row in zip(out, contributions):
            o["explanations"] = {f: float(v) for f, v in zip(art["features"], row[:-1])}
            o["base"] = float(row[-1])
    return {"predictions": out, "model_version": f"{art['model_name']} {art['version']}"}


def output_fn(prediction, accept="application/json"):
    return json.dumps(prediction), "application/json"
