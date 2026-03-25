"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  Zap, TrendingUp, TrendingDown, Minus, Loader2, AlertCircle,
  BarChart3, Package, Calendar, Percent, Bug, ChevronDown, ChevronUp,
  Copy, Check, DollarSign, ArrowRight
} from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getDashboardFilters, predictCompare } from "@/lib/api-client"
// Recharts no longer used — waterfall is custom SVG

interface PredictResult {
  baseline: number
  scenario: number
  delta: number
  delta_pct: number
  explanations: Record<string, number>
}

interface FilterOptions {
  product_groups: string[]
  flavors: string[]
  sizes: string[]
}

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
]

const PROMO_TYPES = ["None", "Corporate", "Consumer", "Bundle", "Seasonal"]

const YEARS = [2023, 2024, 2025, 2026]

// Assumed average price per unit (THB) — for revenue estimation in demo
const AVG_PRICE_PER_UNIT = 150

// Map raw ML feature names → business-friendly labels
const FEATURE_LABEL_MAP: Record<string, string> = {
  promo_discount_pct: "Discount Effect",
  promo_days_in_month: "Promo Duration",
  promo_flag: "Promo Active",
  promo_type: "Promo Type",
  month: "Seasonality",
  month_id: "Time Trend",
  year: "Year Effect",
  flavor: "Product Mix",
  size: "Pack Size",
  product_group: "Category",
}

function featureLabel(raw: string): string {
  return FEATURE_LABEL_MAP[raw] || raw.replace(/_/g, " ")
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString()
}

function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `฿${(n / 1_000).toFixed(0)}K`
  return `฿${Math.round(n).toLocaleString()}`
}

// ──── Custom Waterfall Chart (pure SVG) ────
function WaterfallChart({ data }: { data: Array<{ name: string; base: number; value: number; fill: string; isTotal?: boolean }> }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (data.length === 0) return null

  const maxY = Math.max(...data.map(d => d.base + d.value)) * 1.15
  const padLeft = 60, padRight = 20, padTop = 30, padBottom = 60

  // Y-axis ticks
  const tickCount = 5
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((maxY / tickCount) * i))

  return (
    <div className="w-full h-full relative">
      <svg viewBox="0 0 700 340" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {yTicks.map((tick) => {
          const y = padTop + (1 - tick / maxY) * (340 - padTop - padBottom)
          return (
            <g key={tick}>
              <line x1={padLeft} y1={y} x2={700 - padRight} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
              <text x={padLeft - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">
                {tick >= 1000 ? `${(tick / 1000).toFixed(0)}k` : tick}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barW = Math.min(60, (700 - padLeft - padRight) / data.length - 12)
          const gap = (700 - padLeft - padRight) / data.length
          const x = padLeft + gap * i + (gap - barW) / 2
          const chartH = 340 - padTop - padBottom

          const barTop = padTop + (1 - (d.base + d.value) / maxY) * chartH
          const barH = (d.value / maxY) * chartH
          const isHovered = hoveredIndex === i

          return (
            <g key={i}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer"
            >
              {/* Bar */}
              <rect
                x={x} y={barTop} width={barW} height={Math.max(barH, 1)}
                rx={4} ry={4}
                fill={d.fill}
                opacity={isHovered ? 1 : 0.85}
                className="transition-opacity duration-150"
              />

              {/* Connector line (dashed) — from this bar's top to next bar's relevant edge */}
              {i < data.length - 1 && !d.isTotal && (
                <line
                  x1={x + barW} y1={padTop + (1 - (d.base + d.value) / maxY) * chartH}
                  x2={padLeft + gap * (i + 1) + (gap - barW) / 2} y2={padTop + (1 - (d.base + d.value) / maxY) * chartH}
                  stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth={1}
                />
              )}

              {/* Value label on bar */}
              <text
                x={x + barW / 2} y={barTop - 6}
                textAnchor="middle" fontSize={10} fontWeight={600}
                fill={d.isTotal ? "#475569" : d.fill === "#10b981" ? "#059669" : "#dc2626"}
              >
                {d.isTotal
                  ? formatNumber(d.value)
                  : `${d.fill === "#10b981" ? "+" : "-"}${formatNumber(d.value)}`
                }
              </text>

              {/* X label */}
              <text
                x={x + barW / 2} y={340 - padBottom + 16}
                textAnchor="middle" fontSize={10} fill="#64748b"
              >
                {d.name}
              </text>
            </g>
          )
        })}

        {/* Axis lines */}
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={340 - padBottom} stroke="#cbd5e1" />
        <line x1={padLeft} y1={340 - padBottom} x2={700 - padRight} y2={340 - padBottom} stroke="#cbd5e1" />
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div
          className="absolute bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 pointer-events-none z-10"
          style={{
            left: `${((padLeft + ((700 - padLeft - padRight) / data.length) * hoveredIndex + (700 - padLeft - padRight) / data.length / 2) / 700) * 100}%`,
            top: "10px",
            transform: "translateX(-50%)",
          }}
        >
          <p className="text-xs font-bold text-slate-700">{data[hoveredIndex].name}</p>
          <p className="text-xs text-slate-500 tabular-nums">
            {data[hoveredIndex].isTotal
              ? `${formatNumber(data[hoveredIndex].value)} units`
              : `${data[hoveredIndex].fill === "#10b981" ? "+" : "-"}${formatNumber(data[hoveredIndex].value)} units`
            }
          </p>
        </div>
      )}
    </div>
  )
}

