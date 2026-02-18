"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Download,
  Database,
  Package,
  Calendar,
  Zap,
  ArrowDownCircle,
  ArrowRight,
  Upload,
  BarChart4,
  Settings,
  Check,
} from "lucide-react"

const REQUIRED_INPUTS = [
  {
    icon: Database,
    name: "Sales history",
    desc: "18–24 months of monthly or daily sales by SKU & channel",
    file: "sales_history_template.csv",
  },
  {
    icon: Package,
    name: "Product master",
    desc: "One row per SKU with product attributes",
    file: "product_master_template.csv",
  },
  {
    icon: Calendar,
    name: "Business calendar",
    desc: "Holidays & special events for seasonal pattern detection",
    file: "calendar_template.csv",
  },
]

const OPTIONAL_INPUTS = [
  {
    icon: Zap,
    name: "Promotions & pricing",
    desc: "Promo periods, discounts, and price changes for scenario planning",
    file: "promotions_template.csv",
  },
  {
    icon: ArrowDownCircle,
    name: "Inventory signals",
    desc: "Stock levels and out-of-stock flags to improve planning accuracy",
    file: "inventory_template.csv",
  },
]

const STEPS = [
  {
    n: 1,
    icon: Upload,
    title: "Upload your data",
    desc: "Connect sales history, product master, calendar, and optional files.",
  },
  {
    n: 2,
    icon: BarChart4,
    title: "Models train & validate",
    desc: "LightGBM + Prophet models run with automatic quality checks.",
  },
  {
    n: 3,
    icon: Settings,
    title: "Explore & export",
    desc: "Review forecasts, KPIs, and scenarios. Export for production teams.",
  },
]

const OUTCOMES = [
  "Demand forecast 3–6 months ahead with P10–P90 uncertainty range",
  "Planning KPIs: WAPE, Bias, Under/Over-plan rate, Top SKUs to fix",
  "Scenario planning for promotions, pricing, and distribution changes",
]

export default function HomePage() {
  const handleDownload = (filename: string) => {
    const link = document.createElement("a")
    link.href = `/templates/${filename}`
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <MainLayout title="">
      <div className="max-w-7xl mx-auto space-y-10 pb-12">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 text-white px-10 py-16">
          {/* subtle dot grid */}
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
          />
          {/* glassmorphism accent blob */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />

          <div className="relative max-w-2xl">
            <p className="text-blue-300 text-xs font-semibold tracking-widest uppercase mb-4">
              ML-Powered Demand Planning
            </p>
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-5">
              Turn sales data into
              <br />
              <span className="text-blue-200">forecasts you can act on.</span>
            </h1>
            <p className="text-blue-100/75 text-base mb-8 leading-relaxed">
              Upload 18–24 months of history. Get demand forecasts, uncertainty ranges,
              and planning KPIs for inventory &amp; production — in minutes.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-amber-400 hover:bg-amber-300 text-amber-900 font-semibold shadow-lg cursor-pointer"
                asChild
              >
                <a href="#data">
                  <Download className="mr-2 h-4 w-4" />
                  Download Templates
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white/50 text-white hover:bg-white/15 hover:text-white cursor-pointer"
                asChild
              >
                <Link href="/forecast">
                  View Forecast Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── DATA FILES + OUTPUTS ── */}
        <section id="data" className="grid lg:grid-cols-2 gap-6">

          {/* Left: Required + Optional */}
          <div className="space-y-4">

            {/* Required */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-enterprise-sm">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Required files</p>
              </div>
              <div className="space-y-5">
                {REQUIRED_INPUTS.map((item) => (
                  <div key={item.file} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                      <p className="text-slate-500 text-xs leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 h-8 px-3 text-blue-600 hover:bg-blue-50 cursor-pointer"
                      onClick={() => handleDownload(item.file)}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      CSV
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-enterprise-sm">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Optional files</p>
              </div>
              <div className="space-y-5">
                {OPTIONAL_INPUTS.map((item) => (
                  <div key={item.file} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                      <p className="text-slate-500 text-xs leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 h-8 px-3 text-amber-600 hover:bg-amber-50 cursor-pointer"
                      onClick={() => handleDownload(item.file)}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      CSV
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: What you get */}
          <div className="bg-gradient-to-br from-blue-800 to-blue-900 rounded-2xl p-8 text-white flex flex-col justify-between">
            <div>
              <p className="text-blue-300 text-xs font-semibold tracking-widest uppercase mb-4">
                What you get
              </p>
              <h2 className="text-2xl font-bold mb-6 leading-snug">
                Planning outputs<br />
                <span className="text-blue-200">built for operations.</span>
              </h2>
              <ul className="space-y-4">
                {OUTCOMES.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-blue-100/90">
                    <div className="w-5 h-5 rounded-full bg-blue-600/50 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-blue-200" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-8 pt-6 border-t border-blue-700/50">
              <p className="text-xs text-blue-400">
                Models: LightGBM + Prophet · Dataiku DSS Integration
              </p>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">How it works</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-enterprise-sm flex gap-4 items-start"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {step.n}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm mb-1">{step.title}</p>
                  <p className="text-slate-500 text-xs leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="text-center text-xs text-slate-400 pt-4 border-t border-slate-200">
          Demand Planning System · LightGBM + Prophet · Dataiku DSS · Built with Next.js
        </footer>

      </div>
    </MainLayout>
  )
}
