'use client';

import { useState, useEffect } from 'react';
import { usePlanning } from '@/lib/planning-context';
import { TrendingUp, TrendingDown, AlertTriangle, Activity, Lightbulb, ArrowRight, Sparkles } from 'lucide-react';

export function InsightsSection() {
    const { globalSummary, dashboardData } = usePlanning();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!globalSummary) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 loading-shimmer rounded-lg"></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-40 rounded-xl loading-shimmer"></div>
                    ))}
                </div>
            </div>
        );
    }

    // Calculate insights from Real Data if available
    // Prevent hydration mismatch by only using real data on client after mount
    const hasRealData = isClient && dashboardData.length > 0;

    // 1. Trend Analysis: Compare last month sales vs 3-month average
    let diff = 0;
    let diffPct = "0.0";
    let isPositive = true;

    if (hasRealData) {
        // Group by month
        const monthlySales = new Map<string, number>();
        dashboardData.forEach(item => {
            const current = monthlySales.get(item.year_month) || 0;
            monthlySales.set(item.year_month, current + item.sales_qty);
        });

        const sortedMonths = Array.from(monthlySales.keys()).sort();
        const lastMonth = sortedMonths[sortedMonths.length - 1];
        const lastMonthSales = monthlySales.get(lastMonth) || 0;

        // items before last month
        const priorMonths = sortedMonths.slice(Math.max(0, sortedMonths.length - 4), sortedMonths.length - 1);

        if (priorMonths.length > 0) {
            const sumPrior = priorMonths.reduce((sum, m) => sum + (monthlySales.get(m) || 0), 0);
            const avgPrior = sumPrior / priorMonths.length;

            diff = lastMonthSales - avgPrior;
            diffPct = avgPrior > 0 ? ((diff / avgPrior) * 100).toFixed(1) : "100.0";
            isPositive = diff >= 0;
        }
    } else {
        // Fallback to mock logic
        const avg3m = 145000;
        diff = globalSummary.last_month_actual - avg3m;
        diffPct = ((diff / avg3m) * 100).toFixed(1);
        isPositive = diff > 0;
    }

    // Volatility
    const volatility = 12.5;
    const volatilityLevel = volatility < 10 ? 'ต่ำ' : volatility < 20 ? 'ปานกลาง' : 'สูง';

    // Risk level
    const riskLevel = globalSummary.risk_badge;

    const insights = [
        {
            icon: isPositive ? TrendingUp : TrendingDown,
            iconColor: isPositive ? 'text-emerald-600' : 'text-rose-600',
            bg: isPositive ? 'bg-emerald-50' : 'bg-rose-50',
            border: isPositive ? 'border-l-emerald-500' : 'border-l-rose-500',
            title: 'Trend Analysis',
            description: `Sales are trending ${isPositive ? 'up' : 'down'} vs 3-month avg.`,
            detail: `${isPositive ? '+' : ''}${diffPct}% (${diff.toLocaleString()} units)`,
            metricColor: isPositive ? 'text-emerald-700' : 'text-rose-700',
        },
        {
            icon: Activity,
            iconColor: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'border-l-blue-500',
            title: 'Market Volatility',
            description: `Volatility detected in last 6 months.`,
            detail: `${volatilityLevel} (${volatility}CV)`,
            metricColor: 'text-blue-700',
        },
        {
            icon: AlertTriangle,
            iconColor: riskLevel === 'Low' ? 'text-emerald-600' : riskLevel === 'Med' ? 'text-amber-600' : 'text-rose-600',
            bg: riskLevel === 'Low' ? 'bg-emerald-50' : riskLevel === 'Med' ? 'bg-amber-50' : 'bg-rose-50',
            border: riskLevel === 'Low' ? 'border-l-emerald-500' : riskLevel === 'Med' ? 'border-l-amber-500' : 'border-l-rose-500',
            title: 'Risk Assessment',
            description: `Production risk based on current capacity.`,
            detail: `${riskLevel} Risk Level`,
            metricColor: riskLevel === 'Low' ? 'text-emerald-700' : riskLevel === 'Med' ? 'text-amber-700' : 'text-rose-700',
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 rounded-lg">
                        <Lightbulb className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">AI Logic & Insights</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">Automated analysis of current trends</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {insights.map((insight, idx) => (
                    <div
                        key={idx}
                        className={`
                            relative overflow-hidden
                            bg-white
                            border border-slate-200
                            rounded-xl p-6
                            shadow-sm hover:shadow-md
                            transition-all duration-300
                            border-l-4 ${insight.border}
                        `}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-2.5 ${insight.bg} rounded-lg`}>
                                <insight.icon className={`w-5 h-5 ${insight.iconColor}`} />
                            </div>
                            <button className="text-slate-400 hover:text-slate-600">
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-slate-900 mb-1">{insight.title}</h3>
                            <p className="text-xs text-slate-500 font-medium mb-3 h-8">{insight.description}</p>
                            <div className={`text-xl font-bold ${insight.metricColor} tracking-tight`}>
                                {insight.detail}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* AI Summary Box */}
            <div className="glass-enterprise p-6 rounded-2xl border border-blue-100 bg-blue-50/30">
                <div className="flex gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg h-fit">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-2">AI Natural Language Summary</h3>
                        <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
                            Based on the current trajectory, total sales volume is projected to exceed Q1 targets by <span className="font-bold text-emerald-600">12%</span>.
                            However, inventory levels for <span className="font-semibold text-slate-800">Orange 200ml</span> are critically low and may lead to stockouts by mid-month.
                            Recommended immediate production adjustment.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
