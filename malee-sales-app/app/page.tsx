"use client"
import { useEffect, useState } from "react"

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
  TrendingUp,
  Target,
  AlertTriangle,
  Clock,
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 text-white px-10 py-14">
          {/* inline keyframes for hero animations */}
          <style>{`
            @keyframes heroFloat {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
            }
            @keyframes heroFloatSmall {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-4px); }
            }
            @keyframes heroFloatSlow {
              0%, 100% { transform: translateY(0px) rotate(-1deg); }
              50% { transform: translateY(-6px) rotate(1deg); }
            }
            @keyframes heroPulseDot {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.4; transform: scale(0.8); }
            }
            @keyframes heroSlideUp {
              from { opacity: 0; transform: translateY(20px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes heroBarGrow {
              from { transform: scaleY(0); }
              to   { transform: scaleY(1); }
            }
            @keyframes heroLineDrawIn {
              from { stroke-dashoffset: 400; }
              to   { stroke-dashoffset: 0; }
            }
          `}</style>

          {/* subtle dot grid */}
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
          />
          {/* glassmorphism accent blobs */}
          <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-40 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

          <div className="relative grid lg:grid-cols-2 gap-8 items-center">
            {/* ── LEFT: text + CTA ── */}
            <div>
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

            {/* ── RIGHT: Animated Dashboard Preview ── */}
            <div className="hidden lg:flex justify-center items-center">
              {/* Tight wrapper — relative, sized to card + badge overflow only */}
              <div className="relative" style={{ width: 396, paddingTop: 24, paddingBottom: 28, paddingRight: 56 }}>

                {/* Main chart card */}
                <div
                  className="w-full rounded-2xl p-4 flex flex-col gap-2"
                  style={{
                    background: "rgba(20,40,100,0.75)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1.5px solid rgba(255,255,255,0.35)",
                    boxShadow: "0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
                    animation: "heroFloat 4s ease-in-out infinite",
                  }}
                >
                  {/* chart header */}
                  <div className="flex items-center justify-between">
                    <span className="text-white/90 text-xs font-semibold">Forecast vs Actual</span>
                    <span className="text-emerald-300 text-[10px] font-bold">+24.5%</span>
                  </div>
                  {/* legend */}
                  <div className="flex gap-3">
                    {[{ c: "#60a5fa", l: "Forecast" }, { c: "#a78bfa", l: "Actual" }, { c: "#34d399", l: "Growth" }].map(({ c, l }) => (
                      <div key={l} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: c }} />
                        <span className="text-white/60 text-[9px]">{l}</span>
                      </div>
                    ))}
                  </div>
                  {/* SVG sparkline */}
                  <svg width="100%" height="100" viewBox="0 0 268 90" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="hg1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="hg2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* green bar chart (background) */}
                    {[20, 28, 22, 30, 26, 34, 29, 38, 33, 42, 50, 58].map((h, i) => (
                      <rect
                        key={i}
                        x={i * 22 + 2}
                        y={90 - h}
                        width="16"
                        height={h}
                        rx="3"
                        fill="#34d399"
                        fillOpacity={i >= 10 ? "0.8" : "0.25"}
                        style={{
                          transformOrigin: `${i * 22 + 10}px 90px`,
                          animation: `heroBarGrow 0.6s ease-out ${i * 0.05}s both`,
                        }}
                      />
                    ))}
                    {/* Forecast area */}
                    <path
                      d="M0 75 C20 68, 40 60, 60 52 C80 44, 100 40, 120 34 C140 28, 160 22, 180 18 C200 14, 220 10, 240 6 C252 4, 260 2, 268 0"
                      fill="url(#hg1)"
                      stroke="none"
                    />
                    <path
                      d="M0 75 C20 68, 40 60, 60 52 C80 44, 100 40, 120 34 C140 28, 160 22, 180 18 C200 14, 220 10, 240 6 C252 4, 260 2, 268 0"
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="2"
                      strokeDasharray="400"
                      style={{ animation: "heroLineDrawIn 1.5s ease-out 0.2s both" }}
                    />
                    {/* dots on forecast line */}
                    {[[0, 75], [44, 52], [88, 34], [134, 18], [178, 8], [222, 3]].map(([x, y], i) => (
                      <circle key={i} cx={x} cy={y} r="3" fill="#60a5fa" stroke="white" strokeWidth="1.5"
                        style={{ animation: `heroSlideUp 0.4s ease-out ${0.3 + i * 0.15}s both` }}
                      />
                    ))}
                    {/* Actual dashed line */}
                    <path
                      d="M0 80 C20 74, 40 68, 60 63 C80 58, 100 54, 120 50 C140 46, 160 42, 180 38 C200 34, 220 30, 240 26 C252 24, 260 22, 268 20"
                      fill="none"
                      stroke="#a78bfa"
                      strokeWidth="1.5"
                      strokeDasharray="5 3"
                      strokeDashoffset="0"
                      style={{ animation: "heroLineDrawIn 1.5s ease-out 0.5s both" }}
                    />
                  </svg>

                  {/* Metric cards inside card */}
                  <div
                    className="flex gap-2"
                    style={{ animation: "heroSlideUp 0.6s ease-out 0.8s both" }}
                  >
                    {[
                      { label: "WAPE", value: "8.5%", color: "#60a5fa" },
                      { label: "Bias", value: "−2.1%", color: "#a78bfa" },
                      { label: "Accuracy", value: "+91%", color: "#34d399" },
                    ].map(({ label, value, color }) => (
                      <div
                        key={label}
                        className="flex-1 rounded-xl px-3 py-2 text-center"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.18)",
                        }}
                      >
                        <p className="text-white/50 text-[9px] font-medium mb-0.5">{label}</p>
                        <p className="font-bold text-sm" style={{ color }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Sync badge — top right of wrapper */}
                <div
                  className="absolute top-2 right-8 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.95)",
                    color: "#1e293b",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                    animation: "heroFloat 4s ease-in-out infinite",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-500 inline-block"
                    style={{ animation: "heroPulseDot 1.5s ease-in-out infinite" }}
                  />
                  Live Sync
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                </div>

                {/* Active runs badge — right center */}
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-end px-3 py-2 rounded-xl text-right"
                  style={{
                    background: "rgba(255,255,255,0.95)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                    animation: "heroFloat 5s ease-in-out infinite 1s",
                  }}
                >
                  <span className="text-[9px] text-slate-500 font-medium">Active runs</span>
                  <span className="text-blue-600 text-lg font-bold leading-none">1,247</span>
                </div>

                {/* Floating notification card — bottom left */}
                <div
                  className="absolute bottom-0 left-2 flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.95)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
                    animation: "heroFloatSlow 6s ease-in-out infinite 0.3s",
                  }}
                >
                  <BarChart4 className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-800 leading-none">New forecast ready!</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">8 SKUs · Q2 2025</p>
                  </div>
                </div>

              </div>{/* end tight wrapper */}
            </div>{/* end right column */}
          </div>{/* end grid */}
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
          <div className="bg-gradient-to-br from-blue-800 to-blue-900 rounded-2xl p-6 text-white flex flex-col gap-4">
            <div>
              <p className="text-blue-300 text-xs font-semibold tracking-widest uppercase mb-3">
                What you get
              </p>
              <h2 className="text-2xl font-bold mb-4 leading-snug">
                Planning outputs<br />
                <span className="text-blue-200">built for operations.</span>
              </h2>
              <ul className="space-y-3">
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

            {/* ── Mini stat grid ── */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[
                { icon: <TrendingUp className="w-4 h-4 text-blue-300" />, label: "Forecast Horizon", value: "6 months" },
                { icon: <Target className="w-4 h-4 text-emerald-300" />, label: "SKU Coverage", value: "98.4%" },
                { icon: <AlertTriangle className="w-4 h-4 text-amber-300" />, label: "Reorder Alerts", value: "Auto" },
                { icon: <Clock className="w-4 h-4 text-violet-300" />, label: "Time to Insight", value: "< 2 min" },
              ].map(({ icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl px-3 py-2"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(255,255,255,0.10)" }}>
                    {icon}
                  </div>
                  <div>
                    <p className="text-[9px] text-blue-300/80 font-medium leading-none mb-0.5">{label}</p>
                    <p className="text-white font-bold text-sm leading-none">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Footer: Dataiku integration ── */}
            <div className="pt-3 border-t border-blue-700/50">
              <p className="text-blue-300/70 text-[11px]">
                Forecast models run natively on{" "}
                <span className="text-white font-semibold">Dataiku DSS</span>
                {" "}— fully integrated for automated retraining, versioning, and one-click deployment.
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
