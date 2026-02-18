from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from ..schemas.common import APIResponse
from ..schemas.dashboard_v2 import (
    DashboardSummaryResponse, 
    DashboardFilters, 
    KPI, 
    MonthlyTSPoint, 
    GroupByPoint, 
    TopProductPoint,
    FilterOptionsResponse
)
from ..services.dataiku_service import dataiku_service
from ..config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory cache for dashboard data (simple implementation)
DATA_CACHE = {}
CACHE_TTL = 300 # 5 minutes

def get_cached_dataset(dataset_name: str):
    now = datetime.now().timestamp()
    if dataset_name in DATA_CACHE:
        cached = DATA_CACHE[dataset_name]
        if now - cached["timestamp"] < CACHE_TTL:
            logger.info(f"Using cached data for {dataset_name}")
            return cached["data"]
    
    # Fetch fresh data
    logger.info(f"Fetching fresh data for {dataset_name}")
    rows = dataiku_service.get_dataset_rows(dataset_name)
    DATA_CACHE[dataset_name] = {"timestamp": now, "data": rows}
    return rows

@router.get("/filters", response_model=APIResponse[FilterOptionsResponse])
async def get_dashboard_filters(
    product_group: Optional[str] = None,
    flavor: Optional[str] = None,
    size: Optional[str] = None,
    customer: Optional[str] = None
):
    """
    Fetch unique filter values from the dataset, optionally filtered by current selection.
    """
    try:
        rows = get_cached_dataset(settings.DATASET_DASHBOARD_SUMMARY)
        
        product_groups = set()
        flavors = set()
        sizes = set()
        customers = set()
        sites = set()
        mechgroups = set()
        
        for row in rows:
            # Apply cascading filters
            if product_group and row.get("Product_Group") != product_group: continue
            if flavor and row.get("Flavor") != flavor: continue
            if size and str(row.get("Size")) != str(size): continue
            if customer and row.get("Customer") != customer: continue

            # Collect options
            if val := row.get("Product_Group"): 
                if val != "Canned Fruit":
                    product_groups.add(val)
            if val := row.get("Flavor"): flavors.add(val)
            if val := row.get("Size"): sizes.add(str(val))
            if val := row.get("Customer"): customers.add(val)
            if val := row.get("site_name_public"): sites.add(val)
            if val := row.get("MechGroup"): mechgroups.add(val)
            
        return APIResponse(
            success=True, 
            data=FilterOptionsResponse(
                product_groups=sorted(list(product_groups)),
                flavors=sorted(list(flavors)),
                sizes=sorted(list(sizes)),
                customers=sorted(list(customers)),
                sites=sorted(list(sites)),
                mechgroups=sorted(list(mechgroups))
            )
        )
    except Exception as e:
        logger.error(f"Filter options error: {e}", exc_info=True)
        return APIResponse(
            success=False, 
            error={"code": "INTERNAL_ERROR", "message": str(e)}
        )

