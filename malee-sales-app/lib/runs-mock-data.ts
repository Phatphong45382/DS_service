import type {
  ForecastRun,
  RunReport,
  CompareResult,
  ForecastPoint,
  ExecutiveKPI,
  RiskAssessment,
  ConfidenceLevel,
  RecommendedAction,
  DriverContribution,
  ValidationReport,
} from "@/types/runs";

// --- Forecast Runs List ---

export const mockRuns: ForecastRun[] = [
  {
    id: "run-001",
    createdAt: "2025-06-15T10:32:00Z",
    completedAt: "2025-06-15T10:35:42Z",
    status: "success",
    modelName: "XGBoost",
    modelVersion: "v2.4.1",
    dataSource: "SAP ERP + Weather API",
    horizon: 6,
    owner: "Somchai T.",
    notes: "Monthly baseline run with weather features",
    durationSeconds: 222,
  },
  {
    id: "run-002",
    createdAt: "2025-06-14T08:15:00Z",
    completedAt: "2025-06-14T08:18:30Z",
    status: "success",
    modelName: "LightGBM",
    modelVersion: "v1.8.0",
    dataSource: "SAP ERP",
    horizon: 3,
    owner: "Priya K.",
    notes: "Quick 3-month forecast for Q3 planning",
    durationSeconds: 210,
  },
  {
    id: "run-003",
    createdAt: "2025-06-13T14:45:00Z",
    status: "running",
    modelName: "XGBoost",
    modelVersion: "v2.4.1",
    dataSource: "SAP ERP + Promo Calendar",
    horizon: 12,
    owner: "Somchai T.",
    notes: "Annual forecast with promotion effects",
  },
  {
    id: "run-004",
    createdAt: "2025-06-12T09:00:00Z",
    completedAt: "2025-06-12T09:04:15Z",
    status: "success",
    modelName: "Prophet",
    modelVersion: "v1.1.2",
    dataSource: "Manual Upload (CSV)",
    horizon: 6,
    owner: "Admin",
    notes: "Prophet comparison run",
    durationSeconds: 255,
  },
  {
    id: "run-005",
    createdAt: "2025-06-11T16:20:00Z",
    completedAt: "2025-06-11T16:21:05Z",
    status: "failed",
    modelName: "XGBoost",
    modelVersion: "v2.4.1",
    dataSource: "Manual Upload (CSV)",
    horizon: 6,
    owner: "Priya K.",
    notes: "Failed - missing date column in upload",
    durationSeconds: 65,
  },
  {
    id: "run-006",
    createdAt: "2025-06-10T11:30:00Z",
    completedAt: "2025-06-10T11:34:00Z",
    status: "success",
    modelName: "LightGBM",
    modelVersion: "v1.8.0",
    dataSource: "SAP ERP",
    horizon: 6,
    owner: "Somchai T.",
    durationSeconds: 240,
  },
  {
    id: "run-007",
    createdAt: "2025-06-16T07:00:00Z",
    status: "queued",
    modelName: "XGBoost",
    modelVersion: "v2.4.1",
    dataSource: "SAP ERP + Weather API",
    horizon: 6,
    owner: "Admin",
    notes: "Scheduled morning run",
  },
];

// --- Forecast data for run-001 ---

const forecastDataRun001: ForecastPoint[] = [
  { month: "Jan 2025", actual: 124500, forecast: 122000, p10: 110000, p90: 134000, plan: 120000 },
  { month: "Feb 2025", actual: 118200, forecast: 119500, p10: 107000, p90: 132000, plan: 118000 },
  { month: "Mar 2025", actual: 135800, forecast: 133000, p10: 120000, p90: 146000, plan: 130000 },
  { month: "Apr 2025", actual: 142300, forecast: 140500, p10: 126000, p90: 155000, plan: 138000 },
  { month: "May 2025", actual: 156700, forecast: 152000, p10: 137000, p90: 167000, plan: 150000 },
  { month: "Jun 2025", actual: 163400, forecast: 160000, p10: 144000, p90: 176000, plan: 158000 },
  { month: "Jul 2025", forecast: 171000, p10: 154000, p90: 188000, plan: 165000 },
  { month: "Aug 2025", forecast: 168500, p10: 151000, p90: 186000, plan: 162000 },
  { month: "Sep 2025", forecast: 155000, p10: 139000, p90: 171000, plan: 155000 },
  { month: "Oct 2025", forecast: 148000, p10: 133000, p90: 163000, plan: 148000 },
  { month: "Nov 2025", forecast: 162000, p10: 146000, p90: 178000, plan: 160000 },
  { month: "Dec 2025", forecast: 185000, p10: 166000, p90: 204000, plan: 180000 },
];

