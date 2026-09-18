"""Runs: an on-demand execution of the forecast model over a sales history.

create_run builds one feature frame (every Product x Horizon, the same rows without a Promotion
for the baseline, and the six most recent months for a backtest), calls predict once, computes
Forecast Accuracy on the backtest and persists the record and rows through the store.
Promotions in the Horizon are assumed to repeat last year's calendar for each Product.
"""
from __future__ import annotations

import io
import secrets
import time
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from ..data.loader import load_frame
from ..model.service import model_info, predict
from ..model.train import NO_PROMOTION, month_id
from ..store.service import get_store
from .validation import has_errors, validate_history

PRODUCT = ["Product_Group", "Flavor", "Size"]
BACKTEST_MONTHS = 6
HISTORY_MONTHS = 24

# upload column -> dataset column (year + month become date; promo_type is optional)
UPLOAD_COLUMNS = {
    "customer": "Customer", "destination": "site_name_public", "product": "Product_Group", "flavor": "Flavor",
    "size": "Size", "quantity": "Actual_sale", "planed_sales_from_start": "Planed_sales_from_start",
    "has_promotion": "has_promotion", "discount_pct": "discount_pct", "promo_days": "promotion_dt", "promo_type": "MechGroup",
}


# ─── uploads ────────────────────────────────────────────────────────────
def canonical_from_upload(raw: pd.DataFrame) -> pd.DataFrame:
    df = pd.DataFrame()
    for src, dst in UPLOAD_COLUMNS.items():
        if src in raw.columns:
            df[dst] = raw[src]
    if {"year", "month"} <= set(raw.columns):
        y = pd.to_numeric(raw["year"], errors="coerce")
        y = y.where(y < 2400, y - 543)  # Buddhist-era years
        m = pd.to_numeric(raw["month"], errors="coerce")
        df["date"] = pd.to_datetime(dict(year=y, month=m, day=1), errors="coerce")
    for col, default in [("Planed_sales_from_start", 0), ("has_promotion", 0), ("discount_pct", 0.0), ("promotion_dt", 0)]:
        df[col] = pd.to_numeric(df.get(col, default), errors="coerce").fillna(default) if col in df else default
    for col in ["Customer", "site_name_public", *PRODUCT]:
        if col in df:
            df[col] = df[col].astype(str).str.strip()
    if "Actual_sale" in df:
        df["Actual_sale"] = pd.to_numeric(df["Actual_sale"], errors="coerce")
        df["Quantity_sum"] = df["Actual_sale"]
    if "MechGroup" not in df:
        df["MechGroup"] = np.where(df.get("has_promotion", 0) == 1, "Weekly Deal", NO_PROMOTION)
    df["MechGroup"] = df["MechGroup"].fillna(NO_PROMOTION).replace({"": NO_PROMOTION, "None": NO_PROMOTION})
    return df


def catalog() -> set[tuple[str, str, str]]:
    return set(map(tuple, load_frame()[PRODUCT].astype(str).drop_duplicates().to_numpy()))


def save_upload(filename: str, data: bytes) -> dict:
    raw = pd.read_csv(io.BytesIO(data))
    frame = canonical_from_upload(raw)
    checks = validate_history(frame, catalog())
    upload_id = f"UP-{datetime.now(timezone.utc):%Y%m%d}-{secrets.token_hex(3)}"
    store = get_store()
    store.put_bytes(f"uploads/{upload_id}.csv", data)
    meta = {"upload_id": upload_id, "filename": filename, "rows": int(len(raw)), "columns": list(raw.columns), "checks": checks,
            "uploaded_at": datetime.now(timezone.utc).isoformat()}
    store.put_json(f"uploads/{upload_id}.json", meta)
    return meta


def _history_for(upload_id: str | None) -> tuple[pd.DataFrame, str]:
    if upload_id:
        store = get_store()
        meta, data = store.get_json(f"uploads/{upload_id}.json"), store.get_bytes(f"uploads/{upload_id}.csv")
        if meta is None or data is None:
            raise KeyError(upload_id)
        return canonical_from_upload(pd.read_csv(io.BytesIO(data))), meta["filename"]
    return load_frame(), "sales.parquet"


