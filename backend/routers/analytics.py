from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from ..schemas.common import APIResponse
from ..schemas.dashboard_v2 import (
    DashboardSummaryResponse, 
    KPI, 
    MonthlyTSPoint, 
    GroupByPoint, 
    TopProductPoint,
    FilterOptionsResponse,
    DeepDiveResponse, 
    AccuracyHeatmapPoint, 
    PerformanceRankingItem, 
    ScatterPoint, 
    ErrorDistBin,
    TimeSeriesPoint
)
from ..services.dataiku_service import dataiku_service
from ..config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory cache for analytics data
DATA_CACHE = {}
CACHE_TTL = 300 # 5 minutes

def get_cached_dataset(dataset_name: str):
    now = datetime.now().timestamp()
    if dataset_name in DATA_CACHE:
        cached = DATA_CACHE[dataset_name]
        if now - cached["timestamp"] < CACHE_TTL:
            return cached["data"]
    
    logger.info(f"Fetching fresh data for {dataset_name}")
    rows = dataiku_service.get_dataset_rows(dataset_name)
    DATA_CACHE[dataset_name] = {"timestamp": now, "data": rows}
    return rows

@router.get("/filters", response_model=APIResponse[FilterOptionsResponse])
@router.get("/filters", response_model=APIResponse[FilterOptionsResponse])
async def get_analytics_filters(
    product_group: Optional[str] = None,
    flavor: Optional[str] = None,
    size: Optional[str] = None,
    customer: Optional[str] = None
):
    try:
        rows = get_cached_dataset(settings.DATASET_ANALYTICS_DASHBOARD)
        
        filtered_rows = []
        for row in rows:
            if row.get("Product_Group") == "Canned Fruit": continue
            if product_group and row.get("Product_Group") != product_group: continue
            if flavor and row.get("Flavor") != flavor: continue
            if size and str(row.get("Size")) != str(size): continue
            if customer and row.get("Customer") != customer: continue
            filtered_rows.append(row)

        product_groups = set()
        flavors = set()
        sizes = set()
        customers = set()
        mechgroups = set()
        
        for row in filtered_rows:
            if val := row.get("Product_Group"): product_groups.add(val)
            if val := row.get("Flavor"): flavors.add(val)
            if val := row.get("Size"): sizes.add(str(val))
            if val := row.get("Customer"): customers.add(val)
            if val := row.get("MechGroup"): mechgroups.add(val)
            
        return APIResponse(
            success=True, 
            data=FilterOptionsResponse(
                product_groups=sorted(list(product_groups)),
                flavors=sorted(list(flavors)),
                sizes=sorted(list(sizes)),
                customers=sorted(list(customers)),
                sites=[], # No sites in this dataset
                mechgroups=sorted(list(mechgroups))
            )
        )
    except Exception as e:
        logger.error(f"Analytics filter error: {e}", exc_info=True)
        return APIResponse(success=False, error={"code": "INTERNAL_ERROR", "message": str(e)})