const kpisRun001: ExecutiveKPI[] = [
  {
    label: "Total Forecast (6mo)",
    value: "1,289,500",
    subValue: "Jul - Dec 2025",
    delta: "+59,500",
    deltaPercent: "+4.8%",
    deltaDirection: "up",
    type: "forecast",
  },
  {
    label: "Delta vs Plan",
    value: "+4.8%",
    subValue: "+59,500 units above plan",
    delta: "+59,500",
    deltaDirection: "up",
    type: "delta",
  },
  {
    label: "Risk Level",
    value: "Medium",
    subValue: "Aug, Dec flagged",
    type: "risk",
  },
  {
    label: "Confidence",
    value: "High",
    subValue: "MAPE 4.2% | R\u00B2 0.94",
    type: "confidence",
  },
];

const riskRun001: RiskAssessment = {
  level: "Medium",
  highRiskMonths: ["Aug 2025", "Dec 2025"],
  summary:
    "August shows a potential demand dip following seasonal peak. December has high variance due to holiday promotional uncertainty.",
};

const confidenceRun001: ConfidenceLevel = {
  level: "High",
  reasons: [
    "MAPE of 4.2% across training period indicates strong predictive accuracy",
    "R-squared of 0.94 demonstrates excellent model fit with weather features",
  ],
};

const recommendedActionsRun001: RecommendedAction = {
  productionVolume: "1,350,000 units",
  safetyStockPercent: 12,
  stockoutRiskMonths: ["Jul 2025", "Dec 2025"],
  overstockRiskMonths: ["Aug 2025", "Sep 2025"],
  assumptions: [
    "Assumes no major supply chain disruptions in H2 2025",
    "Weather patterns based on 5-year historical average",
    "No new competitor product launches in this period",
  ],
};

const driversRun001: DriverContribution[] = [
  { feature: "Seasonality", impact: 35, direction: "positive", description: "Summer peak drives higher demand in Jul-Aug" },
  { feature: "Temperature Index", impact: 22, direction: "positive", description: "Hot weather increases beverage consumption" },
  { feature: "Promotion Calendar", impact: 18, direction: "positive", description: "Planned promotions in Jul and Dec" },
  { feature: "Price Elasticity", impact: 12, direction: "negative", description: "5% price increase in Jun expected to reduce volume" },
  { feature: "GDP Growth", impact: 8, direction: "positive", description: "Thai GDP growth at 3.2% supports consumer spending" },
  { feature: "Competitor Activity", impact: 5, direction: "negative", description: "New competitor SKU launch in Aug" },
];

