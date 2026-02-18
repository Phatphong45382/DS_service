'use client';

import React from 'react';
import { usePlanning } from '@/lib/planning-context';
import { forecastBaseline, generateYearMonth } from '@/lib/planning-data';
import { Trophy, TrendingUp, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

export function TopItemsTable() {
    const { fullSummary, isLoading } = usePlanning();

    // Use backend data if available, otherwise fallback to mock
    // Note: topItems is the name used in the JSX below
    const topItems = (fullSummary?.top_products && fullSummary.top_products.length > 0) ?
        fullSummary.top_products.slice(0, 5).map(p => ({
            flavor: p.flavor,
            size: p.size,
            forecast: p.qty,
            recommended: Math.round(p.qty * 1.15), // Mock production based on forecast
            risk: p.qty > 50000 ? 'Low' : p.qty > 20000 ? 'Med' : 'High' // Deterministic risk
        })) :
        forecastBaseline
            .filter(f => f.year_month === generateYearMonth(1))
            .slice(0, 5)
            .map(f => ({
                flavor: f.flavor,
                size: f.size,
                forecast: f.forecast_qty,
                recommended: Math.round(f.forecast_qty * 1.15),
                risk: 'Low' as const
            }));

    if (isLoading && !fullSummary) {
        return (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm h-64 flex items-center justify-center">
                <div className="animate-pulse text-slate-400">Loading top items...</div>
            </div>
        );
    }

    const getRiskConfig = (risk: string) => {
        switch (risk) {
            case 'Low':
                return {
                    bg: 'bg-emerald-50',
                    text: 'text-emerald-700',
                    border: 'border-emerald-200',
                    icon: CheckCircle2,
                    label: 'Low Risk'
                };
            case 'Med':
                return {
                    bg: 'bg-amber-50',
                    text: 'text-amber-700',
                    border: 'border-amber-200',
                    icon: AlertCircle,
                    label: 'Medium Risk'
                };
            case 'High':
                return {
                    bg: 'bg-red-50',
                    text: 'text-red-700',
                    border: 'border-red-200',
                    icon: AlertTriangle,
                    label: 'High Risk'
                };
            default:
                return {
                    bg: 'bg-slate-50',
                    text: 'text-slate-700',
                    border: 'border-slate-200',
                    icon: AlertCircle,
                    label: 'Unknown'
                };
        }
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-[#44403C]">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">Top Performing SKUs</h2>
                    </div>
                    <p className="text-sm text-slate-500 font-medium mt-1 ml-7">Ranked by next month's forecast volume</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Rank</th>
                            <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                            <th className="text-right py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Forecast</th>
                            <th className="text-right py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Production</th>
                            <th className="text-center py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk Level</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {topItems.map((item, index) => {
                            const riskConfig = getRiskConfig(item.risk);
                            const RiskIcon = riskConfig.icon;

                            return (
                                <tr key={`${item.flavor}-${item.size}`} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-amber-100 text-amber-700' :
                                            index === 1 ? 'bg-slate-200 text-slate-700' :
                                                index === 2 ? 'bg-orange-100 text-orange-800' :
                                                    'bg-slate-100 text-slate-600'
                                            }`}>
                                            {index + 1}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{item.flavor}</p>
                                            <p className="text-xs text-slate-500">
                                                {typeof item.size === 'number' ? `${item.size} ml` : item.size}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <span className="text-sm font-semibold text-slate-900">{item.forecast.toLocaleString()}</span>
                                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <span className="text-sm text-slate-600">{item.recommended.toLocaleString()}</span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex justify-center">
                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${riskConfig.bg} ${riskConfig.border}`}>
                                                <RiskIcon className={`w-3.5 h-3.5 ${riskConfig.text}`} />
                                                <span className={`text-xs font-medium ${riskConfig.text}`}>
                                                    {riskConfig.label}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