# ─── frames ─────────────────────────────────────────────────────────────
def product_months(frame: pd.DataFrame) -> pd.DataFrame:
    """Product x month totals with the Promotion that month (constant within a Product-month)."""
    g = frame.assign(date=pd.to_datetime(frame["date"])).groupby([*PRODUCT, "date"], as_index=False, observed=True).agg(
        actual=("Actual_sale", "sum"), plan=("Planed_sales_from_start", "sum"),
        promo_flag=("has_promotion", "max"), promo_days=("promotion_dt", "max"),
        discount=("discount_pct", "max"), mechanic=("MechGroup", "first"),
    )
    g["sku"] = g["Flavor"] + " " + g["Size"]
    return g.sort_values([*PRODUCT, "date"]).reset_index(drop=True)


def _features(r, date: pd.Timestamp, promo_flag: int, days: float, disc: float, mech: str) -> dict:
    return {
        "product_group": r["Product_Group"], "flavor": r["Flavor"], "size": r["Size"],
        "year": int(date.year), "month": int(date.month), "month_id": int(month_id(date.year, date.month)),
        "promo_flag": int(promo_flag), "promo_days_in_month": float(days), "promo_discount_pct": float(disc), "promo_type": mech,
    }


# ─── runs ───────────────────────────────────────────────────────────────
def create_run(horizon: int, upload_id: str | None = None, notes: str = "", owner: str = "demo") -> dict:
    started = time.perf_counter()
    created = datetime.now(timezone.utc)
    run_id = f"RUN-{created:%Y%m%d}-{secrets.token_hex(3)}"
    frame, source = _history_for(upload_id)
    checks = validate_history(frame, catalog())
    info = model_info()
    model_name, _, model_version = info["version"].partition(" ")
    record = {
        "run_id": run_id, "created_at": created.isoformat(), "status": "failed", "duration_sec": 0,
        "model_name": model_name, "model_version": model_version, "data_source_name": source,
        "horizon_months": int(horizon), "owner": owner, "notes": notes,
        "tags": ["on-demand", "upload" if upload_id else "dataset"], "wape": None, "bias": None,
        "validation": checks, "upload_id": upload_id, "product_count": 0, "forecast_months": [],
    }
    store = get_store()
    if has_errors(checks):
        record["duration_sec"] = round(time.perf_counter() - started, 2)
        store.put_json(f"runs/{run_id}/record.json", record)
        return record

    pm = product_months(frame)
    last = pm["date"].max()
    future = [last + pd.DateOffset(months=i) for i in range(1, horizon + 1)]
    products = pm[PRODUCT].drop_duplicates().to_dict("records")
    by_key = {(r["Product_Group"], r["Flavor"], r["Size"], r["date"]): r for r in pm.to_dict("records")}

    rows, tags = [], []  # tags: ("forecast"|"baseline"|"backtest", product index, date)
    for i, p in enumerate(products):
        for d in future:
            prior = by_key.get((p["Product_Group"], p["Flavor"], p["Size"], d - pd.DateOffset(years=1)))
            if prior and prior["promo_flag"]:
                rows.append(_features(p, d, 1, prior["promo_days"], prior["discount"], prior["mechanic"]))
            else:
                rows.append(_features(p, d, 0, 0, 0, NO_PROMOTION))
            tags.append(("forecast", i, d))
            rows.append(_features(p, d, 0, 0, 0, NO_PROMOTION))
            tags.append(("baseline", i, d))
    backtest = pm[pm["date"] > last - pd.DateOffset(months=BACKTEST_MONTHS)]
    for r in backtest.to_dict("records"):
        rows.append(_features(r, r["date"], r["promo_flag"], r["promo_days"], r["discount"], r["mechanic"]))
        tags.append(("backtest", r["actual"], r["date"]))

    preds = predict(rows)  # one call for everything

    forecast, baseline, bt_actual, bt_pred = {}, {}, [], []
    for (kind, ref, d), pr in zip(tags, preds):
        if kind == "forecast":
            forecast[(ref, d)] = pr
        elif kind == "baseline":
            baseline[(ref, d)] = pr["prediction"]
        else:
            bt_actual.append(ref)
            bt_pred.append(pr["prediction"])
    bt_actual, bt_pred = np.array(bt_actual), np.array(bt_pred)
    wape = float(np.abs(bt_actual - bt_pred).sum() / bt_actual.sum() * 100) if bt_actual.sum() else 0.0
    bias = float((bt_pred - bt_actual).sum() / bt_actual.sum() * 100) if bt_actual.sum() else 0.0

    forecast_rows = []
    for i, p in enumerate(products):
        for d in future:
            pr = forecast[(i, d)]
            prior = by_key.get((p["Product_Group"], p["Flavor"], p["Size"], d - pd.DateOffset(years=1)))
            forecast_rows.append({
                "run_id": run_id, "date_month": f"{d:%Y-%m-01}", "sku": f"{p['Flavor']} {p['Size']}", **p,
                "product_group": p["Product_Group"], "flavor": p["Flavor"], "size": p["Size"],
                "forecast_units": round(pr["prediction"]), "p10_units": round(pr["p10"]), "p90_units": round(pr["p90"]),
                "plan_units": round(float(prior["plan"])) if prior else 0,
                "baseline_forecast_units": round(baseline[(i, d)]),
            })
    hist = pm[pm["date"] > last - pd.DateOffset(months=HISTORY_MONTHS)]
    history_rows = [{
        "date_month": f"{r['date']:%Y-%m-01}", "sku": r["sku"],
        "product_group": r["Product_Group"], "flavor": r["Flavor"], "size": r["Size"],
        "actual_units": int(r["actual"]), "plan_units": int(r["plan"]), "promo_flag": bool(r["promo_flag"]),
        "promo_days": int(r["promo_days"]), "discount_pct": float(r["discount"]), "mechanic": r["mechanic"],
    } for r in hist.to_dict("records")]

    # On the canonical dataset the model has seen every month, so the backtest is in-sample and
    # flattering; report the holdout accuracy measured at training time instead. Uploads keep the
    # backtest (there is nothing else) and say so.
    holdout = info.get("metrics", {})
    if not upload_id and holdout.get("holdout_wape") is not None:
        wape, bias = holdout["holdout_wape"], holdout["holdout_bias"]
        basis = f"holdout: last {holdout.get('holdout_months', 6)} months unseen at training"
    else:
        basis = f"in-sample backtest: last {BACKTEST_MONTHS} months of the uploaded history"
    record.update({
        "status": "success", "duration_sec": round(time.perf_counter() - started, 2),
        "wape": round(wape, 2), "bias": round(bias, 2), "accuracy_basis": basis, "product_count": len(products),
        "forecast_months": [f"{d:%Y-%m-01}" for d in future],
    })
    store.put_json(f"runs/{run_id}/record.json", record)
    store.put_json(f"runs/{run_id}/forecast.json", {"forecast": forecast_rows, "history": history_rows})
    return record


