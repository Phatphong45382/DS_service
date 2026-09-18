// Pure helpers for Forecast and history rows: aggregation, accuracy, formatting.
import type { ForecastRecord, HistoryRecord } from "@/types/runs"

export function aggregateByMonth(
  data: HistoryRecord[],
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

export function aggregateForecastByMonth(
  data: ForecastRecord[]
): { month: string; forecast: number; p10: number; p90: number; plan: number; baseline: number }[] {
  const map = new Map<string, { forecast: number; p10: number; p90: number; plan: number; baseline: number }>()
  for (const r of data) {
    const e = map.get(r.date_month) || { forecast: 0, p10: 0, p90: 0, plan: 0, baseline: 0 }
    e.forecast += r.forecast_units
    e.p10 += r.p10_units
    e.p90 += r.p90_units
    e.plan += r.plan_units
    e.baseline += r.baseline_forecast_units
    map.set(r.date_month, e)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }))
}

export function skusOf(rows: { sku: string }[]): string[] {
  return Array.from(new Set(rows.map((r) => r.sku))).sort()
}

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

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n)
}

export function formatMonth(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

export function formatMonthShort(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number)
  return `${MONTH_NAMES[m - 1]} ${String(y).slice(2)}`
}

export function formatDate(isoStr: string): string {
  const [y, m, d] = isoStr.split("T")[0].split("-").map(Number)
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`
}

export function formatDuration(sec: number): string {
  if (sec < 10) return `${sec.toFixed(1)}s`
  if (sec < 60) return `${Math.round(sec)}s`
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}m ${s}s`
}

/** Build a CSV string from plain rows (download helper for Forecast results). */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ""
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n")
}