const validationRun001: ValidationReport = {
  issues: [
    { type: "outlier", severity: "warning", message: "3 outlier values detected in revenue column (>3 std dev)", count: 3 },
    { type: "date_gap", severity: "info", message: "1 missing date in Feb 2024 (public holiday)", count: 1 },
    { type: "duplicate", severity: "info", message: "No duplicate rows found", count: 0 },
    { type: "missing_column", severity: "info", message: "All required columns present", count: 0 },
  ],
  schema: [
    { name: "date", type: "datetime64", nonNullCount: 720, totalCount: 720, sampleValues: ["2019-01-01", "2019-02-01", "2025-06-01"] },
    { name: "sales_volume", type: "int64", nonNullCount: 720, totalCount: 720, sampleValues: ["124500", "118200", "135800"] },
    { name: "revenue", type: "float64", nonNullCount: 718, totalCount: 720, sampleValues: ["3,112,500", "2,955,000", "3,395,000"] },
    { name: "temperature_avg", type: "float64", nonNullCount: 720, totalCount: 720, sampleValues: ["28.5", "30.2", "33.1"] },
    { name: "promo_flag", type: "int64", nonNullCount: 720, totalCount: 720, sampleValues: ["0", "1", "1"] },
    { name: "sku_id", type: "string", nonNullCount: 720, totalCount: 720, sampleValues: ["MLG-001", "MLG-002", "MLG-003"] },
  ],
  sampleRows: [
    { date: "2025-01-01", sales_volume: 124500, revenue: 3112500, temperature_avg: 28.5, promo_flag: 0, sku_id: "MLG-001" },
    { date: "2025-02-01", sales_volume: 118200, revenue: 2955000, temperature_avg: 30.2, promo_flag: 0, sku_id: "MLG-001" },
    { date: "2025-03-01", sales_volume: 135800, revenue: 3395000, temperature_avg: 33.1, promo_flag: 1, sku_id: "MLG-001" },
    { date: "2025-04-01", sales_volume: 142300, revenue: 3557500, temperature_avg: 35.0, promo_flag: 0, sku_id: "MLG-001" },
    { date: "2025-05-01", sales_volume: 156700, revenue: 3917500, temperature_avg: 34.2, promo_flag: 1, sku_id: "MLG-001" },
  ],
  logs: [
    { timestamp: "2025-06-15T10:32:00Z", level: "info", message: "Forecast run initiated - Run ID: run-001" },
    { timestamp: "2025-06-15T10:32:05Z", level: "info", message: "Data loaded: 720 rows, 6 columns from SAP ERP + Weather API" },
    { timestamp: "2025-06-15T10:32:15Z", level: "info", message: "Schema validation passed. All required columns present." },
    { timestamp: "2025-06-15T10:32:20Z", level: "warning", message: "3 outlier values detected in revenue column (>3 std dev). Capped at 99th percentile." },
    { timestamp: "2025-06-15T10:32:25Z", level: "info", message: "1 date gap found in Feb 2024. Interpolated using forward fill." },
    { timestamp: "2025-06-15T10:33:00Z", level: "info", message: "Feature engineering complete. 12 features generated." },
    { timestamp: "2025-06-15T10:34:30Z", level: "info", message: "XGBoost v2.4.1 training complete. MAPE: 4.2%, R2: 0.94" },
    { timestamp: "2025-06-15T10:35:00Z", level: "info", message: "Generating 6-month forecast with P10/P90 confidence intervals." },
    { timestamp: "2025-06-15T10:35:42Z", level: "info", message: "Forecast run completed successfully in 222 seconds." },
  ],
};

