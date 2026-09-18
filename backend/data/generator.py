"""Seeded synthetic sales history at Customer x Site x Product x month grain.

Ground truth (see spec #1):
    Actual = base(Product, Customer) x seasonal(month) x trend(t) x lift(Promotion) x noise
    Plan   = base x seasonal x trend x (1 + bias(Customer)) x noise   -- blind to Promotions

Column names are the legacy ones the Analytics and Dashboard routers already read
(ponytail: renaming them means touching ~1,100 lines of aggregation for no user-visible gain).
"""
from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

# ─── Catalog ────────────────────────────────────────────────────────────
PRODUCTS: dict[str, tuple[list[str], list[str]]] = {  # Product Group -> (Flavors, Sizes)
    "Chips": (["BBQ", "Original", "Sour Cream", "Hot Spicy"], ["30g", "75g"]),
    "Crackers": (["Seaweed", "Cheese", "Wasabi", "Tom Yum"], ["50g", "150g"]),
    "Rice Crackers": (["Salted Egg", "Truffle", "Honey Butter", "Teriyaki"], ["20g", "75g"]),
}
SITES: dict[str, list[str]] = {  # Customer -> Sites
    "FreshMart": ["DC Central 1", "DC Central 2"],
    "MegaStore": ["DC East 1", "DC North 1"],
    "ValuePlus": ["DC South 1", "DC South 2"],
    "CityGrocery": ["DC Central 3", "DC West 1"],
    "RetailCo": ["DC North-East 1"],
}
CUSTOMER_SCALE = {"FreshMart": 1.6, "MegaStore": 1.3, "ValuePlus": 1.0, "CityGrocery": 0.7, "RetailCo": 0.5}
PLAN_BIAS = {"FreshMart": -0.08, "MegaStore": 0.07, "ValuePlus": -0.06, "CityGrocery": 0.10, "RetailCo": -0.12}

# Mechanic -> (share of promo months, (days lo, hi), (discount lo, hi), (lift lo, hi))
MECHANICS = {
    "Weekly Deal": (0.45, (7, 14), (15, 30), (1.30, 1.80)),
    "B2B Program": (0.30, (20, 30), (5, 10), (1.10, 1.20)),
    "Loyalty Points": (0.25, (28, 31), (0, 0), (1.05, 1.10)),
}
PROMO_PROBABILITY = 0.25
NO_PROMOTION = "No Promotion"


def last_completed_month(today: date | None = None) -> str:
    today = today or date.today()
    first = today.replace(day=1)
    prev = first - pd.Timedelta(days=1)
    return f"{prev.year}-{prev.month:02d}"


def catalog() -> dict:
    products = [
        {"product_group": g, "flavor": f, "size": s}
        for g, (flavors, sizes) in PRODUCTS.items() for f in flavors for s in sizes
    ]
    return {
        "products": products,
        "customers": list(SITES),
        "sites": [{"site": s, "customer": c} for c, sites in SITES.items() for s in sites],
        "mechanics": [NO_PROMOTION, *MECHANICS],
    }


def generate(seed: int = 42, end_month: str | None = None, months: int = 48) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    end = pd.Timestamp(end_month or last_completed_month()).replace(day=1)
    dates = pd.date_range(end=end, periods=months, freq="MS")
    cat = catalog()

    # Base volume per (Product, Customer), split across the Customer's Sites.
    product_base = {(p["product_group"], p["flavor"], p["size"]): rng.uniform(800, 4000) for p in cat["products"]}
    site_share = {
        s: CUSTOMER_SCALE[c] / len(SITES[c]) * rng.uniform(0.85, 1.15)
        for c, sites in SITES.items() for s in sites
    }

    rows = []
    for c, sites in SITES.items():
        for s in sites:
            for p in cat["products"]:
                key = (p["product_group"], p["flavor"], p["size"])
                base = product_base[key] * site_share[s]
                for t, d in enumerate(dates):
                    seasonal = 1 + 0.25 * np.cos(2 * np.pi * (d.month - 12) / 12)
                    trend = 1 + 0.015 * (t / 12)
                    expected = base * seasonal * trend

                    mech, days, disc, lift = NO_PROMOTION, 0, 0.0, 1.0
                    if rng.random() < PROMO_PROBABILITY:
                        mech = rng.choice(list(MECHANICS), p=[m[0] for m in MECHANICS.values()])
                        _, (d_lo, d_hi), (p_lo, p_hi), (l_lo, l_hi) = MECHANICS[mech]
                        days = int(rng.integers(d_lo, d_hi + 1))
                        disc = float(round(rng.uniform(p_lo, p_hi), 1))
                        lift = rng.uniform(l_lo, l_hi)

                    actual = max(1, int(round(expected * lift * rng.lognormal(0, 0.08))))
                    plan = max(1, int(round(expected * (1 + PLAN_BIAS[c]) * rng.lognormal(0, 0.03))))
                    rows.append((
                        d, d.year, d.month, c, s, p["product_group"], p["flavor"], p["size"],
                        mech, int(mech != NO_PROMOTION), disc, days, actual, actual, plan,
                    ))

    return pd.DataFrame(rows, columns=[
        "date", "Billing_Date_year", "Billing_Date_month", "Customer", "site_name_public",
        "Product_Group", "Flavor", "Size", "MechGroup", "has_promotion", "discount_pct",
        "promotion_dt", "Actual_sale", "Quantity_sum", "Planed_sales_from_start",
    ])


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--end-month", default=None, help="YYYY-MM; default = last completed month")
    ap.add_argument("--out", type=Path, default=Path("data/sales.parquet"))
    args = ap.parse_args()

    df = generate(seed=args.seed, end_month=args.end_month)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(args.out, index=False)
    (args.out.parent / "catalog.json").write_text(json.dumps(catalog(), indent=2))
    print(f"{len(df):,} rows, {df['date'].min():%Y-%m} -> {df['date'].max():%Y-%m}, seed {args.seed} -> {args.out}")


if __name__ == "__main__":
    main()