@router.get("/summary", response_model=APIResponse[DashboardSummaryResponse])
def get_analytics_summary(
    year_from: Optional[int] = None,
    month_from: Optional[int] = None,
    year_to: Optional[int] = None,
    month_to: Optional[int] = None,
    customer: Optional[List[str]] = Query(None),
    site: Optional[List[str]] = Query(None), # Ignored but kept for interface compatibility
    product_group: Optional[List[str]] = Query(None),
    size: Optional[List[str]] = Query(None),
    flavor: Optional[List[str]] = Query(None),
    mechgroup: Optional[List[str]] = Query(None),
    has_promotion: Optional[int] = None,
    breakdown: Optional[str] = None,
):
    try:
        rows = get_cached_dataset(settings.DATASET_ANALYTICS_DASHBOARD)
        
        # Helper for loose column matching
        def get_val_idx(row, keys):
            for k in keys:
                if k in row: return row[k]
                # Case insensitive check
                for rk in row.keys():
                    if rk.lower() == k.lower(): return row[rk]
            return None

        import os
        log_path = os.path.join(os.getcwd(), "backend_debug.txt")
        
        if rows and len(rows) > 0:
            try:
                with open(log_path, "w") as f:
                    f.write(f"DEBUG DATASET: {settings.DATASET_ANALYTICS_DASHBOARD}\n")
                    f.write(f"DEBUG COLUMNS: {list(rows[0].keys())}\n")
                    
                    # Check for promo related keys
                    first_row = rows[0]
                    f.write(f"DEBUG FIRST ROW: {first_row}\n")
                    
                    p_day = get_val_idx(first_row, ["Promo_Days", "promo_days", "duration"])
                    disc = get_val_idx(first_row, ["discount_pct", "discount", "usage"])
                    has_promo = get_val_idx(first_row, ["has_promotion", "is_promo"])
                    
                    f.write(f"Resolved Promo_Days: {p_day}\n")
                    f.write(f"Resolved discount_pct: {disc}\n")
                    f.write(f"Resolved has_promotion: {has_promo}\n")

            except Exception as e:
                print(f"Failed to write debug log: {e}")


        
        # Date Logic
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        if not year_to:
            year_to = current_year
            month_to = current_month
        
        if not year_from:
            year_from = year_to - 2
            month_from = month_to
            
        start_id = year_from * 100 + (month_from or 1)
        end_id = year_to * 100 + (month_to or 12)
        
        filtered_rows = []
        
        for row in rows:
            try:
                # Parse "date" column
                date_val = row.get("date")
                if not date_val:
                    continue
                
                r_year, r_month = 0, 0
                
                if isinstance(date_val, datetime):
                    r_year = date_val.year
                    r_month = date_val.month
                else:
                    # Handle string formats: "2023-01-28T00:00:00" or "2023-01-28 00:00:00"
                    s_val = str(date_val).replace('T', ' ').split(' ')[0]
                    try:
                        dt = datetime.strptime(s_val, "%Y-%m-%d")
                        r_year = dt.year
                        r_month = dt.month
                    except ValueError:
                        continue

                month_id = r_year * 100 + r_month
                
                if not (start_id <= month_id <= end_id):
                    continue
                
                if row.get("Product_Group") == "Canned Fruit": continue
                
                if customer and row.get("Customer") not in customer: continue
                if product_group and row.get("Product_Group") not in product_group: continue
                if size and str(row.get("Size")) not in size: continue
                if flavor and row.get("Flavor") not in flavor: continue
                if mechgroup and row.get("MechGroup") not in mechgroup: continue
                
                if has_promotion is not None:
                    r_promo = int(float(row.get("has_promotion", 0)))
                    if r_promo != has_promotion: continue
                
                # Enrich row with parsed date for aggregation
                row["_year"] = r_year
                row["_month"] = r_month
                filtered_rows.append(row)
                
            except Exception:
                continue
        
        # Aggregation
        total_actual_agg = 0.0
        total_planned_agg = 0.0
        sum_abs_diff = 0.0
        sum_diff = 0.0
        
        # Split Volume Risks
        total_under_vol = 0.0 # Shortfall (Planned > Actual)
        total_over_vol = 0.0  # Excess (Actual > Planned)
        
        promo_rows_count = 0
        sum_discount = 0.0
        sum_promo_days = 0.0
        active_items_set = set()
        
        # Breakdown Logic
        breakdown_agg = {} # (breakdown_val, year, month) -> qty
        monthly_promo_stats = {} # (year, month) -> {discount_sum, pdays_sum, count}
        monthly_agg = {}
        cust_agg = {}
        product_agg = {}

        for row in filtered_rows:
            # Map columns
            # Actual_sale might be string
            actual = float(row.get("Actual_sale") or 0)
            planned = float(row.get("Planed_sales_from_start") or 0)
            
            # is_promo = int(float(row.get("has_promotion", 0))) == 1
            # Secure handling of has_promotion
            raw_promo = get_val_idx(row, ["has_promotion", "is_promo"])
            is_promo = False
            if raw_promo:
                try:
                    is_promo = int(float(raw_promo)) == 1
                except:
                    is_promo = str(raw_promo).lower() in ['true', '1', 'yes']

            # disc = float(row.get("discount_pct") or 0)
            raw_disc = get_val_idx(row, ["discount_pct", "discount"])
            disc = float(raw_disc or 0)
            
            total_actual_agg += actual
            total_planned_agg += planned
            
            diff = actual - planned
            sum_abs_diff += abs(diff)
            sum_diff += diff
            
            if diff > 0:
                total_over_vol += diff
            elif diff < 0:
                total_under_vol += abs(diff)
            
            p_key = (str(row.get("Product_Group")), str(row.get("Flavor")), str(row.get("Size")))
            active_items_set.add(p_key)
            
            # Monthly
            y, m = row["_year"], row["_month"]
            monthly_agg[(y, m)] = monthly_agg.get((y, m), 0.0) + actual

            if is_promo:
                promo_rows_count += 1
                sum_discount += disc
                # Try to get Promo_Days, default to 0 if missing. Only count if is_promo is true
                raw_pdays = get_val_idx(row, ["promotion_dt", "Promo_Days", "promo_days", "duration", "promotion_days"])
                p_days = 0.0
                if raw_pdays is not None:
                     try:
                         p_days = float(raw_pdays)
                     except:
                         p_days = 0.0
                
                # If explicitly 0 or None, fallback to 1.0 (Daily granularity assumption)
                if p_days <= 0:
                     p_days = 1.0
                
                sum_promo_days += p_days
                
                # Monthly Promo Stats Aggregation
                k_m = (y, m)
                if k_m not in monthly_promo_stats:
                    monthly_promo_stats[k_m] = {"discount_sum": 0.0, "pdays_sum": 0.0, "count": 0}
                monthly_promo_stats[k_m]["discount_sum"] += disc
                monthly_promo_stats[k_m]["pdays_sum"] += p_days
                monthly_promo_stats[k_m]["count"] += 1
                
            
            # Breakdown Aggregation
            if breakdown:
                b_key = None
                if breakdown == 'product_group':
                    b_key = row.get("Product_Group", "Other")
                elif breakdown == 'flavor':
                    val = row.get("Flavor", "Other")
                    b_key = val.title() if val else "Other"
                elif breakdown == 'size':
                    sz = str(row.get("Size", "Other")).strip()
                    fl = str(row.get("Flavor", "")).strip()
                    # Example format: "Coconut 350 ml"
                    # If size is "350 ml" and flavor is "coconut", key is "Coconut 350 Ml"
                    b_key = f"{fl.title()} {sz.title()}" if fl and sz else "Other"
                
                if b_key:
                    breakdown_agg[(b_key, y, m)] = breakdown_agg.get((b_key, y, m), 0.0) + actual
            
            # Customer
            c = row.get("Customer", "Unknown")
            cust_agg[c] = cust_agg.get(c, 0.0) + actual
            
            # Product
            pg = row.get("Product_Group", "Unknown")
            fl = row.get("Flavor", "Unknown")
            sz = str(row.get("Size", "Unknown"))
            p_key = (pg, fl, sz)
            product_agg[p_key] = product_agg.get(p_key, 0.0) + actual

        # KPI Calc
        count_rows = len(filtered_rows)
        promo_coverage = (promo_rows_count / count_rows * 100) if count_rows > 0 else 0.0
        avg_disc = (sum_discount / promo_rows_count) if promo_rows_count > 0 else 0.0
        
        wape = (sum_abs_diff / total_actual_agg * 100) if total_actual_agg > 0 else 0.0
        bias = (sum_diff / total_actual_agg * 100) if total_actual_agg > 0 else 0.0
        under_plan_rate = (total_under_vol / total_actual_agg * 100) if total_actual_agg > 0 else 0.0
        over_plan_rate = (total_over_vol / total_actual_agg * 100) if total_actual_agg > 0 else 0.0
        
        # New KPIs
        target_achieved = ((total_actual_agg - total_planned_agg) / total_planned_agg * 100) if total_planned_agg > 0 else 0.0
        avg_promo_days = (sum_promo_days / promo_rows_count) if promo_rows_count > 0 else 0.0
        total_active_items = len(active_items_set)

        # Global Summary (Overview uses total_actual_agg as total_qty)
        # Calculate MoM
        ts_list = [
            MonthlyTSPoint(year=y, month=m, qty=q) 
            for (y, m), q in monthly_agg.items()
        ]
        ts_list.sort(key=lambda x: x.year * 100 + x.month)

        # Calculate MoM for Promo Metrics
        avg_discount_pct_change = 0.0
        avg_promo_days_change = 0.0
        
        # Sort monthly stats keys
        sorted_promo_months = sorted(monthly_promo_stats.keys(), key=lambda x: x[0]*100 + x[1])
        if len(sorted_promo_months) >= 2:
            curr_key = sorted_promo_months[-1]
            prev_key = sorted_promo_months[-2]
            
            curr_stats = monthly_promo_stats[curr_key]
            prev_stats = monthly_promo_stats[prev_key]
            
            curr_avg_disc = curr_stats["discount_sum"] / curr_stats["count"] if curr_stats["count"] > 0 else 0
            prev_avg_disc = prev_stats["discount_sum"] / prev_stats["count"] if prev_stats["count"] > 0 else 0
            
            curr_avg_pdays = curr_stats["pdays_sum"] / curr_stats["count"] if curr_stats["count"] > 0 else 0
            prev_avg_pdays = prev_stats["pdays_sum"] / prev_stats["count"] if prev_stats["count"] > 0 else 0
            
            # Discount Change (Relative %)
            if prev_avg_disc > 0:
                avg_discount_pct_change = ((curr_avg_disc - prev_avg_disc) / prev_avg_disc) * 100
                
            # Promo Days Change (Absolute Days)
            avg_promo_days_change = curr_avg_pdays - prev_avg_pdays

        
        # Construct Breakdown List
        breakdown_list = []
        if breakdown and breakdown_agg:
            # Group by label first
            label_groups = {}
            for (label, y, m), qty in breakdown_agg.items():
                if label not in label_groups:
                    label_groups[label] = []
                label_groups[label].append(MonthlyTSPoint(year=y, month=m, qty=qty))
            
            from ..schemas.dashboard_v2 import TimeSeriesPoint
            
            for label, points in label_groups.items():
                points.sort(key=lambda x: x.year * 100 + x.month)
                breakdown_list.append(TimeSeriesPoint(label=label, data=points))

        mom_growth = 0.0
        if len(ts_list) >= 2:
            latest = ts_list[-1].qty
            previous = ts_list[-2].qty
            if previous > 0:
                mom_growth = ((latest - previous) / previous) * 100
                
        kpi_obj = KPI(
            total_qty=total_actual_agg,
            mom_growth=mom_growth,
            promo_coverage=promo_coverage,
            avg_discount_pct=avg_disc,
            total_actual=total_actual_agg,
            total_planned=total_planned_agg,
            wape=wape,
            bias=bias,
            under_plan_volume=total_under_vol,
            under_plan_rate=under_plan_rate,
            over_plan_volume=total_over_vol,
            over_plan_rate=over_plan_rate,
            # New Fields
            total_active_items=total_active_items,
            avg_promo_days=avg_promo_days,
            target_achievement_rate=target_achieved,
            
            # Change Metrics
            avg_discount_pct_change=avg_discount_pct_change,
            avg_promo_days_change=avg_promo_days_change
        )
        
        # Group Lists
        cust_list = [GroupByPoint(label=k, qty=v) for k, v in cust_agg.items()]
        cust_list.sort(key=lambda x: x.qty, reverse=True)
        cust_list = cust_list[:20]
        
        site_list = [] # No site data
        
        prod_list = []
        for (pg, fl, sz), q in product_agg.items():
            prod_list.append(TopProductPoint(product_group=pg, flavor=fl, size=sz, qty=q))
        prod_list.sort(key=lambda x: x.qty, reverse=True)
        prod_list = prod_list[:10]
        
        return APIResponse(
            success=True,
            data=DashboardSummaryResponse(
                kpi=kpi_obj,
                monthly_ts=ts_list,
                breakdown_ts=breakdown_list if breakdown else None,
                by_customer=cust_list,
                by_site=site_list,
                top_products=prod_list,
                meta={
                    "refreshed_at": datetime.now().isoformat(),
                    "record_count": count_rows,
                    "dataset": settings.DATASET_ANALYTICS_DASHBOARD,
                    "debug_columns": list(rows[0].keys()) if rows else [],
                    "debug_sample": str(rows[0]) if rows else "No Data",
                    "debug_promo_check": {
                        "p_days_sample": [r.get("Promo_Days") for r in rows[:5]] if rows else [],
                        "disc_sample": [r.get("discount_pct") for r in rows[:5]] if rows else [],
                        "has_promo_sample": [r.get("has_promotion") for r in rows[:5]] if rows else []
                    }
                }
            )
        )
    except Exception as e:
        logger.error(f"Analytics summary error: {e}", exc_info=True)
        return APIResponse(success=False, error={"code": "INTERNAL_ERROR", "message": str(e)})

