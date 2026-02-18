'use client'

import { useMemo, useState, use } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import {
  RUNS,
  LATEST_RUN,
  latestForecast,
  historicalData,
  validationChecks,
  formatNumber,
  formatMonthShort,
  formatDuration,
  formatDate,
  aggregateForecastByMonth,
  SKUS,
} from '@/lib/mock-data'
import { PageHeader } from '@/components/page-header'
import { KPICard } from '@/components/kpi-card'
import { ChartCard } from '@/components/chart-card'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  GitCompare,
  TrendingUp,
  Shield,
  FileText,
  Database,
  Lightbulb,
  Package,
  Target,
  Zap,
  BarChart3,
  Sparkles,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

export default function RunReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: runId } = use(params)
  const run = RUNS.find((r) => r.run_id === runId) || LATEST_RUN

  const forecast = useMemo(() => latestForecast, [])
  const fcAgg = useMemo(() => aggregateForecastByMonth(forecast), [forecast])

  const totalForecast = forecast.reduce((s, r) => s + r.forecast_units, 0)
  const totalPlan = forecast.reduce((s, r) => s + r.plan_units, 0)
  const deltaPlan = totalForecast - totalPlan
  const deltaPlanPct = totalPlan === 0 ? 0 : (deltaPlan / totalPlan) * 100

  // Risk months
  const riskMonths = fcAgg
    .map((f) => ({
      month: f.month,
      label: formatMonthShort(f.month),
      uncertainty: f.p90 - f.p10,
      pctRange: f.forecast === 0 ? 0 : ((f.p90 - f.p10) / f.forecast) * 100,
    }))
    .sort((a, b) => b.pctRange - a.pctRange)
    .slice(0, 3)

  const avgRiskRange = riskMonths.reduce((s, r) => s + r.pctRange, 0) / (riskMonths.length || 1)
  const confidenceLevel =
    avgRiskRange < 20
      ? { label: 'High', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' }
      : avgRiskRange < 35
      ? { label: 'Medium', color: 'bg-amber-100 text-amber-700 hover:bg-amber-100' }
      : { label: 'Low', color: 'bg-red-100 text-red-700 hover:bg-red-100' }

  // Validation score
  const passCount = validationChecks.filter((c) => c.status === 'pass').length
  const dataQualityScore = Math.round((passCount / validationChecks.length) * 100)

  // Chart data
  const chartData = useMemo(() => {
    return fcAgg.map((f) => ({
      month: formatMonthShort(f.month),
      forecast: f.forecast,
      p10: f.p10,
      p90: f.p90,
      plan: f.plan,
    }))
  }, [fcAgg])

  const [tab, setTab] = useState('summary')

  return (
    <MainLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="h-9 w-9 p-0">
              <Link href="/runs">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{run.run_id}</h1>
                <Badge className={confidenceLevel.color} variant="secondary">
                  {run.status === 'success' ? 'Completed' : run.status}
                </Badge>
              </div>
              <p className="text-slate-500 text-sm mt-1">
                {run.model_name} {run.model_version} • {formatDuration(run.duration_sec)} • {formatDate(run.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/runs/compare">
                <GitCompare className="mr-2 h-4 w-4" />
                Compare
              </Link>
            </Button>
            <Button asChild>
              <Link href="/scenario-planner">
                <Zap className="mr-2 h-4 w-4" />
                Create Scenario
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Total Forecast</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{formatNumber(totalForecast)}</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                  <Target className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">vs Plan</p>
                  <p className={`text-2xl font-bold mt-1 ${deltaPlan >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {deltaPlan > 0 ? '+' : ''}{formatNumber(deltaPlan)}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Risk Level</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{confidenceLevel.label}</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                  <Shield className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">WAPE</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{run.wape}%</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="bg-slate-100 border border-slate-200 rounded-lg p-1">
            <TabsTrigger value="summary" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Package className="mr-2 h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="forecast" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <BarChart3 className="mr-2 h-4 w-4" />
              Forecast
            </TabsTrigger>
            <TabsTrigger value="drivers" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Lightbulb className="mr-2 h-4 w-4" />
              Why / Drivers
            </TabsTrigger>
            <TabsTrigger value="validation" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Database className="mr-2 h-4 w-4" />
              Data & Validation
            </TabsTrigger>
          </TabsList>

          {/* TAB A: SUMMARY */}
          <TabsContent value="summary" className="space-y-6">
            {/* Recommended Actions */}
            <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-base font-semibold">Recommended Actions</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                    <span className="text-xs font-semibold text-slate-500">Production Volume</span>
                    <span className="text-xl font-bold text-slate-900 block mt-1">
                      {formatNumber(Math.round(totalForecast * 1.05))} units
                    </span>
                    <span className="text-xs text-slate-400">Forecast + 5% safety buffer</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                    <span className="text-xs font-semibold text-slate-500">Safety Stock</span>
                    <span className="text-xl font-bold text-slate-900 block mt-1">8-12%</span>
                    <span className="text-xs text-slate-400">Higher for risk months</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                    <span className="text-xs font-semibold text-slate-500">Stockout Risk</span>
                    <span className="text-sm text-slate-500 block mt-1">
                      {riskMonths[0]?.label || 'N/A'} has widest uncertainty ({riskMonths[0]?.pctRange.toFixed(0) || 0}% range)
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                    <span className="text-xs font-semibold text-slate-500">Assumptions</span>
                    <ul className="text-xs text-slate-400 mt-1 space-y-1">
                      <li>• Based on 24 months historical data</li>
                      <li>• Promo patterns assumed similar to past</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* High-risk months */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Risk Analysis
              </h3>
              <div className="grid gap-3 md:grid-cols-3">
                {riskMonths.map((r) => (
                  <Card key={r.month} className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-semibold text-slate-900">{r.label}</span>
                        <Badge variant="outline" className="text-xs border-amber-200 text-amber-700 bg-amber-50">
                          {r.pctRange.toFixed(0)}% range
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">
                        Uncertainty: <span className="font-semibold">{formatNumber(r.uncertainty)}</span> units
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* TAB B: FORECAST */}
          <TabsContent value="forecast" className="space-y-6">
            <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    Forecast + Uncertainty
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    {run.model_name} {run.model_version} • Horizon: {run.horizon_months} months
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      width={50}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: 13,
                      }}
                      formatter={(v: number) => formatNumber(v)}
                    />
                    <Area
                      type="monotone"
                      dataKey="p90"
                      stroke="none"
                      fill="#3b82f6"
                      fillOpacity={0.1}
                      name="P90"
                    />
                    <Area
                      type="monotone"
                      dataKey="p10"
                      stroke="none"
                      fill="#fff"
                      fillOpacity={1}
                      name="P10"
                    />
                    <Area
                      type="monotone"
                      dataKey="forecast"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="#3b82f6"
                      fillOpacity={0.05}
                      name="Forecast"
                    />
                    <Area
                      type="monotone"
                      dataKey="plan"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="none"
                      strokeDasharray="5 5"
                      name="Plan"
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">Forecast by SKU</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="text-xs font-semibold">SKU</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Total Forecast</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Total Plan</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Delta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SKUS.map((sku) => {
                      const rows = forecast.filter((r) => r.sku === sku)
                      const fc = rows.reduce((s, r) => s + r.forecast_units, 0)
                      const pl = rows.reduce((s, r) => s + r.plan_units, 0)
                      const d = fc - pl
                      return (
                        <TableRow key={sku} className="hover:bg-slate-50">
                          <TableCell className="text-sm font-medium text-slate-900">{sku}</TableCell>
                          <TableCell className="text-sm text-right tabular-nums font-medium text-slate-900">
                            {formatNumber(fc)}
                          </TableCell>
                          <TableCell className="text-sm text-right tabular-nums text-slate-500">
                            {formatNumber(pl)}
                          </TableCell>
                          <TableCell className="text-sm text-right tabular-nums">
                            <span className={d > 0 ? 'text-emerald-600 font-semibold' : d < 0 ? 'text-red-600 font-semibold' : ''}>
                              {d > 0 ? '+' : ''}{formatNumber(d)}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB C: WHY / DRIVERS */}
          <TabsContent value="drivers" className="space-y-6">
            <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-base font-semibold">What changed vs previous run?</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {[
                    'Updated December 2024 actuals showed stronger-than-expected seasonal recovery for Apple Juice 200ml (+8.2% vs prior estimate).',
                    'Model version upgraded from v2.4.1 to v2.5.0 with improved seasonality detection, reducing overall WAPE by 0.7pp.',
                    'Promo uplift coefficients recalibrated: Orange Juice 200ml shows 12% higher promo sensitivity than previous model.',
                  ].map((text, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 border border-slate-200"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
                        {i + 1}
                      </span>
                      <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Key Forecast Drivers
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { driver: 'Seasonality', impact: 'Primary driver', desc: 'Strong summer peak pattern detected across all SKUs.' },
                    { driver: 'Trend', impact: 'Growth +0.8%/mo', desc: 'Consistent positive trend observed in 24-month window.' },
                    { driver: 'Promo Effect', impact: '+12-18% uplift', desc: 'Promotional periods show significant demand spikes.' },
                    { driver: 'Product Mix', impact: 'Shifting', desc: '200ml formats gaining share vs 1000ml in recent months.' },
                  ].map((item) => (
                    <div key={item.driver} className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-900">{item.driver}</span>
                        <Badge variant="outline" className="text-xs border-slate-200 text-slate-500">
                          {item.impact}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm text-slate-500">
                <strong className="text-slate-900">Note:</strong> With only 24 months of data, driver decomposition has limited statistical power.
                These insights reflect model-detected patterns but should be validated with domain expertise.
              </p>
            </div>
          </TabsContent>

          {/* TAB D: DATA & VALIDATION */}
          <TabsContent value="validation" className="space-y-6">
            {/* Data Quality Score Cards */}
            <div className="grid gap-3 md:grid-cols-3">
              <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Data Quality Score</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{dataQualityScore}/100</p>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Checks Passed</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{passCount}/{validationChecks.length}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                      <FileText className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Warnings</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">
                        {validationChecks.filter((c) => c.status === 'warning').length}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Validation table */}
            <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="text-base font-semibold">Validation Checks</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="text-xs font-semibold w-12">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Rule</TableHead>
                      <TableHead className="text-xs font-semibold">Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationChecks.map((check, i) => (
                      <TableRow key={i} className="hover:bg-slate-50">
                        <TableCell>
                          {check.status === 'pass' && (
                            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </div>
                          )}
                          {check.status === 'warning' && (
                            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                            </div>
                          )}
                          {check.status === 'error' && (
                            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                              <XCircle className="h-4 w-4 text-red-600" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-900">{check.rule}</TableCell>
                        <TableCell className="text-sm text-slate-500">{check.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Data preview */}
            <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">Data Preview (first 10 rows)</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export Full Report
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="text-xs font-semibold">Date</TableHead>
                      <TableHead className="text-xs font-semibold">SKU</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Actual</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Plan</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Promo</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Promo Days</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Discount %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historicalData.slice(0, 10).map((row, i) => (
                      <TableRow key={i} className="hover:bg-slate-50">
                        <TableCell className="text-sm tabular-nums text-slate-900">{formatMonthShort(row.date_month)}</TableCell>
                        <TableCell className="text-sm text-slate-900">{row.sku}</TableCell>
                        <TableCell className="text-sm text-right tabular-nums font-medium text-slate-900">
                          {formatNumber(row.actual_units)}
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums text-slate-500">
                          {formatNumber(row.plan_units)}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.promo_flag ? (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">Yes</Badge>
                          ) : (
                            <span className="text-sm text-slate-400">No</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums text-slate-900">{row.promo_days}</TableCell>
                        <TableCell className="text-sm text-right tabular-nums text-slate-900">{row.discount_pct}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