def list_runs() -> list[dict]:
    store = get_store()
    records = [store.get_json(k) for k in store.list_keys("runs/") if k.endswith("/record.json")]
    records = sorted((r for r in records if r), key=lambda r: r["created_at"], reverse=True)
    for i, r in enumerate(records):
        r["previous_run_id"] = records[i + 1]["run_id"] if i + 1 < len(records) else None
    return records


def get_run(run_id: str) -> dict | None:
    return next((r for r in list_runs() if r["run_id"] == run_id), None)


def get_forecast(run_id: str) -> dict | None:
    return get_store().get_json(f"runs/{run_id}/forecast.json")


def compare(a: str, b: str) -> dict | None:
    ra, rb, fa, fb = get_run(a), get_run(b), get_forecast(a), get_forecast(b)
    if not (ra and rb and fa and fb):
        return None
    months = sorted({r["date_month"] for r in fa["forecast"]} | {r["date_month"] for r in fb["forecast"]})
    skus = sorted({r["sku"] for r in fa["forecast"]} | {r["sku"] for r in fb["forecast"]})
    sum_by = lambda rows, key, val: {k: sum(r["forecast_units"] for r in rows if r[key] == k) for k in val}
    ma, mb = sum_by(fa["forecast"], "date_month", months), sum_by(fb["forecast"], "date_month", months)
    sa, sb = sum_by(fa["forecast"], "sku", skus), sum_by(fb["forecast"], "sku", skus)
    return {
        "a": ra, "b": rb, "forecast_a": fa["forecast"], "forecast_b": fb["forecast"],
        "monthly": [{"month": m, "a": ma[m], "b": mb[m]} for m in months],
        "by_sku": [{"sku": s, "a": sa[s], "b": sb[s]} for s in skus],
    }
