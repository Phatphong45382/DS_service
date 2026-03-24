'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePlanning } from '@/lib/planning-context';
import { getAIInsights } from '@/lib/api-client';
import { TrendingUp, TrendingDown, AlertTriangle, Activity, Lightbulb, ArrowRight, Sparkles, RefreshCw, Loader2 } from 'lucide-react';

export function InsightsSection() {
    const { globalSummary, dashboardData, fullSummary } = usePlanning();
    const [isClient, setIsClient] = useState(false);

    // AI Insight state
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Fetch AI insight when fullSummary changes
    const fetchAIInsight = useCallback(async () => {
        if (!fullSummary?.kpi) return;

        setAiLoading(true);
        setAiError(null);

        try {
            const result = await getAIInsights({
                kpi: fullSummary.kpi,
                top_products: fullSummary.top_products || [],
                by_customer: fullSummary.by_customer || [],
                monthly_ts: fullSummary.monthly_ts || [],
            });
            setAiInsight(result.insight);
        } catch (err: any) {
            console.error('AI Insight error:', err);
            setAiError(err.message || 'ไม่สามารถสร้าง insight ได้');
        } finally {
            setAiLoading(false);
        }
    }, [fullSummary]);

    // Auto-fetch on data load
    useEffect(() => {
        if (fullSummary?.kpi) {
            fetchAIInsight();
        }
    }, [fullSummary?.kpi]);

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
    const hasRealData = isClient && dashboardData.length > 0;

    let diff = 0;
    let diffPct = "0.0";
    let isPositive = true;

    if (hasRealData) {
        const monthlySales = new Map<string, number>();
        dashboardData.forEach(item => {
            const current = monthlySales.get(item.year_month) || 0;
            monthlySales.set(item.year_month, current + item.sales_qty);
        });

        const sortedMonths = Array.from(monthlySales.keys()).sort();
        const lastMonth = sortedMonths[sortedMonths.length - 1];
        const lastMonthSales = monthlySales.get(lastMonth) || 0;

        const priorMonths = sortedMonths.slice(Math.max(0, sortedMonths.length - 4), sortedMonths.length - 1);

        if (priorMonths.length > 0) {
            const sumPrior = priorMonths.reduce((sum, m) => sum + (monthlySales.get(m) || 0), 0);
            const avgPrior = sumPrior / priorMonths.length;

            diff = lastMonthSales - avgPrior;
            diffPct = avgPrior > 0 ? ((diff / avgPrior) * 100).toFixed(1) : "100.0";
            isPositive = diff >= 0;
        }
    } else {
        const avg3m = 145000;
        diff = globalSummary.last_month_actual - avg3m;
        diffPct = ((diff / avg3m) * 100).toFixed(1);
        isPositive = diff > 0;
    }

    const volatility = 12.5;
    const volatilityLevel = volatility < 10 ? 'ต่ำ' : volatility < 20 ? 'ปานกลาง' : 'สูง';
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

    // Format AI insight text with bullet styling
    const renderAIInsight = () => {
        if (aiLoading) {
            return (
                <div className="flex items-center gap-3 text-sm text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gemini กำลังวิเคราะห์ข้อมูล...</span>
                </div>
            );
        }

        if (aiError) {
            return (
                <p className="text-sm text-rose-600">
                    {aiError}
                </p>
            );
        }

        if (aiInsight) {
            return (
                <div className="text-sm text-slate-600 leading-relaxed max-w-4xl whitespace-pre-line">
                    {aiInsight}
                </div>
            );
        }

        return (
            <p className="text-sm text-slate-400 italic">
                กด Refresh เพื่อให้ AI วิเคราะห์ข้อมูล
            </p>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 rounded-lg">
                        <Lightbulb className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-display">AI Logic & Insights</h2>
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

            {/* AI Summary Box — Powered by Gemini */}
            <div className="glass-enterprise p-6 rounded-2xl border border-blue-100 bg-blue-50/30">
                <div className="flex gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg h-fit">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-900">AI Insight Summary</h3>
                                <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                                    Gemini Flash
                                </span>
                            </div>
                            <button
                                onClick={fetchAIInsight}
                                disabled={aiLoading}
                                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>
                        {renderAIInsight()}
                    </div>
                </div>
            </div>
        </div>
    );
}