@router.get("/summary", response_model=APIResponse[DashboardSummaryResponse])
def get_dashboard_summary(
    year_from: Optional[int] = None,
    month_from: Optional[int] = None,
    year_to: Optional[int] = None,
    month_to: Optional[int] = None,
    customer: Optional[List[str]] = Query(None),
    site: Optional[List[str]] = Query(None),
    product_group: Optional[List[str]] = Query(None),
    size: Optional[List[str]] = Query(None),
    flavor: Optional[List[str]] = Query(None),
    mechgroup: Optional[List[str]] = Query(None),
    has_promotion: Optional[int] = None,
):
    try:
        # 1. Read Data (Cached)
        rows = get_cached_dataset(settings.DATASET_DASHBOARD_SUMMARY)
        
        # 2. Prepare Filter Logic
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
        
        # 3. Apply Filters
        for row in rows:
            try:
                # Exclude Canned Fruit
                if row.get("Product_Group") == "Canned Fruit":
                    continue

                # Parse date (Legacy format: Billing_Date_year, Billing_Date_month)
                r_year = int(row.get("Billing_Date_year", 0))
                r_month = int(row.get("Billing_Date_month", 0))
                month_id = r_year * 100 + r_month
                
                if not (start_id <= month_id <= end_id): continue

                # Multi-select logic: if list is provided, check if value IN list
                # Note: FastAPI parses query params. If client sends ?customer=A&customer=B, customer is ['A', 'B']
                if customer and row.get("Customer") not in customer: continue
                if site and row.get("site_name_public") not in site: continue
                if product_group and row.get("Product_Group") not in product_group: continue
                if size and str(row.get("Size")) not in size: continue
                if flavor and row.get("Flavor") not in flavor: continue
                if mechgroup and row.get("MechGroup") not in mechgroup: continue
                
                if has_promotion is not None:
                    r_promo = int(row.get("has_promotion", 0))
                    if r_promo != has_promotion: continue
                
                filtered_rows.append(row)
                
            except Exception:
                continue
        
        # 4. Aggregation
        total_qty = 0.0
        promo_rows_count = 0
        sum_discount_pct_on_promo = 0.0
        count_rows = len(filtered_rows)
        
        monthly_agg = {}   # (year, month) -> qty
        cust_agg = {}      # customer -> qty
        site_agg = {}      # site -> qty
        product_agg = {}   # (group, flavor, size) -> qty
        
        for row in filtered_rows:
            qty = float(row.get("Quantity_sum", 0))
            is_promo = int(row.get("has_promotion", 0)) == 1
            disc = float(row.get("discount_pct", 0))
            
            total_qty += qty
            if is_promo:
                promo_rows_count += 1
                sum_discount_pct_on_promo += disc
            
            # Monthly TS
            y, m = int(row.get("Billing_Date_year")), int(row.get("Billing_Date_month"))
            monthly_agg[(y, m)] = monthly_agg.get((y, m), 0.0) + qty
            
            # By Customer
            c = row.get("Customer", "Unknown")
            cust_agg[c] = cust_agg.get(c, 0.0) + qty
            
            # By Site
            s = row.get("site_name_public", "Unknown")
            site_agg[s] = site_agg.get(s, 0.0) + qty
            
            # Top Products
            pg = row.get("Product_Group", "Unknown")
            fl = row.get("Flavor", "Unknown")
            sz = str(row.get("Size", "Unknown"))
            p_key = (pg, fl, sz)
            product_agg[p_key] = product_agg.get(p_key, 0.0) + qty

        # 5. Construct Response Objects
        ts_list = [
            MonthlyTSPoint(year=y, month=m, qty=q) 
            for (y, m), q in monthly_agg.items()
        ]
        ts_list.sort(key=lambda x: x.year * 100 + x.month)
        
        mom_growth = 0.0
        if len(ts_list) >= 2:
            latest = ts_list[-1].qty
            previous = ts_list[-2].qty
            if previous > 0:
                mom_growth = ((latest - previous) / previous) * 100
        
        promo_coverage = (promo_rows_count / count_rows * 100) if count_rows > 0 else 0.0
        avg_disc = (sum_discount_pct_on_promo / promo_rows_count) if promo_rows_count > 0 else 0.0
        
        # Original KPI object (Zero out new fields since this dataset doesn't have them)
        kpi_obj = KPI(
            total_qty=total_qty,
            mom_growth=mom_growth,
            promo_coverage=promo_coverage,
            avg_discount_pct=avg_disc,
            total_actual=total_qty,
            total_planned=0,
            wape=0,
            bias=0,
            under_plan_volume=0,
            under_plan_rate=0,
            over_plan_volume=0,
            over_plan_rate=0,
            # New Fields
            total_active_items=len(product_agg),
            avg_promo_days=0.0, # Not available in this dataset
            target_achievement_rate=0.0
        )
        
        cust_list = [GroupByPoint(label=k, qty=v) for k, v in cust_agg.items()]
        cust_list.sort(key=lambda x: x.qty, reverse=True)
        cust_list = cust_list[:20]
        
        site_list = [GroupByPoint(label=k, qty=v) for k, v in site_agg.items()]
        site_list.sort(key=lambda x: x.qty, reverse=True)
        
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
                by_customer=cust_list,
                by_site=site_list,
                top_products=prod_list,
                meta={
                    "refreshed_at": datetime.now().isoformat(),
                    "record_count": count_rows,
                    "dataset": settings.DATASET_DASHBOARD_SUMMARY
                }
            )
        )
        
    except Exception as e:
        logger.error(f"Dashboard summary error: {e}", exc_info=True)
        return APIResponse(success=False, error={"code": "INTERNAL_ERROR", "message": str(e)})
