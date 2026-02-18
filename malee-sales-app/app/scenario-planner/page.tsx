"use client"

import { useState, useMemo } from "react"
import { Download, Save, AlertTriangle, Check, Trash2 } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/page-header"
import { KPICard } from "@/components/kpi-card"
import { ScenarioComparisonChart } from "@/components/charts/scenario-comparison-chart"
import { runsHistory, savedScenarios as initialSavedScenarios } from "@/lib/mock-data"

// Base forecast data
const baseForecastData = [
  { month: "Jan 2026", base: 45000 },
  { month: "Feb 2026", base: 47000 },
  { month: "Mar 2026", base: 52000 },
  { month: "Apr 2026", base: 51000 },
  { month: "May 2026", base: 48000 },
  { month: "Jun 2026", base: 46000 },
]

interface ScenarioData {
  month: string
  base: number
  scenario: number
  delta: number
}

interface SavedScenario {
  scenario_id: string
  name: string
  discount_pct: number
  promo_days: number
  startMonth: string
  endMonth: string
  createdAt: string
}

export default function ScenarioPlannerPage() {
  const [promoDays, setPromoDays] = useState(14)
  const [discountPct, setDiscountPct] = useState(20)
  const [scenarioName, setScenarioName] = useState("Holiday Promo +20%")
  const [baseRunId, setBaseRunId] = useState(runsHistory[0].run_id)
  const [startMonth, setStartMonth] = useState("2026-03")
  const [endMonth, setEndMonth] = useState("2026-04")
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>(initialSavedScenarios.map(s => ({
    ...s,
    startMonth: "2026-03",
    endMonth: "2026-04",
    createdAt: new Date().toISOString()
  })))
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)

  // Calculate scenario data based on inputs
  const scenarioData: ScenarioData[] = useMemo(() => {
    const monthMap: Record<string, string> = {
      "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
      "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
      "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec"
    }
    const startMonthName = monthMap[startMonth.split("-")[1]]
    const endMonthName = monthMap[endMonth.split("-")[1]]
    const startIdx = baseForecastData.findIndex(d => d.month.startsWith(startMonthName))
    const endIdx = baseForecastData.findIndex(d => d.month.startsWith(endMonthName))

    // Elasticity model: 10% discount -> 15% uplift, 1 promo day -> 1.5% uplift
    const discountEffect = (discountPct / 10) * 0.15
    const promoDayEffect = (promoDays / 7) * 0.015
    const totalUplift = discountEffect + promoDayEffect

    return baseForecastData.map((d, i) => {
      const isInPromoPeriod = i >= startIdx && i <= endIdx && startIdx !== -1 && endIdx !== -1
      const upliftMultiplier = isInPromoPeriod ? (1 + totalUplift) : 1
      const scenario = Math.round(d.base * upliftMultiplier)
      return {
        month: d.month,
        base: d.base,
        scenario,
        delta: scenario - d.base
      }
    })
  }, [promoDays, discountPct, startMonth, endMonth])

  const totalDelta = scenarioData.reduce((s, d) => s + d.delta, 0)
  const totalBase = scenarioData.reduce((s, d) => s + d.base, 0)
  const totalScenario = scenarioData.reduce((s, d) => s + d.scenario, 0)
  const pctDelta = ((totalDelta / totalBase) * 100)

  const baseRun = runsHistory.find(r => r.run_id === baseRunId) || runsHistory[0]

  const handleLoadScenario = (sc: SavedScenario) => {
    setScenarioName(sc.name)
    setDiscountPct(sc.discount_pct)
    setPromoDays(sc.promo_days)
    setStartMonth(sc.startMonth)
    setEndMonth(sc.endMonth)
  }

  const handleSaveScenario = () => {
    const newScenario: SavedScenario = {
      scenario_id: `SC-${String(savedScenarios.length + 1).padStart(3, '0')}`,
      name: scenarioName,
      discount_pct: discountPct,
      promo_days: promoDays,
      startMonth,
      endMonth,
      createdAt: new Date().toISOString()
    }
    setSavedScenarios([newScenario, ...savedScenarios])
    setShowSaveSuccess(true)
    setTimeout(() => setShowSaveSuccess(false), 2000)
  }

  const handleDeleteScenario = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSavedScenarios(savedScenarios.filter(s => s.scenario_id !== id))
  }

  const handleExport = () => {
    const csvContent = [
      ["Month", "Base Forecast", "Scenario Forecast", "Delta", "Delta %"].join(","),
      ...scenarioData.map(row => [
        row.month,
        row.base,
        row.scenario,
        row.delta,
        `${((row.delta / row.base) * 100).toFixed(1)}%`
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${scenarioName.replace(/\s+/g, '_')}_scenario.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const monthOptions = [
    { value: "2026-01", label: "Jan 2026" },
    { value: "2026-02", label: "Feb 2026" },
    { value: "2026-03", label: "Mar 2026" },
    { value: "2026-04", label: "Apr 2026" },
    { value: "2026-05", label: "May 2026" },
    { value: "2026-06", label: "Jun 2026" },
  ]

  return (
    <MainLayout title="Scenario Planner">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Scenarios"
          description="Adjust assumptions and see forecast deltas in real time."
        >
          <Button
            className="gap-1.5"
            onClick={handleSaveScenario}
            disabled={showSaveSuccess}
          >
            {showSaveSuccess ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Scenario
              </>
            )}
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </PageHeader>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Controls */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Scenario Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Scenario Name</Label>
                  <Input
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Enter scenario name..."
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Base Run</Label>
                  <Select value={baseRunId} onValueChange={setBaseRunId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {runsHistory
                        .filter((r) => r.status === "success")
                        .map((r) => (
                          <SelectItem key={r.run_id} value={r.run_id}>
                            {r.run_id} ({r.model_version})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Promo Days</Label>
                    <span className="text-xs font-medium text-slate-900 tabular-nums">
                      {promoDays} days
                    </span>
                  </div>
                  <Slider
                    value={[promoDays]}
                    onValueChange={([v]) => setPromoDays(v)}
                    min={0}
                    max={30}
                    step={1}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Discount %</Label>
                    <span className="text-xs font-medium text-slate-900 tabular-nums">
                      {discountPct}%
                    </span>
                  </div>
                  <Slider
                    value={[discountPct]}
                    onValueChange={([v]) => setDiscountPct(v)}
                    min={0}
                    max={50}
                    step={1}
                  />
                  {discountPct > 30 && (
                    <div className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <p className="text-[10px] text-amber-700">
                        Discount above 30% may reduce margin below threshold.
                      </p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Start Month</Label>
                    <Select value={startMonth} onValueChange={setStartMonth}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">End Month</Label>
                    <Select value={endMonth} onValueChange={setEndMonth}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} disabled={opt.value < startMonth}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Saved Scenarios */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Saved Scenarios ({savedScenarios.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {savedScenarios.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No saved scenarios yet</p>
                ) : (
                  savedScenarios.map((sc) => (
                    <div
                      key={sc.scenario_id}
                      className="flex items-center justify-between rounded-md border border-slate-200 p-2.5 text-left transition-colors hover:bg-slate-50 hover:border-slate-300 group cursor-pointer"
                      onClick={() => handleLoadScenario(sc)}
                    >
                      <div>
                        <p className="text-xs font-medium text-slate-900">{sc.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {sc.discount_pct}% off, {sc.promo_days}d promo • {sc.startMonth === sc.endMonth
                            ? monthOptions.find(m => m.value === sc.startMonth)?.label
                            : `${monthOptions.find(m => m.value === sc.startMonth)?.label?.split(' ')[0]}-${monthOptions.find(m => m.value === sc.endMonth)?.label?.split(' ')[0]}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {sc.scenario_id}
                        </Badge>
                        <button
                          onClick={(e) => handleDeleteScenario(sc.scenario_id, e)}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-opacity"
                          title="Delete scenario"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Output */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            {/* Delta KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <KPICard
                label="Total Delta"
                value={`+${totalDelta.toLocaleString()}`}
                delta={pctDelta}
                deltaLabel="vs base"
                definition="Absolute unit increase from scenario vs base forecast."
              />
              <KPICard
                label="Scenario Total"
                value={totalScenario.toLocaleString()}
                definition="Total forecasted units under this scenario."
              />
              <KPICard
                label="Base Total"
                value={totalBase.toLocaleString()}
                definition="Total forecasted units from base run."
              />
            </div>

            {/* Comparison Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Forecast Comparison: Base vs Scenario with Delta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScenarioComparisonChart data={scenarioData} />
              </CardContent>
            </Card>

            {/* Assumptions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Assumptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Applying <strong>{discountPct}%</strong> discount for <strong>{promoDays}</strong> promo days
                    from {monthOptions.find(m => m.value === startMonth)?.label} to {monthOptions.find(m => m.value === endMonth)?.label}.
                    Base run: <strong>{baseRun.run_id}</strong> ({baseRun.model_version}).
                    Expected volume uplift: <strong>+{((discountPct / 10) * 15).toFixed(1)}%</strong> from discount,
                    <strong> +{((promoDays / 7) * 1.5).toFixed(1)}%</strong> from promo days.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Delta Table */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    Month-by-Month Deltas
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleExport}>
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Month</TableHead>
                        <TableHead className="text-xs text-right">Base</TableHead>
                        <TableHead className="text-xs text-right">Scenario</TableHead>
                        <TableHead className="text-xs text-right">Delta</TableHead>
                        <TableHead className="text-xs text-right">Delta %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scenarioData.map((row) => (
                        <TableRow key={row.month} className={row.delta > 0 ? "bg-emerald-50/30" : ""}>
                          <TableCell className="text-xs font-medium">{row.month}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-slate-500">
                            {row.base.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-medium">
                            {row.scenario.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums">
                            <span className={row.delta > 0 ? "text-emerald-600 font-medium" : "text-slate-900"}>
                              {row.delta > 0 ? "+" : ""}
                              {row.delta.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums">
                            <span className={row.delta > 0 ? "text-emerald-600" : ""}>
                              {row.base > 0
                                ? `${((row.delta / row.base) * 100).toFixed(1)}%`
                                : "-"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
