'use client';

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { salesMonthly, generateYearMonth, formatMonth } from '@/lib/planning-data';
import { useMemo, useState, useEffect } from 'react';
import { Filter } from 'lucide-react';

export function ActualVsForecastChart() {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    // Generate comparison data (last 6 months)
    const data = useMemo(() => {
        if (!isMounted) return [];
        const result = [];
        for (let offset = -6; offset < 0; offset++) {
            const month = generateYearMonth(offset);
            const actual = salesMonthly
                .filter(s => s.year_month === month)
                .reduce((sum, s) => sum + s.sales_qty, 0);

            // Simulate forecast snapshot with some noise
            const forecast = Math.round(actual * (1 + (Math.random() * 0.2 - 0.1)));

            result.push({
                month: formatMonth(month),
                actual,
                forecast,
                diff: ((actual - forecast) / forecast) * 100,
                diffVal: actual - forecast
            });
        }
        return result;
    }, []);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const actual = payload[0].value;
            const forecast = payload[1].value;
            const diff = actual - forecast;
            const diffPct = (diff / forecast) * 100;
            const isPositive = diff > 0;

            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
                    <p className="font-semibold text-slate-900 mb-2">{label}</p>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-sm text-slate-600">
                                Actual: <span className="font-medium text-slate-900">{actual.toLocaleString()}</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-slate-400" />
                            <span className="text-sm text-slate-600">
                                Forecast: <span className="font-medium text-slate-900">{forecast.toLocaleString()}</span>
                            </span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                            <span className="text-xs text-slate-500">Variance</span>
                            <span className={`text-sm font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isPositive ? '+' : ''}{diffPct.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (!isMounted) return null;

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight font-display">Actual vs. Forecast Analysis</h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">Accuracy tracking over last 6 months</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
                        <Filter className="w-3.5 h-3.5" />
                        Last 6 Months
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorAct" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis
                            dataKey="month"
                            tick={{ fontSize: 12, fill: '#64748B' }}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis
                            tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                            tick={{ fontSize: 12, fill: '#64748B' }}
                            axisLine={false}
                            tickLine={false}
                            dx={-10}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#CBD5E1', strokeDasharray: '4 4' }} />
                        <Legend
                            verticalAlign="top"
                            align="right"
                            height={36}
                            iconType="circle"
                            wrapperStyle={{ paddingBottom: '20px' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="actual"
                            name="Actual Sales"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorAct)"
                            activeDot={false}
                        />
                        <Area
                            type="monotone"
                            dataKey="forecast"
                            name="Forecast Snapshot"
                            stroke="#94A3B8"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            fill="transparent"
                            dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                            activeDot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
