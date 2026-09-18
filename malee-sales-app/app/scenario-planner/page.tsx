"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, Loader2, Play } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getDashboardFilters, predictCompare } from "@/lib/api-client"

interface FilterOptions {
  product_groups: string[]
  flavors: string[]
  sizes: string[]
  mechgroups?: string[]
}

/** One prediction the user asked for, kept so the tries can be compared. */
interface Attempt {
  n: number
  promoType: string | null // null when the try had no promotion
  discountPct: number
  promoDays: number
  baseline: number
  scenario: number
  delta: number
  deltaPct: number
  explanations: Record<string, number>
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const YEARS = [2023, 2024, 2025, 2026]
const NO_PROMOTION = "No Promotion"

// what the model calls a feature → what a planner calls it
const DRIVER_LABEL: Record<string, string> = {
  promo_discount_pct: "Discount",
  promo_days_in_month: "Promotion days",
  promo_flag: "Running a promotion",
  promo_type: "Mechanic",
  month: "Month of year",
  month_id: "Trend over time",
  year: "Year",
  flavor: "Flavor",
  size: "Pack size",
  product_group: "Category",
}

const units = (n: number) => Math.round(n).toLocaleString()

/** "+฿409K". The symbol is returned apart so a headline can set it smaller than the figure. */
function baht(n: number): { symbol: string; figure: string } {
  const a = Math.abs(n)
  const figure = a >= 1_000_000 ? `${(a / 1_000_000).toFixed(2)}M`
    : a >= 1_000 ? `${Math.round(a / 1_000).toLocaleString()}K`
    : Math.round(a).toLocaleString()
  return { symbol: `${n < 0 ? "−" : "+"}฿`, figure }
}

const bahtText = (n: number) => { const { symbol, figure } = baht(n); return symbol + figure }

function describe(t: Attempt): string {
  return t.promoType === null ? "No promotion" : `${t.promoType}, ${t.discountPct}% off, ${t.promoDays} days`
}

export default function ScenarioPlannerPage() {
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)

  const [productGroup, setProductGroup] = useState("")
  const [flavor, setFlavor] = useState("")
  const [size, setSize] = useState("")
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(1)

  const [promoEnabled, setPromoEnabled] = useState(false)
  const [promoType, setPromoType] = useState("Weekly Deal")
  const [discountPct, setDiscountPct] = useState(10)
  const [promoDays, setPromoDays] = useState(7)

