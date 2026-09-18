"""Generator seam: generate(seed, end_month) -> DataFrame.

Expected values are literals from the spec (#1), not recomputed from the generator.
"""
import pandas as pd
import pytest

from backend.data.generator import generate

# Analytics reads the first group of columns, Dashboard/agent the second; one table serves both.
REQUIRED_COLUMNS = {
    "date", "Customer", "Product_Group", "Flavor", "Size", "MechGroup",
    "Actual_sale", "Planed_sales_from_start", "has_promotion", "discount_pct", "promotion_dt",
    "Billing_Date_year", "Billing_Date_month", "Quantity_sum", "site_name_public",
}
MECHANICS = {"No Promotion", "Weekly Deal", "B2B Program", "Loyalty Points"}
PRODUCT_GROUPS = {"Chips", "Crackers", "Rice Crackers"}


@pytest.fixture(scope="module")
def df() -> pd.DataFrame:
    return generate(seed=42, end_month="2026-08")


def test_table_has_every_column_both_dashboards_read(df):
    assert REQUIRED_COLUMNS <= set(df.columns)
    assert not df.isna().any().any()


def test_grain_is_customer_site_product_month(df):
    # 9 Sites (each belonging to one Customer) x 24 Products x 48 months
    assert len(df) == 9 * 24 * 48
    assert df.duplicated(["site_name_public", "Product_Group", "Flavor", "Size", "date"]).sum() == 0


def test_catalog_sizes(df):
    assert set(df["Product_Group"]) == PRODUCT_GROUPS
    assert df["Flavor"].nunique() == 12
    assert df.drop_duplicates(["Product_Group", "Flavor", "Size"]).shape[0] == 24
    assert df["Customer"].nunique() == 5
    assert df["site_name_public"].nunique() == 9
    assert df.groupby("site_name_public")["Customer"].nunique().max() == 1


def test_covers_48_months_ending_at_requested_month(df):
    months = df["date"].drop_duplicates().sort_values()
    assert len(months) == 48
    assert months.iloc[0] == pd.Timestamp("2022-09-01")
    assert months.iloc[-1] == pd.Timestamp("2026-08-01")
    assert (df["Billing_Date_year"] == df["date"].dt.year).all()
    assert (df["Billing_Date_month"] == df["date"].dt.month).all()


def test_actual_is_positive_and_mirrored_for_dashboard(df):
    assert (df["Actual_sale"] > 0).all()
    assert (df["Quantity_sum"] == df["Actual_sale"]).all()


def test_promotion_fields_are_consistent(df):
    assert set(df["MechGroup"]) == MECHANICS
    no_promo = df["MechGroup"] == "No Promotion"
    assert (df.loc[no_promo, "has_promotion"] == 0).all()
    assert (df.loc[~no_promo, "has_promotion"] == 1).all()
    assert (df.loc[no_promo, "discount_pct"] == 0).all()
    assert (df.loc[no_promo, "promotion_dt"] == 0).all()
    assert (df.loc[df["MechGroup"] == "Loyalty Points", "discount_pct"] == 0).all()
    assert (df.loc[~no_promo, "promotion_dt"] > 0).all()


def test_every_mechanic_lifts_actual(df):
    base = df.loc[df["MechGroup"] == "No Promotion", "Actual_sale"].mean()
    for mech in MECHANICS - {"No Promotion"}:
        assert df.loc[df["MechGroup"] == mech, "Actual_sale"].mean() > base, mech


def test_weekly_deal_is_short_and_deep_b2b_long_and_shallow(df):
    weekly = df[df["MechGroup"] == "Weekly Deal"]
    b2b = df[df["MechGroup"] == "B2B Program"]
    assert weekly["promotion_dt"].between(7, 14).all()
    assert weekly["discount_pct"].between(15, 30).all()
    assert b2b["promotion_dt"].between(20, 30).all()
    assert b2b["discount_pct"].between(5, 10).all()


def test_plan_has_a_bias_per_customer_and_ignores_promotions(df):
    ratio = df["Planed_sales_from_start"] / df["Actual_sale"]
    plain = df["has_promotion"] == 0  # bias is defined on months the Plan can see
    per_customer = (ratio[plain] - 1).groupby(df.loc[plain, "Customer"]).mean().abs()
    assert per_customer.between(0.03, 0.15).all()
    # Plan misses more in Promotion months because it does not see the lift
    promo_err = (ratio[df["has_promotion"] == 1] - 1).abs().mean()
    plain_err = (ratio[df["has_promotion"] == 0] - 1).abs().mean()
    assert promo_err > plain_err


def test_same_seed_same_table_different_seed_different_table(df):
    assert generate(seed=42, end_month="2026-08").equals(df)
    assert not generate(seed=43, end_month="2026-08").equals(df)