export const mockRunReports: Record<string, RunReport> = {
  "run-001": {
    run: mockRuns[0],
    kpis: kpisRun001,
    risk: riskRun001,
    confidence: confidenceRun001,
    recommendedActions: recommendedActionsRun001,
    forecastData: forecastDataRun001,
    drivers: driversRun001,
    narrative:
      "This forecast shows a strong upward trend through summer 2025, driven primarily by seasonality and elevated temperatures. The XGBoost model with weather features captures the seasonal pattern with high accuracy (MAPE 4.2%). Key risks include a potential demand dip in August as the monsoon season begins, and high variance in December due to uncertain holiday promotion effects. The model recommends increasing safety stock to 12% for the forecast horizon.",
    previousRunComparison: [
      "Total forecast is 3.2% higher than the previous LightGBM run (run-002)",
      "Risk level upgraded from Low to Medium due to December holiday uncertainty",
      "Confidence improved from Medium to High with addition of weather features",
    ],
    validation: validationRun001,
  },
  "run-002": {
    run: mockRuns[1],
    kpis: [
      { label: "Total Forecast (3mo)", value: "478,000", subValue: "Jul - Sep 2025", delta: "+18,000", deltaPercent: "+3.9%", deltaDirection: "up", type: "forecast" },
      { label: "Delta vs Plan", value: "+3.9%", subValue: "+18,000 units above plan", delta: "+18,000", deltaDirection: "up", type: "delta" },
      { label: "Risk Level", value: "Low", subValue: "No months flagged", type: "risk" },
      { label: "Confidence", value: "Medium", subValue: "MAPE 5.8% | R\u00B2 0.89", type: "confidence" },
    ],
    risk: { level: "Low", highRiskMonths: [], summary: "Short horizon with stable demand patterns. No significant risk factors identified." },
    confidence: { level: "Medium", reasons: ["MAPE of 5.8% is acceptable but could improve with additional features", "R-squared of 0.89 indicates good but not excellent fit"] },
    recommendedActions: {
      productionVolume: "500,000 units",
      safetyStockPercent: 8,
      stockoutRiskMonths: [],
      overstockRiskMonths: ["Sep 2025"],
      assumptions: ["Assumes stable pricing through Q3", "No major weather anomalies expected"],
    },
    forecastData: [
      { month: "Jan 2025", actual: 124500, forecast: 123000, p10: 111000, p90: 135000, plan: 120000 },
      { month: "Feb 2025", actual: 118200, forecast: 117000, p10: 105000, p90: 129000, plan: 118000 },
      { month: "Mar 2025", actual: 135800, forecast: 132000, p10: 119000, p90: 145000, plan: 130000 },
      { month: "Apr 2025", actual: 142300, forecast: 139000, p10: 125000, p90: 153000, plan: 138000 },
      { month: "May 2025", actual: 156700, forecast: 150000, p10: 135000, p90: 165000, plan: 150000 },
      { month: "Jun 2025", actual: 163400, forecast: 158000, p10: 142000, p90: 174000, plan: 158000 },
      { month: "Jul 2025", forecast: 165000, p10: 148000, p90: 182000, plan: 165000 },
      { month: "Aug 2025", forecast: 160000, p10: 144000, p90: 176000, plan: 162000 },
      { month: "Sep 2025", forecast: 153000, p10: 138000, p90: 168000, plan: 155000 },
    ],
    drivers: [
      { feature: "Seasonality", impact: 40, direction: "positive", description: "Summer demand peak" },
      { feature: "Promotion Calendar", impact: 25, direction: "positive", description: "Q3 promotions" },
      { feature: "Trend", impact: 20, direction: "positive", description: "Year-over-year growth trend" },
      { feature: "Price Elasticity", impact: 10, direction: "negative", description: "Slight price sensitivity" },
      { feature: "Competitor Activity", impact: 5, direction: "negative", description: "Competitor promo overlap" },
    ],
    narrative:
      "Short-term 3-month forecast using LightGBM shows stable growth through Q3 2025. Without weather features, the model relies on trend and seasonality, resulting in a slightly higher MAPE compared to the XGBoost weather model.",
    previousRunComparison: [
      "First LightGBM run for this dataset",
      "3.2% lower total forecast compared to XGBoost 6-month projection for the same period",
    ],
    validation: {
      issues: [
        { type: "outlier", severity: "warning", message: "2 outlier values in revenue column", count: 2 },
        { type: "missing_column", severity: "info", message: "All required columns present", count: 0 },
        { type: "date_gap", severity: "info", message: "No date gaps found", count: 0 },
        { type: "duplicate", severity: "info", message: "No duplicate rows found", count: 0 },
      ],
      schema: [
        { name: "date", type: "datetime64", nonNullCount: 720, totalCount: 720, sampleValues: ["2019-01-01", "2025-06-01"] },
        { name: "sales_volume", type: "int64", nonNullCount: 720, totalCount: 720, sampleValues: ["124500", "118200"] },
        { name: "revenue", type: "float64", nonNullCount: 718, totalCount: 720, sampleValues: ["3,112,500", "2,955,000"] },
        { name: "sku_id", type: "string", nonNullCount: 720, totalCount: 720, sampleValues: ["MLG-001", "MLG-002"] },
      ],
      sampleRows: [
        { date: "2025-01-01", sales_volume: 124500, revenue: 3112500, sku_id: "MLG-001" },
        { date: "2025-02-01", sales_volume: 118200, revenue: 2955000, sku_id: "MLG-001" },
      ],
      logs: [
        { timestamp: "2025-06-14T08:15:00Z", level: "info", message: "Forecast run initiated - Run ID: run-002" },
        { timestamp: "2025-06-14T08:18:30Z", level: "info", message: "Forecast run completed successfully in 210 seconds." },
      ],
    },
  },
  "run-004": {
    run: mockRuns[3],
    kpis: [
      { label: "Total Forecast (6mo)", value: "1,245,000", subValue: "Jul - Dec 2025", delta: "+15,000", deltaPercent: "+1.2%", deltaDirection: "up", type: "forecast" },
      { label: "Delta vs Plan", value: "+1.2%", subValue: "+15,000 units above plan", delta: "+15,000", deltaDirection: "up", type: "delta" },
      { label: "Risk Level", value: "Low", subValue: "No months flagged", type: "risk" },
      { label: "Confidence", value: "Medium", subValue: "MAPE 6.1% | R\u00B2 0.87", type: "confidence" },
    ],
    risk: { level: "Low", highRiskMonths: [], summary: "Prophet decomposition shows stable trend. Low risk across all months." },
    confidence: { level: "Medium", reasons: ["MAPE of 6.1% is acceptable for Prophet baseline", "R-squared of 0.87 indicates reasonable fit"] },
    recommendedActions: {
      productionVolume: "1,280,000 units",
      safetyStockPercent: 10,
      stockoutRiskMonths: [],
      overstockRiskMonths: [],
      assumptions: ["Prophet default hyperparameters used", "No external regressors included"],
    },
    forecastData: forecastDataRun001.map((p) => ({
      ...p,
      forecast: Math.round(p.forecast * 0.96),
      p10: p.p10 ? Math.round(p.p10 * 0.94) : undefined,
      p90: p.p90 ? Math.round(p.p90 * 0.98) : undefined,
    })),
    drivers: [
      { feature: "Trend", impact: 45, direction: "positive", description: "Upward linear trend" },
      { feature: "Yearly Seasonality", impact: 35, direction: "positive", description: "Annual seasonal pattern" },
      { feature: "Weekly Seasonality", impact: 12, direction: "positive", description: "Day-of-week effects" },
      { feature: "Holiday Effects", impact: 8, direction: "positive", description: "Thai holiday demand spikes" },
    ],
    narrative:
      "Prophet baseline provides a conservative forecast. Without external features, the model captures trend and seasonality well but may underestimate weather-driven demand spikes.",
    validation: validationRun001,
  },
};

