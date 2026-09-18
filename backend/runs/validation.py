"""Validation checks on a sales history before a Run. Each check is {rule, status, message};
status is pass, warning or error. Any error fails the Run."""
from __future__ import annotations

import numpy as np
import pandas as pd

REQUIRED = ["Customer", "site_name_public", "date", "Product_Group", "Flavor", "Size",
            "Actual_sale", "Planed_sales_from_start", "has_promotion", "discount_pct", "promotion_dt"]
PRODUCT = ["Product_Group", "Flavor", "Size"]


def _check(rule: str, ok: bool, message: str, level: str = "error") -> dict:
    return {"rule": rule, "status": "pass" if ok else level, "message": message}


def validate_history(df: pd.DataFrame, catalog: set[tuple[str, str, str]]) -> list[dict]:
    checks = []
    missing = [c for c in REQUIRED if c not in df.columns]
    checks.append(_check("Schema: required columns", not missing,
                         "All required columns present" if not missing else f"Missing: {', '.join(missing)}"))
    if missing:
        return checks

    dates = pd.to_datetime(df["date"], errors="coerce")
    bad_dates = int(dates.isna().sum())
    checks.append(_check("Date: parseable", bad_dates == 0,
                         f"All {len(df)} dates parsed" if bad_dates == 0 else f"{bad_dates} rows have an unparseable date"))

    dup = int(df.duplicated(["Customer", "site_name_public", *PRODUCT, "date"]).sum())
    checks.append(_check("Date: uniqueness", dup == 0,
                         "No duplicate Customer / Site / Product / month rows" if dup == 0 else f"{dup} duplicate rows"))

    months = dates.dt.to_period("M")
    gaps = 0
    for _, g in df.assign(_m=months).groupby(PRODUCT, observed=True):
        span = g["_m"].max() - g["_m"].min()
        gaps += max(0, span.n + 1 - g["_m"].nunique())
    checks.append(_check("Date: monthly continuity", gaps == 0,
                         "No missing months for any Product" if gaps == 0 else f"{gaps} Product-months missing inside the history", "warning"))

    qty = pd.to_numeric(df["Actual_sale"], errors="coerce")
    neg = int((qty < 0).sum()) + int(qty.isna().sum())
    checks.append(_check("Quantity: non-negative", neg == 0,
                         "All quantities are numbers >= 0" if neg == 0 else f"{neg} rows have a negative or non-numeric quantity"))

    days = pd.to_numeric(df["promotion_dt"], errors="coerce").fillna(0)
    bad_days = int((~days.between(0, 31)).sum())
    checks.append(_check("Promo Days: 0..31", bad_days == 0, "All Promo Days within 0..31" if bad_days == 0 else f"{bad_days} rows outside 0..31"))

    disc = pd.to_numeric(df["discount_pct"], errors="coerce").fillna(0)
    bad_disc = int((~disc.between(0, 100)).sum())
    checks.append(_check("Discount: 0..100", bad_disc == 0, "All Discounts within 0..100" if bad_disc == 0 else f"{bad_disc} rows outside 0..100"))

    flag = pd.to_numeric(df["has_promotion"], errors="coerce").fillna(0)
    inconsistent = int(((flag == 0) & ((days > 0) | (disc > 0))).sum())
    checks.append(_check("Promotion: flag consistency", inconsistent == 0,
                         "Promotion fields agree with the flag" if inconsistent == 0
                         else f"{inconsistent} rows have no Promotion flag but Promo Days or Discount set", "warning"))

    seen = set(map(tuple, df[PRODUCT].astype(str).drop_duplicates().to_numpy()))
    unknown = sorted(seen - catalog)
    checks.append(_check("Product: in catalog", not unknown,
                         f"All {len(seen)} Products are in the catalog" if not unknown
                         else "Unknown Products: " + "; ".join(" / ".join(p) for p in unknown[:5]) + (" ..." if len(unknown) > 5 else "")))

    n_months = int(months.nunique())
    checks.append(_check("History: at least 12 months", n_months >= 12,
                         f"{n_months} months of history" if n_months >= 12 else f"Only {n_months} months of history; forecasts will be weak", "warning"))

    outliers = 0
    for _, g in df.assign(_q=qty).groupby(PRODUCT, observed=True):
        if len(g) >= 6 and g["_q"].std(ddof=0) > 0:
            z = (g["_q"] - g["_q"].mean()) / g["_q"].std(ddof=0)
            outliers += int((np.abs(z) > 3).sum())
    checks.append(_check("Outliers: z-score", outliers == 0,
                         "No quantity further than 3 standard deviations from its Product mean" if outliers == 0
                         else f"{outliers} rows look like outliers (|z| > 3)", "warning"))
    return checks


def has_errors(checks: list[dict]) -> bool:
    return any(c["status"] == "error" for c in checks)
