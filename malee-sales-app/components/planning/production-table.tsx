'use client';

import { usePlanning } from '@/lib/planning-context';
import { forecastBaseline, FLAVORS, SIZES, generateYearMonth, formatMonth } from '@/lib/planning-data';
import { useMemo } from 'react';
import { Download, Table as TableIcon } from 'lucide-react';

export function ProductionTable() {
    const { scenarioParams } = usePlanning();

    interface ProductionRow {
        flavor: string;
        size: string | number;
        baseline: number;
        scenario: number;
        safetyStock: number;
        production: number;
        uplift: number;
    }

    // Generate table data
    const tableData = useMemo(() => {
        const data: ProductionRow[] = [];
        const promoUplift = scenarioParams.promo_enabled
            ? 1 + ((scenarioParams.discount_pct || 0) * 1.5) / 100
            : 1;

        // Look at next month only for detailed table to avoid too many rows
        const targetMonth = generateYearMonth(1);

        // Group by flavor and size
        FLAVORS.forEach(flavor => {
            SIZES.forEach(size => {
                const baseline = forecastBaseline.find(
                    f => f.year_month === targetMonth && f.flavor === flavor && f.size === size
                )?.forecast_qty || 0;

                const scenario = Math.round(baseline * promoUplift);
                const safetyStock = Math.round(scenario * (scenarioParams.safety_stock_pct || 0) / 100);
                const production = scenario + safetyStock;

                data.push({
                    flavor,
                    size,
                    baseline,
                    scenario,
                    safetyStock,
                    production,
                    uplift: scenario - baseline
                });
            });
        });

        // Sort by production volume desc
        return data.sort((a, b) => b.production - a.production);
    }, [scenarioParams]);

    // Calculate totals
    const totals = tableData.reduce((acc, curr) => ({
        baseline: acc.baseline + curr.baseline,
        scenario: acc.scenario + curr.scenario,
        safetyStock: acc.safetyStock + curr.safetyStock,
        production: acc.production + curr.production,
        uplift: acc.uplift + curr.uplift
    }), { baseline: 0, scenario: 0, safetyStock: 0, production: 0, uplift: 0 });

    return (
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                        <TableIcon className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight font-display">Production Plan Details</h2>
                        <p className="text-sm text-slate-400 font-medium">Target for {formatMonth(generateYearMonth(1))}</p>
                    </div>
                </div>

                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
                    <Download className="w-4 h-4" />
                    Export CSV
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider w-16">#</th>
                            <th className="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Product SKU</th>
                            <th className="text-right py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Baseline</th>
                            {scenarioParams.promo_enabled && (
                                <th className="text-right py-4 px-6 text-xs font-bold text-amber-600 uppercase tracking-wider bg-amber-50/50">Uplift</th>
                            )}
                            <th className="text-right py-4 px-6 text-xs font-bold text-slate-900 uppercase tracking-wider">Scenario</th>
                            <th className="text-right py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Safety Stock ({scenarioParams.safety_stock_pct}%)</th>
                            <th className="text-right py-4 px-6 text-xs font-extrabold text-emerald-600 uppercase tracking-wider bg-emerald-50/50">Production</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tableData.map((row, idx) => (
                            <tr key={`${row.flavor}-${row.size}`} className="hover:bg-slate-50 transition-colors group">
                                <td className="py-4 px-6 text-sm text-slate-300 font-medium group-hover:text-slate-500">
                                    {idx + 1}
                                </td>
                                <td className="py-4 px-6">
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">{row.flavor}</p>
                                        <p className="text-xs text-slate-400 font-medium text-nowrap">{row.size} ml</p>
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-right text-sm text-slate-500 font-medium tabular-nums">
                                    {row.baseline.toLocaleString()}
                                </td>
                                {scenarioParams.promo_enabled && (
                                    <td className="py-4 px-6 text-right text-sm text-amber-600 font-bold bg-amber-50/30 tabular-nums">
                                        +{row.uplift.toLocaleString()}
                                    </td>
                                )}
                                <td className="py-4 px-6 text-right text-sm font-bold text-slate-900 tabular-nums">
                                    {row.scenario.toLocaleString()}
                                </td>
                                <td className="py-4 px-6 text-right text-sm text-slate-400 font-medium tabular-nums">
                                    {row.safetyStock.toLocaleString()}
                                </td>
                                <td className="py-4 px-6 text-right text-sm font-bold text-emerald-600 bg-emerald-50/30 tabular-nums">
                                    {row.production.toLocaleString()}
                                </td>
                            </tr>
                        ))}

                        {/* Totals Row */}
                        <tr className="bg-slate-50 border-t border-slate-200 font-bold">
                            <td colSpan={2} className="py-5 px-6 text-slate-900">Total Volume</td>
                            <td className="py-5 px-6 text-right text-slate-900 tabular-nums">{totals.baseline.toLocaleString()}</td>
                            {scenarioParams.promo_enabled && (
                                <td className="py-5 px-6 text-right text-amber-600 bg-amber-50/50 tabular-nums">+{totals.uplift.toLocaleString()}</td>
                            )}
                            <td className="py-5 px-6 text-right text-slate-900 tabular-nums">{totals.scenario.toLocaleString()}</td>
                            <td className="py-5 px-6 text-right text-slate-500 tabular-nums">{totals.safetyStock.toLocaleString()}</td>
                            <td className="py-5 px-6 text-right text-emerald-700 bg-emerald-50/50 text-base tabular-nums">{totals.production.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
