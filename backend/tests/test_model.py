"""Model-service seam: predict(rows, explain) on an artifact trained from the seed-42 dataset.

Rows use the feature names the predict router builds. Expected relationships come from the
generator's ground truth (Weekly Deal lifts more than Loyalty Points), not from the model.
"""
import pytest

from backend.model.service import predict

BBQ_30G_NOV = {
    "product_group": "Chips", "flavor": "BBQ", "size": "30g",
    "year": 2026, "month": 11, "month_id": (2026 - 2021) * 12 + 11,
    "promo_flag": 0, "promo_days_in_month": 0, "promo_discount_pct": 0, "promo_type": "No Promotion",
}
WEEKLY = {**BBQ_30G_NOV, "promo_flag": 1, "promo_days_in_month": 10, "promo_discount_pct": 20, "promo_type": "Weekly Deal"}
LOYALTY = {**BBQ_30G_NOV, "promo_flag": 1, "promo_days_in_month": 30, "promo_discount_pct": 0, "promo_type": "Loyalty Points"}


@pytest.fixture(scope="module")
def results(model_dir):
    return predict([BBQ_30G_NOV, WEEKLY, LOYALTY], explain=True)


def test_each_row_has_point_interval_and_explanations(results):
    for r in results:
        assert set(r) >= {"prediction", "p10", "p90", "explanations", "base"}
        assert r["p10"] <= r["prediction"] <= r["p90"]
        assert r["p10"] < r["p90"]


def test_promotions_lift_and_weekly_deal_beats_loyalty(results):
    baseline, weekly, loyalty = (r["prediction"] for r in results)
    assert baseline > 0
    assert weekly > loyalty > baseline


def test_explanations_add_up_to_the_prediction(results):
    for r in results:
        assert sum(r["explanations"].values()) + r["base"] == pytest.approx(r["prediction"], rel=1e-3)
    assert results[1]["explanations"]["promo_flag"] > 0 or results[1]["explanations"]["promo_type"] > 0


def test_predict_is_deterministic(model_dir):
    assert predict([WEEKLY]) == predict([WEEKLY])


def test_predict_without_explain_omits_them(model_dir):
    (r,) = predict([BBQ_30G_NOV])
    assert "explanations" not in r and "prediction" in r


def test_compare_with_no_promotion_equals_baseline(client):
    resp = client.post("/api/v1/predict/compare", json={
        "product_group": "Chips", "flavor": "BBQ", "size": "30g", "year": 2026, "month": 11,
        "promo_days_in_month": 0, "promo_discount_pct": 0, "promo_type": "No Promotion",
    })
    data = resp.json()["data"]
    assert data["scenario"] == data["baseline"] and data["delta"] == 0


def test_compare_rejects_a_product_not_in_the_catalog(client):
    resp = client.post("/api/v1/predict/compare", json={
        "product_group": "Chips", "flavor": "Seaweed", "size": "30g", "year": 2026, "month": 11,
        "promo_days_in_month": 10, "promo_discount_pct": 20, "promo_type": "Weekly Deal",
    })
    assert resp.status_code == 422
    assert "Seaweed" in resp.json()["detail"]


def test_compare_endpoint_returns_baseline_scenario_delta_and_explanations(client):
    resp = client.post("/api/v1/predict/compare", json={
        "product_group": "Chips", "flavor": "BBQ", "size": "30g", "year": 2026, "month": 11,
        "promo_days_in_month": 10, "promo_discount_pct": 20, "promo_type": "Weekly Deal",
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["scenario"] > data["baseline"] > 0
    assert data["delta"] == pytest.approx(data["scenario"] - data["baseline"], abs=0.02)
    assert data["delta_pct"] > 0
    assert data["explanations"] and all(isinstance(v, float) for v in data["explanations"].values())


def test_local_model_serves_the_booster_not_the_sklearn_wrapper(client, model_dir):
    """The wrapper's predict() needs scikit-learn, which production does not install (Render 500 on every Run)."""
    import lightgbm as lgb
    from backend.model.service import LocalModel
    assert isinstance(LocalModel(model_dir).model, lgb.Booster)