export default function ScenarioPlannerPage() {
  // Filter options from API
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [filtersLoading, setFiltersLoading] = useState(true)

  // Product selection
  const [productGroup, setProductGroup] = useState("")
  const [flavor, setFlavor] = useState("")
  const [size, setSize] = useState("")

  // Time
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(1)

  // Promo
  const [promoEnabled, setPromoEnabled] = useState(false)
  const [promoType, setPromoType] = useState("None")
  const [discountPct, setDiscountPct] = useState(0)
  const [promoDays, setPromoDays] = useState(0)

  // Results
  const [result, setResult] = useState<PredictResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debug
  const [showDebug, setShowDebug] = useState(false)
  const [copied, setCopied] = useState(false)
  const [debugLog, setDebugLog] = useState<Array<{
    id: number
    timestamp: string
    type: "request" | "response" | "error" | "info"
    endpoint: string
    method: string
    duration?: number
    status?: number | string
    payload?: any
    response?: any
    error?: string
  }>>([])
  const debugIdRef = useRef(0)

  const addDebugLog = useCallback((entry: Omit<typeof debugLog[0], "id" | "timestamp">) => {
    debugIdRef.current += 1
    setDebugLog(prev => [{
      ...entry,
      id: debugIdRef.current,
      timestamp: new Date().toISOString(),
    }, ...prev].slice(0, 50)) // keep last 50
  }, [])

  // Load filter options on mount
  useEffect(() => {
    async function loadFilters() {
      const t0 = performance.now()
      addDebugLog({ type: "info", endpoint: "/api/v1/dashboard/filters", method: "GET", payload: null })
      try {
        const data = await getDashboardFilters()
        addDebugLog({
          type: "response", endpoint: "/api/v1/dashboard/filters", method: "GET",
          status: 200, duration: Math.round(performance.now() - t0),
          response: { product_groups: data.product_groups?.length, flavors: data.flavors?.length, sizes: data.sizes?.length },
        })
        setFilterOptions(data)
        if (data.product_groups?.length > 0) setProductGroup(data.product_groups[0])
        if (data.flavors?.length > 0) setFlavor(data.flavors[0])
        if (data.sizes?.length > 0) setSize(data.sizes[0])
      } catch (err: any) {
        addDebugLog({
          type: "error", endpoint: "/api/v1/dashboard/filters", method: "GET",
          duration: Math.round(performance.now() - t0), error: err.message,
        })
      } finally {
        setFiltersLoading(false)
      }
    }
    loadFilters()
  }, [])

  // Cascade filters when product_group changes
  useEffect(() => {
    if (!productGroup) return
    async function cascadeFilters() {
      try {
        const data = await getDashboardFilters({ product_group: productGroup })
        if (data.flavors?.length > 0) {
          setFilterOptions(prev => prev ? { ...prev, flavors: data.flavors, sizes: data.sizes } : prev)
          if (!data.flavors.includes(flavor)) setFlavor(data.flavors[0])
          if (!data.sizes.includes(size)) setSize(data.sizes[0])
        }
      } catch (err) {
        console.error("Failed to cascade filters:", err)
      }
    }
    cascadeFilters()
  }, [productGroup])

  const handlePredict = useCallback(async () => {
    if (!productGroup || !flavor || !size) return

    const requestPayload = {
      product_group: productGroup,
      flavor,
      size,
      year,
      month,
      promo_days_in_month: promoEnabled ? promoDays : 0,
      promo_discount_pct: promoEnabled ? discountPct : 0,
      promo_type: promoEnabled ? promoType : "None",
    }

    setLoading(true)
    setError(null)

    addDebugLog({
      type: "request", endpoint: "/api/v1/predict/compare", method: "POST",
      payload: requestPayload,
    })

    const t0 = performance.now()
    try {
      const data = await predictCompare(requestPayload)
      const duration = Math.round(performance.now() - t0)
      addDebugLog({
        type: "response", endpoint: "/api/v1/predict/compare", method: "POST",
        status: 200, duration, response: data,
      })
      setResult(data)
    } catch (err: any) {
      const duration = Math.round(performance.now() - t0)
      addDebugLog({
        type: "error", endpoint: "/api/v1/predict/compare", method: "POST",
        duration, status: err.statusCode || "ERR", error: err.message,
      })
      setError(err.message || "Prediction failed")
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [productGroup, flavor, size, year, month, promoEnabled, promoDays, discountPct, promoType, addDebugLog])

  // Waterfall chart data: Model Average (0) → each factor contribution → Scenario prediction
  const waterfallData = useMemo(() => {
    if (!result?.explanations) return []
    const factors = Object.entries(result.explanations)
      .map(([feature, impact]) => ({
        name: featureLabel(feature),
        impact: typeof impact === "number" ? impact : 0,
      }))
      .filter(f => Math.abs(f.impact) > 0)
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
      .slice(0, 6)

    // Calculate the model's base (intercept) = prediction - sum of all explanations
    const totalExplained = Object.values(result.explanations)
      .reduce((sum: number, v) => sum + (typeof v === "number" ? v : 0), 0)
    const modelBase = result.scenario - totalExplained

    const items: Array<{ name: string; base: number; value: number; fill: string; isTotal?: boolean }> = []

    // Start: Model Base (avg prediction)
    items.push({ name: "Model Avg", base: 0, value: Math.max(modelBase, 0), fill: "#94a3b8", isTotal: true })

    // Each factor as incremental step
    let running = Math.max(modelBase, 0)
    for (const f of factors) {
      if (f.impact >= 0) {
        items.push({ name: f.name, base: running, value: f.impact, fill: "#10b981" })
      } else {
        items.push({ name: f.name, base: Math.max(running + f.impact, 0), value: Math.abs(f.impact), fill: "#ef4444" })
      }
      running += f.impact
    }

    // End: Scenario prediction
    items.push({ name: "Prediction", base: 0, value: result.scenario, fill: "#3b82f6", isTotal: true })

    return items
  }, [result])

  // Revenue estimates
  const revenueBaseline = result ? result.baseline * AVG_PRICE_PER_UNIT : 0
  const revenueScenario = result ? result.scenario * AVG_PRICE_PER_UNIT * (1 - (promoEnabled ? discountPct / 100 : 0)) : 0
  const revenueGross = result ? result.scenario * AVG_PRICE_PER_UNIT : 0
  const revenueDelta = revenueScenario - revenueBaseline

  const canPredict = productGroup && flavor && size

  return (
    <MainLayout
      title="What-if Scenario"
      description="Select product features, adjust promo parameters, and predict sales using ML model."
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ──── Left: Controls (compact single card) ──── */}
          <div className="flex flex-col gap-3">
            <Card className="overflow-hidden">
              <div className="divide-y divide-slate-100">
                {/* ── Product & Time ── */}
                <div className="px-4 py-3 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-xs font-bold text-slate-700">Product & Period</span>
                  </div>

                  {filtersLoading ? (
                    <div className="flex items-center justify-center py-4 text-xs text-slate-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Loading...
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Product Group</Label>
                        <Select value={productGroup} onValueChange={setProductGroup}>
                          <SelectTrigger className="h-7 text-xs mt-0.5">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {filterOptions?.product_groups?.map((pg) => (
                              <SelectItem key={pg} value={pg}>{pg}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Flavor</Label>
                        <Select value={flavor} onValueChange={setFlavor}>
                          <SelectTrigger className="h-7 text-xs mt-0.5">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {filterOptions?.flavors?.map((f) => (
                              <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Size</Label>
                        <Select value={size} onValueChange={setSize}>
                          <SelectTrigger className="h-7 text-xs mt-0.5">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {filterOptions?.sizes?.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Year</Label>
                        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                          <SelectTrigger className="h-7 text-xs mt-0.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {YEARS.map((y) => (
                              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Month</Label>
                        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                          <SelectTrigger className="h-7 text-xs mt-0.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((m) => (
                              <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Promotion ── */}
                <div className="px-4 py-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Zap className={`h-3.5 w-3.5 ${promoEnabled ? "text-amber-500" : "text-slate-400"}`} />
                      <span className={`text-xs font-bold ${promoEnabled ? "text-slate-700" : "text-slate-400"}`}>Promotion</span>
                    </div>
                    <Switch checked={promoEnabled} onCheckedChange={setPromoEnabled} />
                  </div>

                  <div className={`space-y-2.5 transition-all duration-200 ${promoEnabled ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Type</Label>
                        <Select value={promoType} onValueChange={setPromoType}>
                          <SelectTrigger className="h-7 text-xs mt-0.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROMO_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Duration</Label>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Slider
                            value={[promoDays]}
                            onValueChange={([v]) => setPromoDays(v)}
                            min={0} max={31} step={1}
                            className="flex-1"
                          />
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded w-12 text-center shrink-0">
                            {promoDays}d
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Discount</Label>
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          {discountPct}%
                        </span>
                      </div>
                      <Slider
                        value={[discountPct]}
                        onValueChange={([v]) => setDiscountPct(v)}
                        min={0} max={50} step={5}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Predict Button */}
            <Button
              className="w-full gap-2"
              onClick={handlePredict}
              disabled={!canPredict || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" />
                  Run Scenario
                </>
              )}
            </Button>
          </div>

          {/* ──── Right: Results (CEO-friendly) ──── */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Empty state */}
            {!result && !loading && !error && (
              <Card className="flex items-center justify-center py-20">
                <div className="text-center space-y-3">
                  <BarChart3 className="h-12 w-12 text-slate-200 mx-auto" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">No prediction yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Select product, adjust promo settings, then click <strong>Run Scenario</strong>
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Loading */}
            {loading && (
              <Card className="flex items-center justify-center py-20">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                  <p className="text-sm text-slate-500">Calling ML model...</p>
                </div>
              </Card>
            )}

            {/* ──── Results ──── */}
            {result && !loading && (
              <>
                {/* Zone 1: Hero Delta */}
                <Card className={`p-6 ${result.delta >= 0 ? "border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white" : "border-red-200 bg-gradient-to-br from-red-50/80 to-white"}`}>
                  <div className="text-center space-y-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Estimated Impact</p>

                    {/* Big delta number */}
                    <div className="flex items-center justify-center gap-3">
                      {result.delta > 0 ? (
                        <TrendingUp className="h-8 w-8 text-emerald-500" />
                      ) : result.delta < 0 ? (
                        <TrendingDown className="h-8 w-8 text-red-500" />
                      ) : (
                        <Minus className="h-8 w-8 text-slate-400" />
                      )}
                      <span className={`text-4xl font-black tabular-nums tracking-tight ${result.delta >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {result.delta >= 0 ? "+" : ""}{formatNumber(result.delta)}
                      </span>
                      <span className={`text-lg font-bold ${result.delta >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        ({result.delta_pct >= 0 ? "+" : ""}{result.delta_pct.toFixed(1)}%)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">units / month</p>

                    {/* Progress bar comparison */}
                    <div className="max-w-md mx-auto space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Baseline</span>
                        <span className="font-bold text-slate-700 tabular-nums">{formatNumber(result.baseline)}</span>
                      </div>
                      <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-slate-400 rounded-full transition-all duration-700"
                          style={{ width: `${Math.min((result.baseline / Math.max(result.baseline, result.scenario)) * 100, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-blue-600 font-medium">Scenario</span>
                        <span className="font-bold text-blue-700 tabular-nums">{formatNumber(result.scenario)}</span>
                      </div>
                      <div className="relative h-3 bg-blue-100 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-700"
                          style={{ width: `${Math.min((result.scenario / Math.max(result.baseline, result.scenario)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Assumptions tags */}
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                        <Package className="h-3 w-3" /> {productGroup} / {flavor} / {size}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-medium">
                        <Calendar className="h-3 w-3" /> {MONTHS.find(m => m.value === month)?.label} {year}
                      </span>
                      {promoEnabled && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium">
                          <Zap className="h-3 w-3" /> {discountPct}% off / {promoDays}d / {promoType}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Zone 2: Volume & Revenue side by side */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Volume Gauge */}
                  <Card className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-700">Volume</h3>
                    </div>
                    <div className="space-y-3">
                      {/* Visual gauge */}
                      <div className="relative pt-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-400">0</span>
                          <span className="text-[10px] text-slate-400">{formatNumber(Math.max(result.baseline, result.scenario) * 1.2)}</span>
                        </div>
                        <div className="h-6 bg-slate-100 rounded-lg relative overflow-hidden">
                          {/* Baseline marker */}
                          <div
                            className="absolute inset-y-0 left-0 bg-slate-300 rounded-lg"
                            style={{ width: `${(result.baseline / (Math.max(result.baseline, result.scenario) * 1.2)) * 100}%` }}
                          />
                          {/* Scenario overlay */}
                          <div
                            className={`absolute inset-y-0 left-0 rounded-lg transition-all duration-700 ${result.delta >= 0 ? "bg-blue-500/70" : "bg-red-400/70"}`}
                            style={{ width: `${(result.scenario / (Math.max(result.baseline, result.scenario) * 1.2)) * 100}%` }}
                          />
                          {/* Baseline line marker */}
                          <div
                            className="absolute inset-y-0 w-0.5 bg-slate-800 z-10"
                            style={{ left: `${(result.baseline / (Math.max(result.baseline, result.scenario) * 1.2)) * 100}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-[10px]">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-400 inline-block" /> Baseline</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" /> Scenario</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Additional Production</p>
                        <p className={`text-xl font-black tabular-nums ${result.delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {result.delta >= 0 ? "+" : ""}{formatNumber(result.delta)} units
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Revenue Impact */}
                  <Card className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-700">Revenue Estimate</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Baseline Revenue</span>
                          <span className="text-sm font-bold text-slate-700 tabular-nums">{formatCurrency(revenueBaseline)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Gross Revenue (Scenario)</span>
                          <span className="text-sm font-bold text-slate-700 tabular-nums">{formatCurrency(revenueGross)}</span>
                        </div>
                        {promoEnabled && discountPct > 0 && (
                          <div className="flex items-center justify-between text-red-500">
                            <span className="text-xs">Discount Cost ({discountPct}%)</span>
                            <span className="text-sm font-bold tabular-nums">-{formatCurrency(revenueGross - revenueScenario)}</span>
                          </div>
                        )}
                        <hr className="border-slate-200" />
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700">Net Revenue (Scenario)</span>
                          <span className="text-sm font-bold text-blue-700 tabular-nums">{formatCurrency(revenueScenario)}</span>
                        </div>
                      </div>

                      <div className={`rounded-lg p-3 text-center ${revenueDelta >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Net Revenue Impact</p>
                        <p className={`text-xl font-black tabular-nums ${revenueDelta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {revenueDelta >= 0 ? "+" : ""}{formatCurrency(revenueDelta)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          based on avg. ฿{AVG_PRICE_PER_UNIT}/unit
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Zone 3: Waterfall Chart */}
                {waterfallData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-bold text-slate-700">
                            What&apos;s Driving the Change?
                          </CardTitle>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Model Average <ArrowRight className="inline h-2.5 w-2.5" /> each factor contribution <ArrowRight className="inline h-2.5 w-2.5" /> Scenario Prediction
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Increases</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Decreases</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[340px]">
                        <WaterfallChart data={waterfallData} />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>

        {/* ──── Debug Panel ──── */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-950 text-slate-300">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowDebug(!showDebug)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setShowDebug(!showDebug) }}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-mono font-bold text-amber-400">DEBUG PANEL</span>
              {debugLog.length > 0 && (
                <span className="text-[10px] font-mono bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                  {debugLog.length} log{debugLog.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {debugLog.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDebugLog([]) }}
                  className="text-[10px] font-mono text-slate-500 hover:text-red-400 transition-colors px-2 py-0.5"
                >
                  Clear
                </button>
              )}
              {showDebug ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
            </div>
          </div>

          {showDebug && (
            <div className="max-h-[500px] overflow-y-auto">
              {debugLog.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-slate-500 font-mono">
                  No API calls yet. Click &quot;Run Scenario&quot; to see requests here.
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {debugLog.map((entry) => (
                    <div key={entry.id} className="px-4 py-3 hover:bg-slate-900/50 transition-colors">
                      {/* Header row */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          entry.type === "request" ? "bg-blue-900/50 text-blue-400" :
                          entry.type === "response" ? "bg-emerald-900/50 text-emerald-400" :
                          entry.type === "error" ? "bg-red-900/50 text-red-400" :
                          "bg-slate-700 text-slate-400"
                        }`}>
                          {entry.type.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-violet-400">
                          {entry.method}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 flex-1 truncate">
                          {entry.endpoint}
                        </span>
                        {entry.status && (
                          <span className={`text-[10px] font-mono font-bold ${
                            entry.status === 200 ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {entry.status}
                          </span>
                        )}
                        {entry.duration !== undefined && (
                          <span className="text-[10px] font-mono text-slate-500">
                            {entry.duration}ms
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-600">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Payload */}
                      {entry.payload && (
                        <div className="mt-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] font-mono text-slate-500 uppercase">Request Body</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(entry.payload, null, 2))
                                setCopied(true)
                                setTimeout(() => setCopied(false), 1500)
                              }}
                              className="text-[9px] font-mono text-slate-600 hover:text-slate-300 flex items-center gap-1 transition-colors"
                            >
                              {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                              {copied ? "Copied" : "Copy"}
                            </button>
                          </div>
                          <pre className="text-[10px] font-mono bg-slate-900 rounded p-2 overflow-x-auto text-cyan-300 leading-relaxed whitespace-pre-wrap">
                            {JSON.stringify(entry.payload, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Response */}
                      {entry.response && (
                        <div className="mt-1.5">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] font-mono text-slate-500 uppercase">Response Data</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(entry.response, null, 2))
                                setCopied(true)
                                setTimeout(() => setCopied(false), 1500)
                              }}
                              className="text-[9px] font-mono text-slate-600 hover:text-slate-300 flex items-center gap-1 transition-colors"
                            >
                              {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                              {copied ? "Copied" : "Copy"}
                            </button>
                          </div>
                          <pre className="text-[10px] font-mono bg-slate-900 rounded p-2 overflow-x-auto text-emerald-300 leading-relaxed whitespace-pre-wrap">
                            {JSON.stringify(entry.response, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Error */}
                      {entry.error && (
                        <div className="mt-1.5">
                          <span className="text-[9px] font-mono text-slate-500 uppercase">Error</span>
                          <pre className="text-[10px] font-mono bg-red-950/50 rounded p-2 overflow-x-auto text-red-300 leading-relaxed whitespace-pre-wrap mt-0.5">
                            {entry.error}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