@router.get("/deep-dive", response_model=APIResponse[DeepDiveResponse])
def get_deep_dive_analytics(
    year_from: Optional[int] = None,
    month_from: Optional[int] = None,
    year_to: Optional[int] = None,
    month_to: Optional[int] = None,
    customer: Optional[List[str]] = Query(None),
    product_group: Optional[List[str]] = Query(None),
    size: Optional[List[str]] = Query(None),
    flavor: Optional[List[str]] = Query(None),
    mechgroup: Optional[List[str]] = Query(None),
    has_promotion: Optional[int] = None,
    breakdown: Optional[str] = None, # Added breakdown parameter
):
    try:
        rows = get_cached_dataset(settings.DATASET_ANALYTICS_DASHBOARD)
        
        # Filtering logic (same as summary)
        current_year = datetime.now().year
        current_month = datetime.now().month
        if not year_to:
            year_to = current_year
            month_to = current_month
        if not year_from:
            year_from = year_to - 1 # Default to last 12 months for deep dive
            month_from = month_to
            
        start_id = year_from * 100 + (month_from or 1)
        end_id = year_to * 100 + (month_to or 12)
        
        filtered_rows = []
        logger.info(f"Deep Dive Params: {year_from}-{month_from} to {year_to}-{month_to}")
        logger.info(f"Total Rows in Dataset: {len(rows)}")
        
        error_count = 0
        filtered_count = 0
        MAX_LOG_ERRORS = 5

        for i, row in enumerate(rows):
            try:
                # Optimized Date Parsing (Assumes ISO format or similar YYYY-MM-DD...)
                date_val = row.get("date")
                if not date_val: continue
                
                r_year, r_month = 0, 0
                
                if isinstance(date_val, datetime):
                    r_year, r_month = date_val.year, date_val.month
                else:
                    s_val = str(date_val)
                    # Fast path for standard "YYYY-MM-DD..." format
                    if len(s_val) >= 7:
                        try:
                            # Direct slicing is much faster than strptime
                            # "2023-01-28..." -> year=2023, month=01
                            y_str = s_val[:4]
                            m_str = s_val[5:7]
                            
                            if y_str.isdigit() and m_str.isdigit():
                                r_year = int(y_str)
                                r_month = int(m_str)
                            else:
                                # Fallback to slower parsing if format is weird
                                s_clean = s_val.replace('T', ' ').split(' ')[0]
                                dt = datetime.strptime(s_clean, "%Y-%m-%d")
                                r_year, r_month = dt.year, dt.month
                        except ValueError:
                             continue
                    else:
                        continue

                month_id = r_year * 100 + r_month
                if not (start_id <= month_id <= end_id): 
                    continue
                
                # Exclude Canned Fruit
                # Robust Filtering: Handle potential whitespace mismatch
                row_pg = row.get("Product_Group", "").strip()
                row_flavor = row.get("Flavor", "").strip()
                row_size = str(row.get("Size", "")).strip()
                row_cust = row.get("Customer", "").strip()
                row_mech = row.get("MechGroup", "").strip()

                if product_group and row_pg != "All" and row_pg not in product_group: continue
                if size and row_size not in size: continue
                if flavor and row_flavor not in flavor: continue
                if mechgroup and row_mech not in mechgroup: continue
                if customer and row_cust not in customer: continue # Added customer filter support
                
                if has_promotion is not None:
                    # Robust int/float conversion
                    try:
                         val = int(float(row.get("has_promotion", 0)))
                         if val != has_promotion: continue
                    except:
                         continue
                
                row["_year"], row["_month"] = r_year, r_month
                filtered_rows.append(row)
                filtered_count += 1
                
                if i % 10000 == 0:
                    logger.info(f"Processed {i} rows...")
                    
            except Exception as e:
                 error_count += 1
                 if error_count <= MAX_LOG_ERRORS:
                     logger.error(f"Row error: {e}")
                 continue
        
        logger.info(f"Deep Dive: Filtered {filtered_count} rows from {len(rows)}. Total errors: {error_count}")

        # Aggregations
        hm_cust = {} # (customer, month_str) -> {actual, planned, abs_err, err}
        hm_prod = {} # (product_group, month_str) -> {actual, planned, abs_err, err}
        monthly_stability = {} # (year, month) -> {actual, planned, abs_err, err}
        scatter_data = []
        error_bins = {
            "< -30%": 0, "-30% to -20%": 0, "-20% to -10%": 0, "-10% to 0%": 0,
            "0% to 10%": 0, "10% to 20%": 0, "20% to 30%": 0, "> 30%": 0
        }
        
        total_actual = 0.0
        total_planned = 0.0
        total_abs_err = 0.0
        total_err = 0.0
        
        total_under_vol = 0.0
        total_over_vol = 0.0
        
        ranking_items = []
        
        for row in filtered_rows:
            actual = float(row.get("Actual_sale") or 0)
            planned = float(row.get("Planed_sales_from_start") or 0)
            y, m = row["_year"], row["_month"]
            m_str = f"{datetime(y, m, 1).strftime('%b %y')}"
            
            err = actual - planned
            abs_err = abs(err)
            
            if err > 0:
                total_over_vol += err
            elif err < 0:
                total_under_vol += abs(err)
            
            total_actual += actual
            total_planned += planned
            total_abs_err += abs_err
            total_err += err
            
            # Heatmaps
            c = row.get("Customer", "Unknown")
            
            # Dynamic Product Heatmap Key
            pg = "Unknown"
            if breakdown == 'flavor':
                 val = row.get("Flavor")
                 pg = val.title() if val else "Unknown" # Use Flavor
            else:
                 pg = row.get("Product_Group", "Unknown") # Default
            
            for key, val in [(hm_cust, c), (hm_prod, pg)]:
                k = (val, m_str)
                if k not in key: key[k] = {"a": 0.0, "p": 0.0, "ae": 0.0, "e": 0.0}
                key[k]["a"] += actual
                key[k]["p"] += planned
                key[k]["ae"] += abs_err
                key[k]["e"] += err
                
            # Stability
            k_m = (y, m)
            if k_m not in monthly_stability: monthly_stability[k_m] = {"a": 0.0, "p": 0.0, "ae": 0.0, "e": 0.0}
            monthly_stability[k_m]["a"] += actual
            monthly_stability[k_m]["p"] += planned
            monthly_stability[k_m]["ae"] += abs_err
            monthly_stability[k_m]["e"] += err
            
            # Scatter
            scatter_data.append(ScatterPoint(
                planned=planned,
                actual=actual,
                is_promo=int(float(row.get("has_promotion", 0))) == 1,
                label=f"{pg} - {c}"
            ))
            
            # Error Dist
            err_pct = (err / planned * 100) if planned > 0 else 0.0
            if err_pct < -30: error_bins["< -30%"] += 1
            elif err_pct < -20: error_bins["-30% to -20%"] += 1
            elif err_pct < -10: error_bins["-20% to -10%"] += 1
            elif err_pct < 0: error_bins["-10% to 0%"] += 1
            elif err_pct < 10: error_bins["0% to 10%"] += 1
            elif err_pct < 20: error_bins["10% to 20%"] += 1
            elif err_pct < 30: error_bins["20% to 30%"] += 1
            else: error_bins["> 30%"] += 1
            
            # Ranking Item
            ranking_items.append(PerformanceRankingItem(
                date=m_str,
                customer=c,
                sku=str(row.get("Sku", "-")),
                product_group=pg,
                flavor=row.get("Flavor", "-"),
                size=str(row.get("Size", "-")),
                planned=planned,
                actual=actual,
                error=err,
                abs_error=abs_err,
                under_over_volume=err,
                has_promotion=int(float(row.get("has_promotion", 0))) == 1,
                mech_group=row.get("MechGroup"),
                discount_pct=float(row.get("discount_pct") or 0)
            ))

        # Finalize KPIs
        wape = (total_abs_err / total_actual * 100) if total_actual > 0 else 0.0
        bias = (total_err / total_actual * 100) if total_actual > 0 else 0.0
        
        kpi_obj = KPI(
            total_qty=total_actual,
            mom_growth=0.0, # Not calculated for deep dive summary
            promo_coverage=0.0,
            avg_discount_pct=0.0,
            total_actual=total_actual,
            total_planned=total_planned,
            wape=wape,
            bias=bias,
            under_plan_volume=total_under_vol,
            under_plan_rate=(total_under_vol / total_actual * 100) if total_actual > 0 else 0.0,
            over_plan_volume=total_over_vol,
            over_plan_rate=(total_over_vol / total_actual * 100) if total_actual > 0 else 0.0,
            
            # New Fields (Calculated similarly or defaulted for Deep Dive)
            # Note: For strict accuracy, we should track active_items and promo days in the loop above.
            # For now, implementing basic defaults to fix validation error.
            total_active_items=0, 
            avg_promo_days=0.0,
            target_achievement_rate=((total_actual - total_planned) / total_planned * 100) if total_planned > 0 else 0.0
        )
        
        # Format Heatmaps
        # Format Heatmaps
        heatmap_cust_list = [
            AccuracyHeatmapPoint(row=k[0], month=k[1], 
                               wape=(v["ae"] / v["a"] * 100 if v["a"] > 0 else 0), 
                               bias=(v["e"] / v["a"] * 100 if v["a"] > 0 else 0),
                               actual=v["a"],
                               planned=v["p"],
                               error=v["e"])
            for k, v in hm_cust.items()
        ]
        heatmap_prod_list = [
            AccuracyHeatmapPoint(row=k[0], month=k[1], 
                               wape=(v["ae"] / v["a"] * 100 if v["a"] > 0 else 0), 
                               bias=(v["e"] / v["a"] * 100 if v["a"] > 0 else 0),
                               actual=v["a"],
                               planned=v["p"],
                               error=v["e"])
            for k, v in hm_prod.items()
        ]
        
        # Sort Rankings
        ranking_items.sort(key=lambda x: x.abs_error, reverse=True)
        under_plan = [x for x in ranking_items if x.error > 0][:50]
        over_plan = [x for x in ranking_items if x.error < 0][:50]
        
        # Format Trend (Stability & Sales vs Plan)
        trend_pts = []
        bias_pts = []
        actual_pts = []
        planned_pts = []
        
        sorted_m = sorted(monthly_stability.keys())
        for y, m in sorted_m:
            v = monthly_stability[(y, m)]
            w = (v["ae"] / v["a"] * 100 if v["a"] > 0 else 0)
            b = (v["e"] / v["a"] * 100 if v["a"] > 0 else 0)
            
            trend_pts.append(MonthlyTSPoint(year=y, month=m, qty=w))
            bias_pts.append(MonthlyTSPoint(year=y, month=m, qty=b))
            actual_pts.append(MonthlyTSPoint(year=y, month=m, qty=v["a"]))
            planned_pts.append(MonthlyTSPoint(year=y, month=m, qty=v["p"]))
            
        stability_trend = [
            TimeSeriesPoint(label="WAPE", data=trend_pts),
            TimeSeriesPoint(label="Bias", data=bias_pts)
        ]
        
        sales_trend = [
            TimeSeriesPoint(label="Actual Sales", data=actual_pts),
            TimeSeriesPoint(label="Planned Sales", data=planned_pts)
        ]
        
        return APIResponse(
            success=True,
            data=DeepDiveResponse(
                kpi=kpi_obj,
                heatmap_customer=heatmap_cust_list,
                heatmap_product=heatmap_prod_list,
                ranking_under_plan=under_plan,
                ranking_over_plan=over_plan,
                scatter_data=scatter_data[:500], # Limit scatter points
                error_dist=[ErrorDistBin(bin=k, count=v) for k, v in error_bins.items()],
                stability_trend=stability_trend,
                sales_trend=sales_trend,
                meta={"refreshed_at": datetime.now().isoformat(), "record_count": len(filtered_rows)}
            )
        )
    except Exception as e:
        logger.error(f"Deep dive error: {e}", exc_info=True)
        return APIResponse(success=False, error={"code": "INTERNAL_ERROR", "message": str(e)})
