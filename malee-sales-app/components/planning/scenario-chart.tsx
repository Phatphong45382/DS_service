'use client';

import { usePlanning } from '@/lib/planning-context';
import {
    Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart
} from 'recharts';
import { forecastBaseline, generateYearMonth, formatMonth } from '@/lib/planning-data';
import * as React from 'react';
import { useMemo } from 'react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';

export default function ScenarioChart() {
    const { scenarioParams } = usePlanning();
    // Calculate scenario data based on params
    const chartData = useMemo(() => {
        // Generate data for horizon
        const data = [];

        // Promo uplift factor
        const promoUplift = scenarioParams.promo_enabled
            ? 1 + ((scenarioParams.discount_pct || 0) * 1.5) / 100
            : 1;

        for (let i = 1; i <= scenarioParams.horizon; i++) {
            const month = generateYearMonth(i);
            const baselineTotal = forecastBaseline
                .filter(f => f.year_month === month)
                .reduce((sum, f) => sum + f.forecast_qty, 0);

            // Apply uplift only if promo enabled (simplified logic: applies to all months for demo)
            const scenarioTotal = Math.round(baselineTotal * promoUplift);

            // Recommended production (scenario + safety stock)
            const productionTotal = Math.round(scenarioTotal * (1 + (scenarioParams.safety_stock_pct || 0) / 100));

            data.push({
                month: formatMonth(month),
                baseline: baselineTotal,
                scenario: scenarioTotal,
                production: productionTotal,
                uplift: scenarioTotal - baselineTotal
            });
        }

        return data;
    }, [scenarioParams]);

    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;



    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-enterprise p-4 rounded-xl shadow-enterprise-lg border border-slate-200">
                    <p className="font-bold text-slate-900 mb-2 text-sm">{label}</p>
                    <div className="space-y-2">
                        {payload.map((entry: any, index: number) => {
                            if (entry.dataKey === 'uplift' && entry.value === 0) return null;
                            return (
                                <div key={index} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                                    <span className="text-sm text-slate-600 font-medium">
                                        {entry.name}: <span className="font-bold text-slate-900">{entry.value.toLocaleString()}</span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden h-full flex flex-col">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">Scenario Forecast & Production</h2>
                    <p className="text-sm text-slate-400 font-medium mt-1">
                        Comparing Baseline vs. {scenarioParams.promo_enabled ? 'Promo Scenario' : 'Standard Forecast'}
                    </p>
                </div>

                {scenarioParams.promo_enabled && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg">
                        <ArrowUpRight className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-bold text-amber-700">
                            Uplift: +{((scenarioParams.discount_pct || 0) * 1.5).toFixed(0)}%
                        </span>
                    </div>
                )}
            </div>

            <div className="flex-1 p-8 min-h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                        <XAxis
                            dataKey="month"
                            tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis
                            tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            axisLine={false}
                            tickLine={false}
                            dx={-10}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                        />

                        {/* Baseline */}
                        <Bar
                            dataKey="baseline"
                            name="Baseline Forecast"
                            fill="#cbd5e1"
                            radius={[4, 4, 0, 0]}
                            barSize={32}
                            stackId="a"
                        />

                        {/* Uplift (stacked on baseline) */}
                        {scenarioParams.promo_enabled && (
                            <Bar
                                dataKey="uplift"
                                name="Promo Uplift"
                                fill="#fbbf24"
                                radius={[4, 4, 0, 0]}
                                barSize={32}
                                stackId="a"
                            />
                        )}

                        {/* Production Plan Line */}
                        <Line
                            type="monotone"
                            dataKey="production"
                            name="Recommended Production"
                            stroke="#10b981" /* Vibrant Emerald 500 */
                            strokeWidth={3}
                            dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <div className="px-8 py-4 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Production Plan includes <strong>{scenarioParams.safety_stock_pct}% safety stock</strong> buffer</span>
                </div>
            </div>
        </div>
    );
}
