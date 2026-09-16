'use client';

import { useEffect } from 'react';
import { usePlanning } from '@/lib/planning-context';
import {
    salesMonthly,
    forecastBaseline,
    productionPlan,
    calculateGlobalSummary,
    formatQuantity
} from '@/lib/planning-data';

export function GlobalSummaryCards() {
    const { globalSummary, setGlobalSummary, filters } = usePlanning();

    // Calculate summary when filters change
    useEffect(() => {
        const summary = calculateGlobalSummary(salesMonthly, forecastBaseline, productionPlan);
        setGlobalSummary(summary);
    }, [filters, setGlobalSummary]);

    if (!globalSummary) return null;

    const getRiskBadgeColor = (risk: string) => {
        switch (risk) {
            case 'Low': return 'bg-green-100 text-green-800 border-green-200';
            case 'Med': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'High': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Last Month Actual */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Latest month sales</span>
                    <span className="text-2xl">📊</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                    {formatQuantity(globalSummary.last_month_actual)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Units</div>
            </div>

            {/* Next Month Forecast */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Next month forecast</span>
                    <span className="text-2xl">🔮</span>
                </div>
                <div className="text-2xl font-bold text-[#FF8A5B]">
                    {formatQuantity(globalSummary.next_month_forecast)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Units (Baseline)</div>
            </div>

            {/* Recommended Production */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Recommended production</span>
                    <span className="text-2xl">🏭</span>
                </div>
                <div className="text-2xl font-bold text-[#81C784]">
                    {formatQuantity(globalSummary.recommended_production)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Units (incl. safety stock)</div>
            </div>

            {/* Risk Badge */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Risk level</span>
                    <span className="text-2xl">⚠️</span>
                </div>
                <div className="mt-2">
                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border ${getRiskBadgeColor(globalSummary.risk_badge)}`}>
                        {globalSummary.risk_badge === 'Low' && 'Low'}
                        {globalSummary.risk_badge === 'Med' && 'Medium'}
                        {globalSummary.risk_badge === 'High' && 'High'}
                    </span>
                </div>
                <div className="text-xs text-gray-500 mt-2">From volatility analysis</div>
            </div>
        </div>
    );
}
