"""Runs through the HTTP seam with local backends (dataset seed 42 ending 2026-08, local model, local store).

Literals: 24 Products in the catalog; a Horizon of 3 forecasts 2026-09..2026-11; history is the last 24 months.
"""
import io

import pytest

API = "/api/v1/runs"


def ok(resp):
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["success"] is True, body.get("error")
    return body["data"]


@pytest.fixture(scope="module")
def run(client):
    return ok(client.post(API, json={"horizon": 3, "notes": "first run"}))


def test_creating_a_run_returns_a_complete_record(run):
    assert run["run_id"].startswith("RUN-")
    assert run["status"] == "success"
    assert run["horizon_months"] == 3
    assert run["duration_sec"] >= 0
    assert run["model_name"] == "LightGBM" and run["model_version"]
    assert run["data_source_name"] == "sales.parquet"
    assert 0 < run["wape"] < 30 and isinstance(run["bias"], float)
    assert run["notes"] == "first run" and "on-demand" in run["tags"]
    assert all({"rule", "status", "message"} <= set(c) for c in run["validation"])
    assert all(c["status"] in ("pass", "warning", "error") for c in run["validation"])
    assert run["forecast_months"] == ["2026-09-01", "2026-10-01", "2026-11-01"]


def test_forecast_rows_cover_every_product_and_month_with_intervals(client, run):
    data = ok(client.get(f"{API}/{run['run_id']}/forecast"))
    fc = data["forecast"]
    assert len(fc) == 24 * 3
    assert {r["date_month"] for r in fc} == {"2026-09-01", "2026-10-01", "2026-11-01"}
    assert len({r["sku"] for r in fc}) == 24
    for r in fc:
        assert r["p10_units"] <= r["forecast_units"] <= r["p90_units"]
        assert r["baseline_forecast_units"] > 0 and r["plan_units"] >= 0
        assert {"product_group", "flavor", "size"} <= set(r)
    hist = data["history"]
    assert len(hist) == 24 * 24
    assert min(h["date_month"] for h in hist) == "2024-09-01" and max(h["date_month"] for h in hist) == "2026-08-01"
    assert all({"actual_units", "plan_units", "promo_flag", "promo_days", "discount_pct"} <= set(h) for h in hist)


def test_runs_list_is_newest_first_and_get_returns_the_same_record(client, run):
    second = ok(client.post(API, json={"horizon": 1}))
    listed = ok(client.get(API))
    assert [r["run_id"] for r in listed][:2] == [second["run_id"], run["run_id"]]
    assert ok(client.get(f"{API}/{run['run_id']}"))["run_id"] == run["run_id"]
    assert ok(client.get(f"{API}/{second['run_id']}"))["previous_run_id"] == run["run_id"]
    assert client.get(f"{API}/RUN-nope").status_code == 404


def test_compare_two_runs_by_month_and_by_sku(client, run):
    other = ok(client.post(API, json={"horizon": 3}))
    data = ok(client.get(f"{API}/compare", params={"a": run["run_id"], "b": other["run_id"]}))
    assert data["a"]["run_id"] == run["run_id"] and data["b"]["run_id"] == other["run_id"]
    assert [m["month"] for m in data["monthly"]] == ["2026-09-01", "2026-10-01", "2026-11-01"]
    assert all({"a", "b"} <= set(m) for m in data["monthly"])
    assert len(data["by_sku"]) == 24 and all({"sku", "a", "b"} <= set(s) for s in data["by_sku"])


def test_runs_survive_a_backend_restart(client, run):
    from backend.store import service as store_service
    store_service.reset()  # drop any in-process handle; the next call must reload from disk
    assert run["run_id"] in {r["run_id"] for r in ok(client.get(API))}


CSV_HEADER = "customer,destination,year,month,product,flavor,size,quantity,planed_sales_from_start,has_promotion,discount_pct,promo_days\n"


def _upload(client, rows: str):
    files = {"file": ("history.csv", io.BytesIO((CSV_HEADER + rows).encode()), "text/csv")}
    return ok(client.post(f"{API}/upload", files=files))


def test_upload_with_negative_quantity_fails_the_run_with_a_named_check(client):
    up = _upload(client, "FreshMart,DC Central 1,2026,7,Chips,BBQ,30g,1200,1100,0,0,0\n"
                         "FreshMart,DC Central 1,2026,8,Chips,BBQ,30g,-5,1100,0,0,0\n")
    assert up["upload_id"] and up["rows"] == 2
    run = ok(client.post(API, json={"horizon": 1, "upload_id": up["upload_id"]}))
    assert run["status"] == "failed"
    failed = [c for c in run["validation"] if c["status"] == "error"]
    assert failed and any("quantity" in c["rule"].lower() for c in failed)
    assert run["data_source_name"] == "history.csv"


def test_upload_with_an_unknown_product_is_flagged(client):
    up = _upload(client, "FreshMart,DC Central 1,2026,8,Chips,Durian,30g,100,90,0,0,0\n")
    run = ok(client.post(API, json={"horizon": 1, "upload_id": up["upload_id"]}))
    assert any("product" in c["rule"].lower() and c["status"] == "error" and "Durian" in c["message"] for c in run["validation"])


def test_upload_of_a_valid_history_produces_a_run_on_that_data(client, dataset_path):
    import pandas as pd
    df = pd.read_parquet(dataset_path)
    sub = df[(df["Product_Group"] == "Chips") & (df["Flavor"] == "BBQ") & (df["Size"] == "30g")]
    lines = "".join(
        f"{r.Customer},{r.site_name_public},{r.date.year},{r.date.month},{r.Product_Group},{r.Flavor},{r.Size},"
        f"{r.Actual_sale},{r.Planed_sales_from_start},{r.has_promotion},{r.discount_pct},{r.promotion_dt}\n"
        for r in sub.itertuples()
    )
    up = _upload(client, lines)
    run = ok(client.post(API, json={"horizon": 2, "upload_id": up["upload_id"]}))
    assert run["status"] == "success", run["validation"]
    fc = ok(client.get(f"{API}/{run['run_id']}/forecast"))["forecast"]
    assert {r["sku"] for r in fc} == {"BBQ 30g"} and len(fc) == 2
