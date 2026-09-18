"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { MainLayout } from "@/components/layout/main-layout"
import { aggregateByMonth, aggregateForecastByMonth, formatMonthShort, formatNumber, skusOf } from "@/lib/forecast-utils"
import { getRunForecast, listRuns } from "@/lib/api-client"
import type { ForecastRecord, HistoryRecord, RunRecord } from "@/types/runs"

import { ChartCard } from "@/components/chart-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/status-badge"
import {
  AlertTriangle,
  Download,
  FileText,
  Shield,
  TrendingUp,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

export default function ForecastPage() {
  const [selectedSku, setSelectedSku] = useState<string>("all")
  const [selectedRunId, setSelectedRunId] = useState<string>("")
  const [showPlan, setShowPlan] = useState(true)
  const [showBands, setShowBands] = useState(true)
  const [runs, setRuns] = useState<RunRecord[]>([])
  const [forecastRows, setForecastRows] = useState<ForecastRecord[]>([])
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [runsState, setRunsState] = useState<"loading" | "ready" | "failed">("loading")
  const [reload, setReload] = useState(0)
  useEffect(() => {
    setRunsState("loading")
    listRuns()
      .then((rs) => {
        setRuns(rs)
        setRunsState("ready")
        const latest = rs.find((r) => r.status === "success")
        if (latest) setSelectedRunId(latest.run_id)
      })
      .catch((e) => { console.error(e); setRunsState("failed") })
  }, [reload])
  useEffect(() => {
    if (!selectedRunId) return
    getRunForecast(selectedRunId)
      .then((d) => {
        setForecastRows(d.forecast)
        setHistory(d.history)
      })
      .catch(console.error)
  }, [selectedRunId])
  const skus = useMemo(() => skusOf(forecastRows), [forecastRows])
  const histMonths = useMemo(() => aggregateByMonth(history, "actual_units").map((m) => m.month), [history])
  const fcMonths = useMemo(() => aggregateForecastByMonth(forecastRows).map((m) => m.month), [forecastRows])

  const successfulRuns = runs.filter((r) => r.status === "success")
  const selectedRun = runs.find((r) => r.run_id === selectedRunId)

  const filteredHistory = useMemo(() => {
    if (selectedSku === "all") return history
    return history.filter((r) => r.sku === selectedSku)
  }, [selectedSku, history])

  const filteredForecast = useMemo(() => {
    if (selectedSku === "all") return forecastRows
    return forecastRows.filter((r) => r.sku === selectedSku)
  }, [selectedSku, forecastRows])

  // Combined chart data
  const chartData = useMemo(() => {
    const histAgg =
      selectedSku === "all"
        ? aggregateByMonth(filteredHistory, "actual_units")
        : filteredHistory.map((r) => ({
            month: r.date_month,
            value: r.actual_units,
          }))

    const planAgg =
      selectedSku === "all"
        ? aggregateByMonth(filteredHistory, "plan_units")
        : filteredHistory.map((r) => ({
            month: r.date_month,
            value: r.plan_units,
          }))

    const fcAgg = aggregateForecastByMonth(filteredForecast)

    const histPoints = histAgg.map((a, i) => ({
      month: formatMonthShort(a.month),
      actual: a.value,
      plan: planAgg[i]?.value || 0,
      forecast: null as number | null,
      p10: null as number | null,
      p90: null as number | null,
    }))

    const fcPoints = fcAgg.map((f) => ({
      month: formatMonthShort(f.month),
      actual: null as number | null,
      plan: showPlan ? f.plan : null,
      forecast: f.forecast,
      p10: showBands ? f.p10 : null,
      p90: showBands ? f.p90 : null,
    }))

    return [...histPoints, ...fcPoints]
  }, [filteredHistory, filteredForecast, selectedSku, showPlan, showBands])

  // Risk months
  const riskMonths = useMemo(() => {
    const fcAgg = aggregateForecastByMonth(filteredForecast)
    return fcAgg
      .map((f) => ({
        month: f.month,
        label: formatMonthShort(f.month),
        uncertainty: f.p90 - f.p10,
        pctRange:
          f.forecast === 0
            ? 0
            : ((f.p90 - f.p10) / f.forecast) * 100,
      }))
      .sort((a, b) => b.pctRange - a.pctRange)
      .slice(0, 3)
  }, [filteredForecast])

  // Confidence
  const confidenceLevel = useMemo(() => {
    const avgRange =
      riskMonths.reduce((s, r) => s + r.pctRange, 0) / (riskMonths.length || 1)
    if (avgRange < 20) return { label: "High", color: "bg-emerald-100 text-emerald-700" }
    if (avgRange < 35) return { label: "Medium", color: "bg-amber-100 text-amber-700" }
    return { label: "Low", color: "bg-red-100 text-red-700" }
  }, [riskMonths])

  // Forecast table
  const forecastTable = useMemo(() => {
    if (selectedSku === "all") {
      const fcAgg = aggregateForecastByMonth(filteredForecast)
      return fcAgg.map((f) => ({
        month: formatMonthShort(f.month),
        forecast: f.forecast,
        p10: f.p10,
        p90: f.p90,
        plan: f.plan,
        delta: f.forecast - f.plan,
      }))
    }
    return filteredForecast.map((f) => ({
      month: formatMonthShort(f.date_month),
      forecast: f.forecast_units,
      p10: f.p10_units,
      p90: f.p90_units,
      plan: f.plan_units,
      delta: f.forecast_units - f.plan_units,
    }))
  }, [filteredForecast, selectedSku])

  return (
    <MainLayout
      title="Forecast"
      description="Latest demand forecast with uncertainty bands and risk assessment"
      action={
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-white border-slate-300 hover:bg-slate-50" asChild>
            <Link href={`/runs/${selectedRunId}`}>
              <FileText className="mr-2 h-4 w-4" />
              Run Report
            </Link>
          </Button>
          <Button asChild>
            <Link href="/scenario-planner">
              <TrendingUp className="mr-2 h-4 w-4" />
              Scenarios
            </Link>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {runsState === "failed" && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm">
            <span className="text-rose-800">The list of Runs could not be loaded. The API may be restarting.</span>
            <Button size="sm" variant="outline" className="bg-white" onClick={() => setReload((n) => n + 1)}>Try again</Button>
          </div>
        )}
        {runsState === "ready" && successfulRuns.length === 0 && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <span className="text-amber-900">There is no Run yet. Create one and it will show here.</span>
            <Button size="sm" asChild><Link href="/new-prediction">New Prediction</Link></Button>
          </div>
        )}
        {/* Filters: SKU selector + Run selector + toggles */}
        <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-2.5 shadow-enterprise-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">SKU:</span>
            <Select
              value={selectedSku}
              onValueChange={setSelectedSku}
            >
              <SelectTrigger className="h-8 w-[160px] text-xs bg-slate-50 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All SKUs</SelectItem>
                {skus.map((sku) => (
                  <SelectItem key={sku} value={sku}>
                    {sku}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Run:</span>
            <Select
              value={selectedRunId}
              onValueChange={setSelectedRunId}
            >
              <SelectTrigger className="h-8 w-[220px] text-xs bg-slate-50 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {successfulRuns.map((r) => (
                  <SelectItem key={r.run_id} value={r.run_id}>
                    <span className="flex items-center gap-2">
                      {r.run_id}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <Button
            variant={showPlan ? "default" : "ghost"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setShowPlan(!showPlan)}
          >
            Plan
          </Button>
          <Button
            variant={showBands ? "default" : "ghost"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setShowBands(!showBands)}
          >
            P10-P90 Bands
          </Button>
        </div>

        {/* Main chart + side panel */}
        <div className="grid gap-4 lg:grid-cols-4">
          <ChartCard
            title="Actual + Forecast"
            description={`History: ${histMonths.length ? `${formatMonthShort(histMonths[0])} - ${formatMonthShort(histMonths[histMonths.length - 1])}` : '-'} | Forecast: ${fcMonths.length ? `${formatMonthShort(fcMonths[0])} - ${formatMonthShort(fcMonths[fcMonths.length - 1])}` : '-'} (${selectedRun?.model_name ?? ''} ${selectedRun?.model_version ?? ''})`}
            className="lg:col-span-3"
          >
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  formatter={(v) =>
                    v != null ? formatNumber(Number(v)) : "---"
                  }
                />
                {showBands && (
                  <Area
                    type="monotone"
                    dataKey="p90"
                    stroke="none"
                    fill="#3b82f6"
                    fillOpacity={0.08}
                    name="P90"
                  />
                )}
                {showBands && (
                  <Area
                    type="monotone"
                    dataKey="p10"
                    stroke="none"
                    fill="#fff"
                    fillOpacity={1}
                    name="P10"
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.05}
                  strokeWidth={2}
                  name="Actual"
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                  name="Forecast"
                  connectNulls={false}
                />
                {showPlan && (
                  <Area
                    type="monotone"
                    dataKey="plan"
                    stroke="#10b981"
                    fill="none"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    name="Plan"
                    connectNulls={false}
                  />
                )}
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Side panel: risk & confidence */}
          <div className="flex flex-col gap-4">
            <Card className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-medium text-slate-900">Confidence</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${confidenceLevel.color} border-0`}>
                  {confidenceLevel.label}
                </Badge>
              </div>
              <div className="flex flex-col gap-1 text-xs text-slate-500">
                <p>Based on 24 months of training data</p>
                <p>Model: {selectedRun?.model_name ?? '-'}</p>
                <p>WAPE: {selectedRun?.wape ?? '-'}% on the last 6 months of history</p>
              </div>
            </Card>

            <Card className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-medium text-slate-900">Risk Months</h3>
              </div>
              <div className="flex flex-col gap-2">
                {riskMonths.map((r) => (
                  <div
                    key={r.month}
                    className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"
                  >
                    <span className="text-xs font-medium text-slate-900">
                      {r.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {r.pctRange.toFixed(0)}% range
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500">
                Months with widest P10-P90 interval relative to forecast
              </p>
            </Card>
          </div>
        </div>

        {/* Forecast table */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-900">Forecast Table</h3>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Download className="mr-1 h-3 w-3" />
              Export CSV
            </Button>
          </div>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">Month</TableHead>
                  <TableHead className="text-xs text-right">Forecast</TableHead>
                  <TableHead className="text-xs text-right">P10</TableHead>
                  <TableHead className="text-xs text-right">P90</TableHead>
                  <TableHead className="text-xs text-right">Plan</TableHead>
                  <TableHead className="text-xs text-right">Delta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecastTable.map((row) => (
                  <TableRow key={row.month} className="hover:bg-slate-50">
                    <TableCell className="text-xs font-medium text-slate-900">{row.month}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-slate-900">
                      {formatNumber(row.forecast)}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-slate-500">
                      {formatNumber(row.p10)}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-slate-500">
                      {formatNumber(row.p90)}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-slate-900">
                      {formatNumber(row.plan)}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">
                      <span
                        className={
                          row.delta > 0
                            ? "text-emerald-600 font-medium"
                            : row.delta < 0
                            ? "text-red-600 font-medium"
                            : "text-slate-500"
                        }
                      >
                        {row.delta > 0 ? "+" : ""}
                        {formatNumber(row.delta)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </MainLayout>
  )
}