// --- Compare result for run-001 vs run-002 ---

export const mockCompareResult: CompareResult = {
  runA: mockRuns[0],
  runB: mockRuns[1],
  overlayData: [
    { month: "Jan 2025", forecastA: 122000, forecastB: 123000, p10A: 110000, p90A: 134000, p10B: 111000, p90B: 135000, actualA: 124500, actualB: 124500, delta: -1000, deltaPercent: -0.8 },
    { month: "Feb 2025", forecastA: 119500, forecastB: 117000, p10A: 107000, p90A: 132000, p10B: 105000, p90B: 129000, actualA: 118200, actualB: 118200, delta: 2500, deltaPercent: 2.1 },
    { month: "Mar 2025", forecastA: 133000, forecastB: 132000, p10A: 120000, p90A: 146000, p10B: 119000, p90B: 145000, actualA: 135800, actualB: 135800, delta: 1000, deltaPercent: 0.8 },
    { month: "Apr 2025", forecastA: 140500, forecastB: 139000, p10A: 126000, p90A: 155000, p10B: 125000, p90B: 153000, actualA: 142300, actualB: 142300, delta: 1500, deltaPercent: 1.1 },
    { month: "May 2025", forecastA: 152000, forecastB: 150000, p10A: 137000, p90A: 167000, p10B: 135000, p90B: 165000, actualA: 156700, actualB: 156700, delta: 2000, deltaPercent: 1.3 },
    { month: "Jun 2025", forecastA: 160000, forecastB: 158000, p10A: 144000, p90A: 176000, p10B: 142000, p90B: 174000, actualA: 163400, actualB: 163400, delta: 2000, deltaPercent: 1.3 },
    { month: "Jul 2025", forecastA: 171000, forecastB: 165000, p10A: 154000, p90A: 188000, p10B: 148000, p90B: 182000, delta: 6000, deltaPercent: 3.6 },
    { month: "Aug 2025", forecastA: 168500, forecastB: 160000, p10A: 151000, p90A: 186000, p10B: 144000, p90B: 176000, delta: 8500, deltaPercent: 5.3 },
    { month: "Sep 2025", forecastA: 155000, forecastB: 153000, p10A: 139000, p90A: 171000, p10B: 138000, p90B: 168000, delta: 2000, deltaPercent: 1.3 },
  ],
  kpiDeltas: [
    { label: "Total Forecast", valueA: "1,289,500", valueB: "478,000", delta: "+811,500 (different horizons)", direction: "neutral" },
    { label: "MAPE", valueA: "4.2%", valueB: "5.8%", delta: "-1.6pp", direction: "better" },
    { label: "R-squared", valueA: "0.94", valueB: "0.89", delta: "+0.05", direction: "better" },
    { label: "Risk Level", valueA: "Medium", valueB: "Low", delta: "A higher risk", direction: "worse" },
    { label: "Safety Stock %", valueA: "12%", valueB: "8%", delta: "+4pp", direction: "neutral" },
  ],
};

// Helper to get a run report, with fallback generation for unknown IDs
export function getRunReport(runId: string): RunReport | null {
  return mockRunReports[runId] ?? null;
}

export function getRunById(runId: string): ForecastRun | undefined {
  return mockRuns.find((r) => r.id === runId);
}
