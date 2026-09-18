// Runs, Forecasts and sales history as the backend returns them (see CONTEXT.md for the vocabulary).

export type RunStatus = "success" | "running" | "failed"

export interface ValidationCheck {
  rule: string
  status: "pass" | "warning" | "error"
  message: string
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
  wape: number | null
  bias: number | null
  accuracy_basis?: string
  validation: ValidationCheck[]
  upload_id: string | null
  product_count: number
  forecast_months: string[]
  previous_run_id?: string | null
}

export interface ForecastRecord {
  run_id: string
  date_month: string // "YYYY-MM-01"
  sku: string // display label: "<Flavor> <Size>"
  product_group: string
  flavor: string
  size: string
  forecast_units: number
  p10_units: number
  p90_units: number
  plan_units: number
  baseline_forecast_units: number
}

export interface HistoryRecord {
  date_month: string
  sku: string
  product_group: string
  flavor: string
  size: string
  actual_units: number
  plan_units: number
  promo_flag: boolean
  promo_days: number
  discount_pct: number
  mechanic: string
}

export interface RunForecast {
  forecast: ForecastRecord[]
  history: HistoryRecord[]
}

export interface RunCompare {
  a: RunRecord
  b: RunRecord
  forecast_a: ForecastRecord[]
  forecast_b: ForecastRecord[]
  monthly: { month: string; a: number; b: number }[]
  by_sku: { sku: string; a: number; b: number }[]
}

export interface UploadMeta {
  upload_id: string
  filename: string
  rows: number
  columns: string[]
  checks: ValidationCheck[]
  uploaded_at: string
}
