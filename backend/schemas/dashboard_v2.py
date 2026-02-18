from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel

class DashboardFilters(BaseModel):
    year_from: Optional[int] = None
    month_from: Optional[int] = None
    year_to: Optional[int] = None
    month_to: Optional[int] = None
    customer: Optional[Union[List[str], str]] = None
    site: Optional[Union[List[str], str]] = None
    product_group: Optional[Union[List[str], str]] = None
    size: Optional[Union[List[str], int, str]] = None
    flavor: Optional[Union[List[str], str]] = None
    mechgroup: Optional[Union[List[str], str]] = None
    has_promotion: Optional[int] = None

class KPI(BaseModel):
    total_qty: float
    mom_growth: float  # Percentage change from previous month
    promo_coverage: float  # Percentage of sales with promotion
    avg_discount_pct: float  # Average discount specifically for promo items
    
    # New KPIs
    total_actual: float
    total_planned: float
    wape: float
    bias: float
    under_plan_volume: float
    under_plan_rate: float # Volume based rate
    over_plan_volume: float
    over_plan_volume: float
    over_plan_rate: float
    
    # User Requested KPIs
    total_active_items: int
    avg_promo_days: float
    target_achievement_rate: float
    
    # Change Metrics
    avg_discount_pct_change: Optional[float] = 0.0
    avg_promo_days_change: Optional[float] = 0.0

class MonthlyTSPoint(BaseModel):
    year: int
    month: int
    qty: float

class GroupByPoint(BaseModel):
    label: str
    qty: float

class TopProductPoint(BaseModel):
    product_group: str
    flavor: str
    size: str
    qty: float

class TimeSeriesPoint(BaseModel):
    label: str
    data: List[MonthlyTSPoint]

class DashboardSummaryResponse(BaseModel):
    kpi: KPI
    monthly_ts: List[MonthlyTSPoint]
    breakdown_ts: Optional[List[TimeSeriesPoint]] = None
    by_customer: List[GroupByPoint]
    by_site: List[GroupByPoint]
    top_products: List[TopProductPoint]
    meta: Dict[str, Any]
class FilterOptionsResponse(BaseModel):
    product_groups: List[str]
    flavors: List[str]
    sizes: List[str]
    customers: List[str]
    sites: List[str]
    mechgroups: List[str]

class AccuracyHeatmapPoint(BaseModel):
    row: str
    month: str
    wape: float
    bias: float
    actual: float
    planned: float
    error: float

class PerformanceRankingItem(BaseModel):
    date: str
    customer: str
    sku: str
    product_group: str
    flavor: str
    size: str
    planned: float
    actual: float
    error: float
    abs_error: float
    under_over_volume: float
    has_promotion: bool
    mech_group: Optional[str] = None
    discount_pct: float

class ScatterPoint(BaseModel):
    planned: float
    actual: float
    is_promo: bool
    label: str

class ErrorDistBin(BaseModel):
    bin: str
    count: int

class DeepDiveResponse(BaseModel):
    kpi: KPI
    heatmap_customer: List[AccuracyHeatmapPoint]
    heatmap_product: List[AccuracyHeatmapPoint]
    ranking_under_plan: List[PerformanceRankingItem]
    ranking_over_plan: List[PerformanceRankingItem]
    scatter_data: List[ScatterPoint]
    error_dist: List[ErrorDistBin]
    stability_trend: List[TimeSeriesPoint]
    sales_trend: List[TimeSeriesPoint]
    meta: Dict[str, Any]
