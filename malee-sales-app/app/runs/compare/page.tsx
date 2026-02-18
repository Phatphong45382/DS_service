"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { MainLayout } from "@/components/layout/main-layout"
import {
  RUNS,
  generateForecastData,
  aggregateForecastByMonth,
  formatNumber,
  formatMonthShort,
  formatDuration,
  SKUS,
  type SKU,
} from "@/lib/mock-data"
import { PageHeader } from "@/components/page-header"
import { ChartCard } from "@/components/chart-card"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts"
import { ArrowLeft, GitCompare, TrendingUp, TrendingDown, Minus } from "lucide-react"

export default function ComparePage() {
  const searchParams = useSearchParams()
  const runIdA = searchParams.get("a") || "RUN-2025-001"
  const runIdB = searchParams.get("b") || "RUN-2025-005"

  const runA = RUNS.find((r) => r.run_id === runIdA)
  const runB = RUNS.find((r) => r.run_id === runIdB)

  const forecastA = useMemo(() => generateForecastData(runIdA, 6), [runIdA])
  const forecastB = useMemo(() => generateForecastData(runIdB, 6), [runIdB])

  const aggA = useMemo(() => aggregateForecastByMonth(forecastA), [forecastA])
  const aggB = useMemo(() => aggregateForecastByMonth(forecastB), [forecastB])

  if (!runA || !runB) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Compare Runs" description="One or both runs not found" />
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Could not find runs: {runIdA} and {runIdB}
          </p>
          <Button asChild>
            <Link href="/runs">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Runs
            </Link>
          </Button>
        </Card>
      </div>
    )
  }

  // Overlay chart data
  const overlayData = aggA.map((d, i) => ({
    month: formatMonthShort(d.month),
    [runA.run_id]: d.forecast,
    [runB.run_id]: aggB[i]?.forecast || 0,
  }))

  // Delta chart (run B - run A)
  const deltaData = aggA.map((d, i) => ({
    month: formatMonthShort(d.month),
    delta: (aggB[i]?.forecast || 0) - d.forecast,
  }))

  // SKU-level comparison
  const skuComparison = SKUS.map((sku) => {
    const totalA = forecastA.filter((r) => r.sku === sku).reduce((s, r) => s + r.forecast_units, 0)
    const totalB = forecastB.filter((r) => r.sku === sku).reduce((s, r) => s + r.forecast_units, 0)
    const diff = totalB - totalA
    const diffPct = totalA ? ((diff / totalA) * 100).toFixed(1) : "0.0"
    return { sku, totalA, totalB, diff, diffPct }
  })

  // Radar data for model metrics
  const radarData = [
    { metric: "WAPE", A: 100 - runA.wape, B: 100 - runB.wape },
    { metric: "Bias", A: 100 - Math.abs(runA.bias), B: 100 - Math.abs(runB.bias) },
    { metric: "Speed", A: Math.max(0, 100 - runA.duration_sec / 2), B: Math.max(0, 100 - runB.duration_sec / 2) },
    { metric: "Coverage", A: 90, B: 95 },
  ]

  // Metadata diff
  const metadataFields = [
    { label: "Run ID", a: runA.run_id, b: runB.run_id },
    { label: "Status", a: runA.status, b: runB.status },
    { label: "Model", a: `${runA.model_name} ${runA.model_version}`, b: `${runB.model_name} ${runB.model_version}` },
    { label: "Horizon", a: `${runA.horizon_months}mo`, b: `${runB.horizon_months}mo` },
    { label: "WAPE", a: `${runA.wape}%`, b: `${runB.wape}%` },
    { label: "Bias", a: `${runA.bias}%`, b: `${runB.bias}%` },
    { label: "Duration", a: formatDuration(runA.duration_sec), b: formatDuration(runB.duration_sec) },
    { label: "Owner", a: runA.owner, b: runB.owner },
    { label: "Data Source", a: runA.data_source_name, b: runB.data_source_name },
  ]

  const totalA = aggA.reduce((s, d) => s + d.forecast, 0)
  const totalB = aggB.reduce((s, d) => s + d.forecast, 0)
  const totalDiff = totalB - totalA
  const totalDiffPct = ((totalDiff / totalA) * 100).toFixed(1)

  return (
    <MainLayout>
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Compare Runs"
        description={`Side-by-side comparison of ${runIdA} vs ${runIdB}`}
      >
        <Button variant="outline" asChild>
          <Link href="/runs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Runs
          </Link>
        </Button>
      </PageHeader>

      {/* Summary strip */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">Run A: {runA.run_id}</p>
          <p className="text-xl font-bold tabular-nums">{formatNumber(totalA)}</p>
          <p className="text-xs text-muted-foreground">{runA.notes.slice(0, 40)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">Run B: {runB.run_id}</p>
          <p className="text-xl font-bold tabular-nums">{formatNumber(totalB)}</p>
          <p className="text-xs text-muted-foreground">{runB.notes.slice(0, 40)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">Difference (B - A)</p>
          <p className={`text-xl font-bold tabular-nums ${totalDiff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {totalDiff >= 0 ? "+" : ""}{formatNumber(totalDiff)}
          </p>
          <p className="text-xs text-muted-foreground">{totalDiffPct}% change</p>
        </Card>
      </div>

      {/* Metadata Diff Table */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Metadata Comparison</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Field</TableHead>
                <TableHead className="text-xs">Run A ({runA.run_id})</TableHead>
                <TableHead className="text-xs">Run B ({runB.run_id})</TableHead>
                <TableHead className="text-xs w-12">Diff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metadataFields.map((f) => (
                <TableRow key={f.label}>
                  <TableCell className="text-xs font-medium">{f.label}</TableCell>
                  <TableCell className="text-xs font-mono">{f.a}</TableCell>
                  <TableCell className="text-xs font-mono">{f.b}</TableCell>
                  <TableCell>
                    {f.a === f.b ? (
                      <Minus className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1">
                        Changed
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Forecast Overlay Chart */}
      <ChartCard title="Forecast Overlay" description="Monthly total forecast for both runs">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={overlayData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [formatNumber(value), ""]}
            />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Line
              type="monotone"
              dataKey={runA.run_id}
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={2}
              dot={{ r: 4 }}
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey={runB.run_id}
              stroke="hsl(160, 60%, 45%)"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Delta chart */}
        <ChartCard title="Monthly Delta (B - A)" description="Difference in forecast per month">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={deltaData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`${value >= 0 ? "+" : ""}${formatNumber(value)}`, "Delta"]}
              />
              <Bar dataKey="delta" radius={[4, 4, 0, 0]}>
                {deltaData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.delta >= 0 ? "hsl(160, 60%, 45%)" : "hsl(0, 84%, 60%)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Radar */}
        <ChartCard title="Model Quality Radar" description="Normalized metrics comparison">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid className="stroke-border" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <Radar
                name={runA.run_id}
                dataKey="A"
                stroke="hsl(217, 91%, 60%)"
                fill="hsl(217, 91%, 60%)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Radar
                name={runB.run_id}
                dataKey="B"
                stroke="hsl(160, 60%, 45%)"
                fill="hsl(160, 60%, 45%)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* SKU breakdown */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">SKU-Level Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">SKU</TableHead>
                <TableHead className="text-xs text-right">Run A Total</TableHead>
                <TableHead className="text-xs text-right">Run B Total</TableHead>
                <TableHead className="text-xs text-right">Difference</TableHead>
                <TableHead className="text-xs text-right">Change %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skuComparison.map((row) => (
                <TableRow key={row.sku}>
                  <TableCell className="text-xs font-medium">{row.sku}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{formatNumber(row.totalA)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{formatNumber(row.totalB)}</TableCell>
                  <TableCell className={`text-xs text-right tabular-nums ${row.diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {row.diff >= 0 ? "+" : ""}{formatNumber(row.diff)}
                  </TableCell>
                  <TableCell className={`text-xs text-right tabular-nums ${Number(row.diffPct) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {Number(row.diffPct) >= 0 ? "+" : ""}{row.diffPct}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </MainLayout>
  )
}
