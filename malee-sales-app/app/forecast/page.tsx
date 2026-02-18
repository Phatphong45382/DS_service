"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { MainLayout } from "@/components/layout/main-layout"
import {
  historicalData,
  latestForecast,
  RUNS,
  LATEST_RUN,
  formatNumber,
  formatMonthShort,
  aggregateByMonth,
  aggregateForecastByMonth,
  SKUS,
} from "@/lib/mock-data"
import { PageHeader } from "@/components/page-header"
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
  const [selectedRunId, setSelectedRunId] = useState(LATEST_RUN.run_id)
  const [showPlan, setShowPlan] = useState(true)
  const [showBands, setShowBands] = useState(true)

  const successfulRuns = RUNS.filter((r) => r.status === "success")
  const selectedRun = RUNS.find((r) => r.run_id === selectedRunId) || LATEST_RUN

  const filteredHistory = useMemo(() => {
    if (selectedSku === "all") return historicalData
    return historicalData.filter((r) => r.sku === selectedSku)
  }, [selectedSku])

  const filteredForecast = useMemo(() => {
    if (selectedSku === "all") return latestForecast
    return latestForecast.filter((r) => r.sku === selectedSku)
  }, [selectedSku])

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
    <MainLayout title="Forecast">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Forecast"
          description="Latest demand forecast with uncertainty bands and risk assessment"
        >
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
        </PageHeader>

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
                {SKUS.map((sku) => (
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
            description={`History: Jan 2023 - Dec 2024 | Forecast: Jan - Jun 2025 (${selectedRun.model_name} ${selectedRun.model_version})`}
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
                  formatter={(v: number | null) =>
                    v !== null ? formatNumber(v) : "---"
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
                <p>Model: {selectedRun.model_name}</p>
                <p>WAPE: {selectedRun.wape}% on validation set</p>
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
