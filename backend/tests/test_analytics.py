"""Analytics + Deep Dive through the HTTP seam, on the generated dataset (seed 42, ending 2026-08)."""
import pandas as pd
import pytest

API = "/api/v1/analytics"
YEAR_2025 = dict(year_from=2025, month_from=1, year_to=2025, month_to=12)


@pytest.fixture(scope="module")
def df(dataset_path) -> pd.DataFrame:
    return pd.read_parquet(dataset_path)


def ok(resp):
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["success"] is True, body.get("error")
    return body["data"]


def test_filters_list_the_whole_catalog(client):
    data = ok(client.get(f"{API}/filters"))
    assert data["product_groups"] == ["Chips", "Crackers", "Rice Crackers"]
    assert len(data["flavors"]) == 12
    assert set(data["sizes"]) == {"20g", "30g", "50g", "75g", "150g"}
    assert len(data["customers"]) == 5
    assert set(data["mechgroups"]) == {"No Promotion", "Weekly Deal", "B2B Program", "Loyalty Points"}


def test_filters_cascade_on_product_group(client):
    data = ok(client.get(f"{API}/filters", params={"product_group": "Chips"}))
    assert data["product_groups"] == ["Chips"]
    assert set(data["flavors"]) == {"BBQ", "Original", "Sour Cream", "Hot Spicy"}
    assert set(data["sizes"]) == {"30g", "75g"}


def test_summary_totals_match_the_dataset_for_a_year(client, df):
    data = ok(client.get(f"{API}/summary", params=YEAR_2025))
    year = df[df["date"].dt.year == 2025]
    assert data["kpi"]["total_actual"] == pytest.approx(year["Actual_sale"].sum())
    assert data["kpi"]["total_planned"] == pytest.approx(year["Planed_sales_from_start"].sum())
    assert [(p["year"], p["month"]) for p in data["monthly_ts"]] == [(2025, m) for m in range(1, 13)]
    assert data["meta"]["record_count"] == len(year)


def test_summary_respects_customer_and_promotion_filters(client, df):
    data = ok(client.get(f"{API}/summary", params={**YEAR_2025, "customer": "FreshMart", "has_promotion": 1}))
    subset = df[(df["date"].dt.year == 2025) & (df["Customer"] == "FreshMart") & (df["has_promotion"] == 1)]
    assert data["kpi"]["total_actual"] == pytest.approx(subset["Actual_sale"].sum())
    assert [p["label"] for p in data["by_customer"]] == ["FreshMart"]
    assert data["kpi"]["promo_coverage"] == pytest.approx(100.0)


def test_summary_breakdown_by_product_group_returns_one_series_per_group(client):
    data = ok(client.get(f"{API}/summary", params={**YEAR_2025, "breakdown": "product_group"}))
    assert {s["label"] for s in data["breakdown_ts"]} == {"Chips", "Crackers", "Rice Crackers"}
    assert all(len(s["data"]) == 12 for s in data["breakdown_ts"])


def test_deep_dive_measures_plan_accuracy(client):
    data = ok(client.get(f"{API}/deep-dive", params=YEAR_2025))
    kpi = data["kpi"]
    assert 3 < kpi["wape"] < 30            # Plan bias per Customer is 6-12 %, plus Promotion misses
    assert kpi["bias"] != 0
    assert kpi["under_plan_volume"] > 0 and kpi["over_plan_volume"] > 0
    assert {p["row"] for p in data["heatmap_customer"]} == {"FreshMart", "MegaStore", "ValuePlus", "CityGrocery", "RetailCo"}
    assert data["ranking_under_plan"] and data["ranking_over_plan"]
    assert all(item["planned"] < item["actual"] for item in data["ranking_under_plan"])
    assert all(item["planned"] > item["actual"] for item in data["ranking_over_plan"])
    assert data["scatter_data"] and sum(b["count"] for b in data["error_dist"]) > 0


def test_under_and_over_plan_volumes_mean_what_the_rankings_mean(client, df):
    """Under Plan is the Plan falling short of Actual, everywhere it is named.

    The rankings, the Bias card and these volumes were three different opinions: a card could read
    Under Plan 2.9 % beside a ranking whose every row meant the opposite thing (issue #12).
    """
    rows = df[(df["date"] >= "2025-01-01") & (df["date"] <= "2025-12-31")]
    gap = rows["Actual_sale"] - rows["Planed_sales_from_start"]
    expected_under = float(gap[gap > 0].sum())     # Plan below Actual: a shortfall against demand
    expected_over = float(-gap[gap < 0].sum())     # Plan above Actual: excess planned

    for endpoint in ("deep-dive", "summary"):
        kpi = ok(client.get(f"{API}/{endpoint}", params=YEAR_2025))["kpi"]
        assert kpi["under_plan_volume"] == pytest.approx(expected_under, rel=1e-6), endpoint
        assert kpi["over_plan_volume"] == pytest.approx(expected_over, rel=1e-6), endpoint

    data = ok(client.get(f"{API}/deep-dive", params=YEAR_2025))
    kpi = data["kpi"]
    # every ranked under-plan row is a shortfall, so the shortfall volume cannot be the smaller one
    assert all(item["actual"] > item["planned"] for item in data["ranking_under_plan"])
    # Bias is signed from the Plan (#14), so under-planning reads negative
    assert kpi["bias"] < 0 and kpi["under_plan_volume"] > kpi["over_plan_volume"]


def test_bias_is_signed_from_the_plan_the_way_a_run_is_signed_from_the_forecast(client, df):
    """One sign convention for Bias across the app, and the one the glossary states.

    A Run reports (forecast - actual) / actual, so negative means it forecast too low. Analytics
    reported (actual - planned) / actual, so the same situation came back positive: a Bias of
    -5 % on the Runs page and on the Deep Dive page described opposite things (issue #14).
    """
    rows = df[(df["date"] >= "2025-01-01") & (df["date"] <= "2025-12-31")]
    actual, planned = rows["Actual_sale"].sum(), rows["Planed_sales_from_start"].sum()
    expected = (planned - actual) / actual * 100

    for endpoint in ("deep-dive", "summary"):
        kpi = ok(client.get(f"{API}/{endpoint}", params=YEAR_2025))["kpi"]
        assert kpi["bias"] == pytest.approx(expected, rel=1e-6), endpoint

    # this dataset outsells its Plan, which the glossary calls under-planning: negative
    assert expected < 0
    data = ok(client.get(f"{API}/deep-dive", params=YEAR_2025))
    assert data["kpi"]["bias"] < 0
    assert data["kpi"]["under_plan_volume"] > data["kpi"]["over_plan_volume"]

    # every derived Bias follows the same sign, or a heatmap cell contradicts the card above it
    weighted = sum(c["bias"] * c["actual"] for c in data["heatmap_customer"])
    assert weighted / sum(c["actual"] for c in data["heatmap_customer"]) < 0


def test_deep_dive_promotion_filter_keeps_only_promotion_rows(client):
    data = ok(client.get(f"{API}/deep-dive", params={**YEAR_2025, "has_promotion": 1}))
    assert all(p["is_promo"] for p in data["scatter_data"])
    assert all(item["has_promotion"] for item in data["ranking_under_plan"])
