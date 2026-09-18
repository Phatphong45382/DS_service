"""Train the forecast model: LightGBM on Product x month totals, plus empirical interval quantiles.

The artifact directory holds model.pkl (everything predict needs) and metadata.json (for humans).
Run:  python -m backend.model.train --data data/sales.parquet --out model/
"""
from __future__ import annotations

import argparse
import json
import pickle
import time
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

CATEGORICAL = ["product_group", "flavor", "size", "promo_type"]
NUMERIC = ["year", "month", "month_id", "promo_flag", "promo_days_in_month", "promo_discount_pct"]
FEATURES = CATEGORICAL + NUMERIC  # the exact names the predict router sends
NO_PROMOTION = "No Promotion"

PARAMS = dict(
    n_estimators=400, learning_rate=0.05, num_leaves=15, min_child_samples=5,
    subsample=0.9, subsample_freq=1, colsample_bytree=0.9, random_state=42, n_jobs=1, verbose=-1,
)


def month_id(year, month):
    return (year - 2021) * 12 + month  # same formula as the predict router


def product_month_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Collapse Customer x Site rows to Product x month. A Promotion is per Product-month,
    so its fields are constant within a group and max/first read the same value."""
    g = df.groupby(["Product_Group", "Flavor", "Size", "date"], as_index=False, observed=True).agg(
        actual=("Actual_sale", "sum"),
        promo_flag=("has_promotion", "max"),
        promo_days_in_month=("promotion_dt", "max"),
        promo_discount_pct=("discount_pct", "max"),
        promo_type=("MechGroup", "first"),
    ).rename(columns={"Product_Group": "product_group", "Flavor": "flavor", "Size": "size"})
    g["year"], g["month"] = g["date"].dt.year, g["date"].dt.month
    g["month_id"] = month_id(g["year"], g["month"])
    return g


def to_X(rows: pd.DataFrame, categories: dict[str, list[str]]) -> pd.DataFrame:
    """Feature frame in the exact column order the model was fitted with.
    Unknown category values become missing, which LightGBM handles."""
    X = pd.DataFrame(index=rows.index)
    for c in CATEGORICAL:
        X[c] = pd.Categorical(rows[c].astype(str), categories=categories[c])
    for c in NUMERIC:
        X[c] = pd.to_numeric(rows[c]).astype(float)
    return X


def train_frame(frame: pd.DataFrame, holdout_months: int = 6) -> dict:
    categories = {c: sorted(frame[c].astype(str).unique()) for c in CATEGORICAL}
    if NO_PROMOTION not in categories["promo_type"]:
        categories["promo_type"].append(NO_PROMOTION)

    cutoff = frame["date"].max() - pd.DateOffset(months=holdout_months)
    tr, ho = frame[frame["date"] <= cutoff], frame[frame["date"] > cutoff]

    fitted = lgb.LGBMRegressor(**PARAMS).fit(to_X(tr, categories), tr["actual"])
    pred_ho = fitted.predict(to_X(ho, categories))
    rel_resid = (ho["actual"].to_numpy() - pred_ho) / np.maximum(pred_ho, 1.0)
    q10, q90 = np.quantile(rel_resid, [0.10, 0.90])
    q10, q90 = min(float(q10), -0.01), max(float(q90), 0.01)  # the band always brackets the point
    wape = float(np.abs(ho["actual"].to_numpy() - pred_ho).sum() / ho["actual"].sum() * 100)
    bias = float((pred_ho - ho["actual"].to_numpy()).sum() / ho["actual"].sum() * 100)

    # serve a model fitted on everything; the holdout only sized the band
    model = lgb.LGBMRegressor(**PARAMS).fit(to_X(frame, categories), frame["actual"])
    return {
        "model": model,
        "model_name": "LightGBM",
        "version": time.strftime("%Y%m%d-%H%M%S"),
        "features": FEATURES,
        "categorical": CATEGORICAL,
        "categories": categories,
        "q10": q10,
        "q90": q90,
        "metrics": {"holdout_wape": wape, "holdout_bias": bias, "holdout_months": holdout_months, "train_rows": int(len(frame))},
    }


def save(artifact: dict, out_dir: Path) -> None:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / "model.pkl", "wb") as f:
        pickle.dump(artifact, f)
    meta = {k: v for k, v in artifact.items() if k != "model"}
    (out_dir / "metadata.json").write_text(json.dumps(meta, indent=2))


def train_from_parquet(data_path: str | Path, out_dir: str | Path, holdout_months: int = 6) -> dict:
    artifact = train_frame(product_month_frame(pd.read_parquet(data_path)), holdout_months)
    save(artifact, Path(out_dir))
    return artifact


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--data", default="data/sales.parquet")
    ap.add_argument("--out", default="model")
    ap.add_argument("--holdout-months", type=int, default=6)
    args = ap.parse_args()
    art = train_from_parquet(args.data, args.out, args.holdout_months)
    m = art["metrics"]
    print(f"{art['model_name']} {art['version']}: {m['train_rows']} rows, holdout WAPE {m['holdout_wape']:.1f}% "
          f"bias {m['holdout_bias']:+.1f}%, band {art['q10']:+.2f}/{art['q90']:+.2f} -> {args.out}/")


if __name__ == "__main__":
    main()
