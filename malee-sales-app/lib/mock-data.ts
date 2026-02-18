// ============================================================
// MOCK DATA for Demand Forecasting ML Web App
// ============================================================

export const SKUS = [
  "Coconut Water 350ml",
  "Orange Juice 200ml",
  "Orange Juice 1000ml",
  "Apple Juice 200ml",
  "Apple Juice 1000ml",
] as const

export type SKU = (typeof SKUS)[number]

export type RunStatus = "success" | "running" | "failed"

export interface MonthlyRecord {
  date_month: string
  sku: SKU
  actual_units: number
  plan_units: number
  promo_flag: boolean
  promo_days: number
  discount_pct: number
}

export interface ForecastRecord {
  run_id: string
  date_month: string
  sku: SKU
  forecast_units: number
  p10_units: number
  p90_units: number
  plan_units: number
  baseline_forecast_units: number
}

export interface RunRecord {
  run_id: string
  created_at: string
  status: RunStatus
  duration_sec: number
  model_name: string
  model_version: string
  data_source_name: string
  horizon_months: number
  owner: string
  notes: string
  tags: string[]
  wape: number
  bias: number
}

export interface ValidationCheck {
  rule: string
  status: "pass" | "warning" | "error"
  message: string
}

// Deterministic seeded PRNG (mulberry32) - prevents hydration mismatches
function mulberry32(seed: number) {
  let s = seed | 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Global PRNG with a fixed seed
const prng = mulberry32(42)

function randBetween(min: number, max: number) {
  return Math.floor(prng() * (max - min + 1)) + min
}

function generateSeed(sku: SKU): number {
  const seeds: Record<SKU, number> = {
    "Coconut Water 350ml": 5000,
    "Orange Juice 200ml": 8000,
    "Orange Juice 1000ml": 3500,
    "Apple Juice 200ml": 6500,
    "Apple Juice 1000ml": 2800,
  }
  return seeds[sku]
}

// Seasonality pattern (month index 0=Jan)
const seasonality = [0.85, 0.88, 0.95, 1.05, 1.12, 1.2, 1.18, 1.15, 1.05, 0.95, 0.88, 0.82]

// Generate 24 months of actual data
export function generateHistoricalData(): MonthlyRecord[] {
  const records: MonthlyRecord[] = []
  for (const sku of SKUS) {
    const base = generateSeed(sku)
    for (let yr = 2023; yr <= 2024; yr++) {
      for (let m = 0; m < 12; m++) {
        const monthIdx = (yr - 2023) * 12 + m
        const trend = 1 + monthIdx * 0.008
        const seasonal = seasonality[m]
        const noise = 0.92 + prng() * 0.16
        const actual = Math.round(base * trend * seasonal * noise)
        const promoFlag = m === 3 || m === 5 || m === 10 || (m === 7 && yr === 2024)
        const promoDays = promoFlag ? randBetween(5, 15) : 0
        const discountPct = promoFlag ? randBetween(5, 25) : 0
        const plan = Math.round(actual * (0.95 + prng() * 0.12))
        const dateStr = `${yr}-${String(m + 1).padStart(2, "0")}-01`
        records.push({
          date_month: dateStr,
          sku,
          actual_units: actual,
          plan_units: plan,
          promo_flag: promoFlag,
          promo_days: promoDays,
          discount_pct: discountPct,
        })
      }
    }
  }
  return records
}

// Generate forecast data for a run
export function generateForecastData(
  runId: string,
  horizonMonths: number,
  startDate: string = "2025-01-01"
): ForecastRecord[] {
  const records: ForecastRecord[] = []
  const start = new Date(startDate)

  for (const sku of SKUS) {
    const base = generateSeed(sku)
    for (let i = 0; i < horizonMonths; i++) {
      const d = new Date(start)
      d.setMonth(d.getMonth() + i)
      const m = d.getMonth()
      const trend = 1 + (24 + i) * 0.008
      const seasonal = seasonality[m]
      const noise = 0.95 + prng() * 0.1
      const forecast = Math.round(base * trend * seasonal * noise)
      const p10 = Math.round(forecast * (0.8 + prng() * 0.05))
      const p90 = Math.round(forecast * (1.1 + prng() * 0.1))
      const plan = Math.round(forecast * (0.93 + prng() * 0.14))
      const baseline = Math.round(forecast * (0.97 + prng() * 0.06))
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`

      records.push({
        run_id: runId,
        date_month: dateStr,
        sku,
        forecast_units: forecast,
        p10_units: p10,
        p90_units: p90,
        plan_units: plan,
        baseline_forecast_units: baseline,
      })
    }
  }
  return records
}

// Pre-generated runs
export const RUNS: RunRecord[] = [
  {
    run_id: "RUN-2025-001",
    created_at: "2025-01-15T09:30:00Z",
    status: "success",
    duration_sec: 142,
    model_name: "LightGBM + Seasonal",
    model_version: "v2.4.1",
    data_source_name: "sales_monthly_jan2025.csv",
    horizon_months: 6,
    owner: "Planner A",
    notes: "Production run for Q1 planning",
    tags: ["production", "Q1-2025"],
    wape: 8.2,
    bias: -2.1,
  },
  {
    run_id: "RUN-2025-002",
    created_at: "2025-01-20T14:15:00Z",
    status: "success",
    duration_sec: 138,
    model_name: "LightGBM + Seasonal",
    model_version: "v2.4.1",
    data_source_name: "sales_monthly_jan2025_v2.csv",
    horizon_months: 6,
    owner: "Analyst B",
    notes: "Updated with corrected Dec data",
    tags: ["revision", "Q1-2025"],
    wape: 7.5,
    bias: -1.4,
  },
  {
    run_id: "RUN-2025-003",
    created_at: "2025-02-01T10:00:00Z",
    status: "success",
    duration_sec: 155,
    model_name: "Prophet + Promo",
    model_version: "v3.0.0",
    data_source_name: "sales_monthly_feb2025.csv",
    horizon_months: 6,
    owner: "Planner A",
    notes: "New model evaluation - Prophet with promo features",
    tags: ["evaluation", "Q1-2025"],
    wape: 9.1,
    bias: 1.8,
  },
  {
    run_id: "RUN-2025-004",
    created_at: "2025-02-10T08:45:00Z",
    status: "failed",
    duration_sec: 23,
    model_name: "LightGBM + Seasonal",
    model_version: "v2.4.1",
    data_source_name: "sales_incomplete.csv",
    horizon_months: 3,
    owner: "Analyst B",
    notes: "Failed - missing columns in source data",
    tags: ["debug"],
    wape: 0,
    bias: 0,
  },
  {
    run_id: "RUN-2025-005",
    created_at: "2025-02-15T11:20:00Z",
    status: "success",
    duration_sec: 148,
    model_name: "LightGBM + Seasonal",
    model_version: "v2.5.0",
    data_source_name: "sales_monthly_feb2025_final.csv",
    horizon_months: 6,
    owner: "Planner A",
    notes: "Latest production forecast for H1 planning",
    tags: ["production", "H1-2025"],
    wape: 6.8,
    bias: -0.9,
  },
]

export const LATEST_RUN = RUNS[RUNS.length - 1]

// Alias for compatibility with scenario page
export const runsHistory = RUNS

// Saved scenarios for scenario planner
export const savedScenarios = [
  { scenario_id: "SC-001", name: "Holiday Promo +20%", discount_pct: 20, promo_days: 14, startMonth: "2026-03", endMonth: "2026-04" },
  { scenario_id: "SC-002", name: "Summer Sale +15%", discount_pct: 15, promo_days: 10, startMonth: "2026-06", endMonth: "2026-06" },
  { scenario_id: "SC-003", name: "Clearance -30%", discount_pct: 30, promo_days: 7, startMonth: "2026-01", endMonth: "2026-02" },
]

// Scenario delta data for chart and table
export const scenarioDeltaData = [
  { month: "Jan 2026", base: 45000, scenario: 45000, delta: 0 },
  { month: "Feb 2026", base: 47000, scenario: 47000, delta: 0 },
  { month: "Mar 2026", base: 52000, scenario: 62400, delta: 10400 },
  { month: "Apr 2026", base: 51000, scenario: 61200, delta: 10200 },
  { month: "May 2026", base: 48000, scenario: 48000, delta: 0 },
  { month: "Jun 2026", base: 46000, scenario: 46000, delta: 0 },
]

// Pre-compute data
export const historicalData = generateHistoricalData()
export const latestForecast = generateForecastData(LATEST_RUN.run_id, 6)
export const prevForecast = generateForecastData(RUNS[1].run_id, 6)

// Validation checks for a run
export const validationChecks: ValidationCheck[] = [
  { rule: "Schema: Required columns", status: "pass", message: "All required columns present: date_month, sku, actual_units, promo_flag, promo_days, discount_pct" },
  { rule: "Schema: Optional columns", status: "pass", message: "plan_units column found and valid" },
  { rule: "Date: Parseable", status: "pass", message: "All 120 date_month values parsed successfully" },
  { rule: "Date: Monthly continuity", status: "pass", message: "No missing months detected for any SKU" },
  { rule: "Date: Uniqueness", status: "pass", message: "No duplicate (date_month, sku) combinations" },
  { rule: "Value: actual_units >= 0", status: "pass", message: "All values non-negative" },
  { rule: "Value: promo_days range", status: "pass", message: "All values in 0..31" },
  { rule: "Value: discount_pct range", status: "pass", message: "All values in 0..100" },
  { rule: "Consistency: promo_flag=0 checks", status: "warning", message: "2 rows have promo_flag=0 but promo_days>0 (2023-08, OJ 200ml; 2024-02, Apple 200ml)" },
  { rule: "Outlier: Z-score check", status: "warning", message: "1 potential outlier: Coconut Water 350ml, 2024-07 (z=2.3, value 6,842 vs median 5,200)" },
]

// Helper: aggregate by month across SKUs
export function aggregateByMonth(
  data: MonthlyRecord[],
  field: "actual_units" | "plan_units"
): { month: string; value: number }[] {
  const map = new Map<string, number>()
  for (const r of data) {
    map.set(r.date_month, (map.get(r.date_month) || 0) + r[field])
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month, value }))
}

// Helper: aggregate forecast by month
export function aggregateForecastByMonth(
  data: ForecastRecord[]
): { month: string; forecast: number; p10: number; p90: number; plan: number }[] {
  const map = new Map<string, { forecast: number; p10: number; p90: number; plan: number }>()
  for (const r of data) {
    const existing = map.get(r.date_month) || { forecast: 0, p10: 0, p90: 0, plan: 0 }
    existing.forecast += r.forecast_units
    existing.p10 += r.p10_units
    existing.p90 += r.p90_units
    existing.plan += r.plan_units
    map.set(r.date_month, existing)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }))
}

// Helper: get SKU breakdown for a month
export function getSkuBreakdown(data: MonthlyRecord[], month: string) {
  return data.filter((r) => r.date_month === month)
}

// Compute metrics
export function computeWAPE(actual: number[], forecast: number[]): number {
  const sumAbsErr = actual.reduce((s, a, i) => s + Math.abs(a - forecast[i]), 0)
  const sumActual = actual.reduce((s, a) => s + a, 0)
  return sumActual === 0 ? 0 : (sumAbsErr / sumActual) * 100
}

export function computeBias(actual: number[], forecast: number[]): number {
  const sumErr = actual.reduce((s, a, i) => s + (forecast[i] - a), 0)
  const sumActual = actual.reduce((s, a) => s + a, 0)
  return sumActual === 0 ? 0 : (sumErr / sumActual) * 100
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// Forecast data for scenario planner (aggregated by month with actuals)
export const forecastData = (() => {
  const histAgg = aggregateByMonth(historicalData, "actual_units")
  const fcAgg = aggregateForecastByMonth(latestForecast)

  return fcAgg.map((f, i) => ({
    month: formatMonthShort(f.month),
    actual: histAgg[histAgg.length - fcAgg.length + i]?.value || null,
    forecast: f.forecast,
  }))
})()

// Format helpers - deterministic (no locale dependency)
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n)
}

export function formatMonth(dateStr: string): string {
  // Parse "YYYY-MM-DD" deterministically
  const [y, m] = dateStr.split("-").map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

export function formatMonthShort(dateStr: string): string {
  // Parse "YYYY-MM-DD" deterministically
  const [y, m] = dateStr.split("-").map(Number)
  return `${MONTH_NAMES[m - 1]} ${String(y).slice(2)}`
}

export function formatDate(isoStr: string): string {
  // Deterministic date formatting from ISO string like "2025-01-15T09:30:00Z"
  const parts = isoStr.split("T")[0].split("-")
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`
}

export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m ${s}s`
}

// Get run by ID
export function getRunById(runId: string): RunRecord | undefined {
  return RUNS.find((r) => r.run_id === runId)
}
