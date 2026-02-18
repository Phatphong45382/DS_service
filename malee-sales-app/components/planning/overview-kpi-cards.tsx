'use client';

import { usePlanning } from '@/lib/planning-context';
import { TrendingUp, TrendingDown, DollarSign, Package, Activity, BarChart3 } from 'lucide-react';



export function OverviewKPICards() {
    const { fullSummary, isLoading } = usePlanning();
    const kpi = fullSummary?.kpi;

    // Helper to calculate previous month volume for context
    const calculatePreviousVolume = () => {
        if (!kpi?.total_qty || kpi?.mom_growth === undefined) return null;
        if (kpi.mom_growth === -100) return 0;
        const prev = kpi.total_qty / (1 + (kpi.mom_growth / 100));
        return prev;
    };

    if (isLoading && !kpi) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-44 rounded-2xl loading-shimmer border border-slate-100 shadow-sm"></div>
                ))}
            </div>
        );
    }

    const previousVolume = calculatePreviousVolume();
    const prevVolumeStr = previousVolume
        ? previousVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })
        : '-';

    const cards = [
        {
            label: 'Total Sales',
            value: (kpi?.total_qty || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }),
            unit: 'Units',
            insight: kpi?.mom_growth !== undefined ? `${kpi.mom_growth >= 0 ? '+' : ''}${kpi.mom_growth.toFixed(1)}%` : '-',
            insightType: (kpi?.mom_growth || 0) >= 0 ? 'success' : 'danger',
            context: 'vs previous period',
            icon: DollarSign,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            valueColor: 'text-slate-900',
        },
        {
            label: 'MoM Growth',
            value: kpi?.mom_growth !== undefined ? `${kpi.mom_growth >= 0 ? '+' : ''}${kpi.mom_growth.toFixed(1)}%` : '0%',
            unit: 'MoM',
            insight: `Prev: ${prevVolumeStr}`,
            insightType: 'neutral',
            context: 'Units',
            icon: Activity,
            color: (kpi?.mom_growth || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600',
            bg: (kpi?.mom_growth || 0) >= 0 ? 'bg-emerald-50' : 'bg-rose-50',
            valueColor: (kpi?.mom_growth || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600',
            trendUp: (kpi?.mom_growth || 0) >= 0,
        },
        {
            label: 'Promo Share',
            value: (kpi?.promo_coverage || 0).toFixed(1) + '%',
            unit: 'Share',
            insight: 'Transactions',
            insightType: 'neutral',
            context: 'with promo',
            icon: Package,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
            valueColor: 'text-slate-900',
        },
        {
            label: 'Avg. Discount',
            value: (kpi?.avg_discount_pct || 0).toFixed(1) + '%',
            unit: 'Discount',
            insight: 'On Promo Only',
            insightType: 'neutral',
            context: 'items density',
            icon: BarChart3,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            valueColor: 'text-slate-900',
        },
    ];

    const noData = !isLoading && (!fullSummary || fullSummary.meta.record_count === 0);

    return (
        <div className="relative">
            {noData && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-2xl border border-slate-100 shadow-xl animate-in fade-in duration-500">
                    <div className="text-center p-8 bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm">
                        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
                            <Activity className="w-7 h-7 text-slate-400" />
                        </div>
                        <h4 className="text-base font-bold text-slate-900 mb-2">No data found</h4>
                        <p className="text-sm text-slate-500 mb-6">Try adjusting your filters or selecting a different date range.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            )}

            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 transition-opacity duration-300 ${noData ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                {cards.map((card, idx) => {
                    return (
                        <div
                            key={idx}
                            className="
                                group relative flex flex-col justify-between
                                bg-white
                                rounded-2xl p-6
                                transition-all duration-300
                                hover:-translate-y-1 hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]
                                shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]
                                min-h-[180px]
                            "
                        >
                            {/* Top row: Label & Icon */}
                            <div className="flex items-start justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-700 mt-1">
                                    {card.label}
                                </h3>
                                <div className={`p-2.5 rounded-xl ${card.bg} ${card.color} bg-opacity-60`}>
                                    <card.icon className="w-5 h-5" strokeWidth={1.5} />
                                </div>
                            </div>

                            {/* Middle section: Big Value & Unit Inline */}
                            <div className="flex items-baseline mb-6">
                                <span className={`text-4xl font-bold tracking-tight ${card.valueColor}`}>
                                    {card.value}
                                </span>
                                {card.unit && (
                                    <span className="ml-2 text-sm font-medium text-slate-400">
                                        {card.unit}
                                    </span>
                                )}
                            </div>

                            {/* Divider - pushed to bottom with margin-top auto to ensure alignment if heights differ slightly */}
                            <div className="mt-auto">
                                <div className="h-px bg-slate-100 w-full mb-3" />

                                {/* Footer: Left Aligned Badge + Context */}
                                <div className="flex items-center justify-start gap-3">
                                    <div className={`
                                        flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap bg-opacity-30
                                        ${card.insightType === 'success' ? 'bg-emerald-100/50 text-emerald-700' :
                                            card.insightType === 'danger' ? 'bg-rose-100/50 text-rose-700' :
                                                'bg-slate-100/80 text-slate-600'}
                                    `}>
                                        {card.insightType === 'success' && <TrendingUp className="w-3.5 h-3.5" strokeWidth={2} />}
                                        {card.insightType === 'danger' && <TrendingDown className="w-3.5 h-3.5" strokeWidth={2} />}
                                        {card.insight}
                                    </div>
                                    <span className="text-[12px] text-slate-500 font-medium truncate">
                                        {card.context}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