  const [price, setPrice] = useState(150)
  const [tries, setTries] = useState<Attempt[]>([])
  const [activeTry, setActiveTry] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load the catalog once, then narrow flavors and sizes to the chosen group
  useEffect(() => {
    getDashboardFilters()
      .then(data => {
        setFilterOptions(data)
        if (data.product_groups?.length) setProductGroup(data.product_groups[0])
        if (data.flavors?.length) setFlavor(data.flavors[0])
        if (data.sizes?.length) setSize(data.sizes[0])
      })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  useEffect(() => {
    if (!productGroup) return
    let live = true
    getDashboardFilters({ product_group: productGroup })
      .then(data => {
        if (!live || !data.flavors?.length) return
        setFilterOptions(prev => (prev ? { ...prev, flavors: data.flavors, sizes: data.sizes } : prev))
        setFlavor(f => (data.flavors.includes(f) ? f : data.flavors[0]))
        setSize(s => (data.sizes.includes(s) ? s : data.sizes[0]))
      })
      .catch(console.error)
    return () => { live = false }
  }, [productGroup])

  // the tries compare one product in one month, so changing either starts a fresh list
  useEffect(() => {
    setTries([])
    setActiveTry(null)
  }, [productGroup, flavor, size, year, month])

  const mechanics = useMemo(() => (filterOptions?.mechgroups ?? []).filter(m => m !== NO_PROMOTION), [filterOptions])
  useEffect(() => {
    if (mechanics.length && !mechanics.includes(promoType)) setPromoType(mechanics[0])
  }, [mechanics, promoType])

  const canPredict = Boolean(productGroup && flavor && size)

  const run = useCallback(async () => {
    if (!canPredict) return
    setLoading(true)
    setError(null)
    try {
      const data = await predictCompare({
        product_group: productGroup,
        flavor,
        size,
        year,
        month,
        promo_days_in_month: promoEnabled ? promoDays : 0,
        promo_discount_pct: promoEnabled ? discountPct : 0,
        promo_type: promoEnabled ? promoType : NO_PROMOTION,
      })
      const attempt: Attempt = {
        n: tries.length + 1,
        promoType: promoEnabled ? promoType : null,
        discountPct: promoEnabled ? discountPct : 0,
        promoDays: promoEnabled ? promoDays : 0,
        baseline: data.baseline,
        scenario: data.scenario,
        delta: data.delta,
        deltaPct: data.delta_pct,
        explanations: data.explanations ?? {},
      }
      setTries(prev => [...prev, attempt])
      setActiveTry(attempt.n)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [canPredict, productGroup, flavor, size, year, month, promoEnabled, promoDays, discountPct, promoType, tries.length])

  /** What the promotion is worth: the extra units at full price, less the discount given on every unit sold. */
  const money = useCallback((t: Attempt) => {
    const discountCost = t.scenario * price * (t.discountPct / 100)
    return { discountCost, net: t.scenario * price * (1 - t.discountPct / 100) - t.baseline * price }
  }, [price])

  const current = tries.find(t => t.n === activeTry) ?? null
  const bestNet = useMemo(() => {
    const scored = tries.map(t => ({ n: t.n, net: money(t).net }))
    return scored.length ? scored.reduce((a, b) => (b.net > a.net ? b : a)) : null
  }, [tries, money])

  // the model's own contributions for this scenario, largest first
  const drivers = useMemo(() => {
    if (!current) return []
    const rows = Object.entries(current.explanations)
      .map(([feature, impact]) => ({ label: DRIVER_LABEL[feature] ?? feature.replace(/_/g, " "), impact: Number(impact) || 0 }))
      .filter(r => Math.abs(r.impact) >= 1)
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
      .slice(0, 5)
    const widest = Math.max(1, ...rows.map(r => Math.abs(r.impact)))
    return rows.map(r => ({ ...r, width: (Math.abs(r.impact) / widest) * 100 }))
  }, [current])

  const load = (t: Attempt) => {
    setActiveTry(t.n)
    setPromoEnabled(t.promoType !== null)
    if (t.promoType) setPromoType(t.promoType)
    setDiscountPct(t.discountPct)
    setPromoDays(t.promoDays)
  }

  return (
    <MainLayout
      title="What-if Scenario"
      description="Try a promotion on one product and month, then compare the tries"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">

        {/* ── Controls ─────────────────────────────────────────────── */}
        <aside className="w-full shrink-0 rounded-2xl border border-slate-200 bg-white lg:w-[320px]">
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Product and month</h2>
              <div className="grid grid-cols-2 gap-2">
                <Select value={productGroup} onValueChange={setProductGroup}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Group" /></SelectTrigger>
                  <SelectContent>{(filterOptions?.product_groups ?? []).map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={flavor} onValueChange={setFlavor}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Flavor" /></SelectTrigger>
                  <SelectContent>{(filterOptions?.flavors ?? []).map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Size" /></SelectTrigger>
                  <SelectContent>{(filterOptions?.sizes ?? []).map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m.slice(0, 3)}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Promotion</h2>
              <Switch checked={promoEnabled} onCheckedChange={setPromoEnabled} aria-label="Promotion" />
            </div>

            <div className={`flex flex-col gap-5 transition-opacity ${promoEnabled ? "" : "pointer-events-none opacity-40"}`}>
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <Label className="text-sm font-semibold text-slate-800">Discount</Label>
                  <span className="text-2xl font-extrabold tabular-nums text-slate-900">{discountPct}%</span>
                </div>
                <Slider value={[discountPct]} onValueChange={([v]) => setDiscountPct(v)} min={0} max={50} step={5} aria-label="Discount percent" />
                <div className="flex justify-between text-[11px] text-slate-400"><span>0%</span><span>50%</span></div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <Label className="text-sm font-semibold text-slate-800">Promotion days</Label>
                  <span className="text-2xl font-extrabold tabular-nums text-slate-900">{promoDays}</span>
                </div>
                <Slider value={[promoDays]} onValueChange={([v]) => setPromoDays(v)} min={0} max={31} step={1} aria-label="Promotion days" />
                <div className="flex justify-between text-[11px] text-slate-400"><span>0</span><span>31</span></div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm font-semibold text-slate-800">Mechanic</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {mechanics.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPromoType(m)}
                      aria-pressed={promoType === m}
                      className={`rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                        promoType === m ? "bg-indigo-50 text-indigo-800 ring-2 ring-indigo-500" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {m.replace(" Program", "").replace(" Points", "")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={run} disabled={!canPredict || loading} className="mt-1 h-11 w-full gap-2 text-sm font-bold">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Running…</> : <><Play className="h-4 w-4" />Run Scenario</>}
            </Button>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
                <span className="text-rose-800">{error}</span>
              </div>
            )}
          </div>
        </aside>

        {/* ── Result and tries ─────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {current ? (
            <section className="rounded-2xl border border-slate-200 bg-white">
              <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-6 py-3.5">
                <h2 className="text-sm font-bold text-slate-900">
                  Try {current.n}{" "}
                  <span className="font-medium text-slate-500">{describe(current)}</span>
                </h2>
                <p className="text-xs text-slate-500">{flavor} {size} · {MONTHS[month - 1]} {year}</p>
              </header>

              <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="px-6 py-5">
                  <p className="text-xs font-medium text-slate-500">Units this month</p>
                  <p className="mt-1 text-4xl font-extrabold leading-none tracking-tight tabular-nums text-slate-900">{units(current.scenario)}</p>
                  <p className="mt-2 text-xs text-slate-500">{units(current.baseline)} without a promotion</p>
                </div>
                <div className="px-6 py-5">
                  <p className="text-xs font-medium text-slate-500">Extra units</p>
                  <p className={`mt-1 text-4xl font-extrabold leading-none tracking-tight tabular-nums ${current.delta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {current.delta >= 0 ? "+" : "−"}{units(Math.abs(current.delta))}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">{current.deltaPct >= 0 ? "+" : ""}{current.deltaPct.toFixed(1)}% on the month</p>
                </div>
                <div className="px-6 py-5">
                  <p className="text-xs font-medium text-slate-500">Net revenue</p>
                  <p className={`mt-1 text-4xl font-extrabold leading-none tracking-tight tabular-nums ${money(current).net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    <span className="mr-0.5 text-2xl font-bold">{baht(money(current).net).symbol}</span>
                    {baht(money(current).net).figure}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-500">
                    at
                    <span className="inline-flex items-center rounded border border-slate-300 bg-white px-1.5 py-0.5 text-slate-900">
                      ฿
                      <input
                        type="number"
                        value={price}
                        min={1}
                        onChange={e => setPrice(Math.max(1, Number(e.target.value) || 1))}
                        aria-label="Price per unit in baht, your assumption"
                        className="w-11 border-0 bg-transparent p-0 text-xs font-semibold focus:outline-none"
                      />
                    </span>
                    per unit, your figure
                  </p>
                </div>
              </div>

              {drivers.length > 0 && (
                <div className="flex flex-col gap-2.5 border-t border-slate-100 px-6 py-5">
                  <h3 className="text-sm font-bold text-slate-900">Where the units come from</h3>
                  {drivers.map(d => (
                    <div key={d.label} className="grid grid-cols-[150px_1fr_84px] items-center gap-3">
                      <span className="truncate text-xs text-slate-600">{d.label}</span>
                      <span className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <span className={`block h-full rounded-full ${d.impact >= 0 ? "bg-blue-600" : "bg-rose-500"}`} style={{ width: `${d.width}%` }} />
                      </span>
                      <span className={`text-right text-xs font-bold tabular-nums ${d.impact >= 0 ? "text-slate-900" : "text-rose-700"}`}>
                        {d.impact >= 0 ? "+" : "−"}{units(Math.abs(d.impact))}
                      </span>
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-400">
                    The model&apos;s own contributions for this prediction (TreeSHAP), not a rule of thumb.
                  </p>
                </div>
              )}
            </section>
          ) : (
            <section className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <p className="text-base font-semibold text-slate-800">Nothing tried yet</p>
              <p className="max-w-sm text-sm text-slate-500">
                Pick a product and month, switch the promotion on, set a discount and a length, then run it. Each try is kept below so you can compare.
              </p>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white">
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-6 py-3.5">
              <h2 className="text-sm font-bold text-slate-900">Every try this session</h2>
              <p className="text-xs text-slate-500">
                {tries.length === 0
                  ? "Runs for one product and month; changing either starts a new list"
                  : "Select a row to load it back into the controls"}
              </p>
            </header>

            {tries.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-slate-400">No tries yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500">
                      <th className="w-14 px-6 py-2.5 text-left">Try</th>
                      <th className="px-3 py-2.5 text-left">Promotion</th>
                      <th className="px-3 py-2.5 text-right">Units</th>
                      <th className="px-3 py-2.5 text-right">Extra</th>
                      <th className="px-3 py-2.5 text-right">Discount cost</th>
                      <th className="px-6 py-2.5 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {tries.map(t => {
                      const { discountCost, net } = money(t)
                      const isActive = t.n === activeTry
                      return (
                        <tr
                          key={t.n}
                          onClick={() => load(t)}
                          className={`cursor-pointer transition-colors ${isActive ? "bg-indigo-50/70" : "hover:bg-slate-50"}`}
                        >
                          <td className="px-6 py-3 text-xs font-bold text-slate-400">{t.n}</td>
                          <td className="px-3 py-3">
                            <span className="font-medium text-slate-800">{describe(t)}</span>
                            {bestNet?.n === t.n && tries.length > 1 && (
                              <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">best net</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-900">{units(t.scenario)}</td>
                          <td className={`px-3 py-3 text-right font-semibold tabular-nums ${t.delta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                            {t.delta >= 0 ? "+" : "−"}{units(Math.abs(t.delta))}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-rose-700">{t.discountPct > 0 ? bahtText(-discountCost) : "—"}</td>
                          <td className={`px-6 py-3 text-right font-bold tabular-nums ${net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{bahtText(net)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </MainLayout>
  )
}
