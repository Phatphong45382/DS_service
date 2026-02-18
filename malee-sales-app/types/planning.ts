// Planning System Types

export interface SalesMonthly {
    year_month: string; // Format: "2024-01"
    flavor: string;
    size: number | string; // ml or oz string
    sales_qty: number;
    channel?: string;
}

export interface PromoMonthly {
    year_month: string;
    flavor: string;
    size: number | string;
    promo_flag: boolean;
    promo_days: number;
    discount_pct: number;
    promo_type?: 'price_cut' | 'bundle' | 'bogo';
}

export interface ForecastData {
    year_month: string;
    flavor: string;
    size: number | string;
    forecast_qty: number;
    baseline_forecast?: number;
    scenario_forecast?: number;
    confidence_lower?: number;
    confidence_upper?: number;
}

export interface ProductionPlan {
    year_month: string;
    flavor: string;
    size: number | string;
    baseline_forecast: number;
    scenario_forecast?: number;
    buffer_pct: number;
    recommended_qty: number;
    min_qty?: number;
    max_qty?: number;
    capacity_violation_flag: boolean;
    note?: string;
}

export interface Alert {
    id: string;
    date: string;
    flavor: string;
    size: number | string;
    alert_type: 'demand_spike' | 'demand_drop' | 'forecast_drift' | 'promo_conflict' | 'capacity_issue';
    severity: 'low' | 'medium' | 'high';
    message: string;
    recommended_action: string[];
}

export interface ScenarioParams {
    // Forecast params
    horizon: 1 | 3 | 6;
    method: 'baseline' | 'model';
    smoothing_window?: 3 | 6 | 12;

    // Promo params
    promo_enabled: boolean;
    promo_days?: number;
    discount_pct?: number;
    promo_type?: 'price_cut' | 'bundle' | 'bogo';
    uplift_pct?: number;

    // Production params
    safety_stock_pct: number;
    capacity_min?: number;
    capacity_max?: number;
    moq?: number;
    batch_size?: number;
    lead_time?: number;
}

export interface GlobalFilters {
    product_group: string | 'all';
    flavor: string | 'all';
    size: string | 'all';
    customer?: string | 'all';
    site?: string | 'all';
    mechgroup?: string | 'all';
    channel?: string | 'all';
    has_promotion?: number | 'all';
    date_range: {
        start: string;
        end: string;
    };
}

export interface GlobalSummary {
    total_revenue?: number;
    last_month_actual: number;
    next_month_forecast: number;
    recommended_production: number;
    risk_badge: 'Low' | 'Med' | 'High';
}

// Validation types for upload
export interface ValidationCheck {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: string;
}

export interface UploadSummary {
    rowCount: number;
    columnCount: number;
    dateRange: { min: string; max: string };
    uniqueFlavors: number;
    uniqueSizes: number;
    promoMonths?: number;
}

export interface ForecastRunProgress {
    currentStep: number;
    totalSteps: number;
    stepName: string;
    progress: number; // 0-100
}

export interface ForecastRunResult {
    run_id: string;
    timestamp: string;
    status: 'running' | 'completed' | 'failed';
    progress?: ForecastRunProgress;
    results?: {
        forecast: ForecastData[];
        productionPlan: ProductionPlan[];
        summary: GlobalSummary;
    };
    error?: string;
}
export interface FilterOptionsResponse {
    product_groups: string[];
    flavors: string[];
    sizes: string[];
    customers: string[];
    sites: string[];
    mechgroups: string[];
}
export interface KPI {
    total_qty: number;
    mom_growth: number;
    promo_coverage: number;
    avg_discount_pct: number;

    // New KPIs
    total_actual: number;
    total_planned: number;
    wape: number;
    bias: number;
    under_plan_volume: number;
    under_plan_rate: number;
    over_plan_volume?: number;
    over_plan_rate?: number;

    // New KPIs
    total_active_items?: number;
    avg_promo_days?: number;
    target_achievement_rate?: number;

    // Change Metrics
    avg_discount_pct_change?: number;
    avg_promo_days_change?: number;
}
