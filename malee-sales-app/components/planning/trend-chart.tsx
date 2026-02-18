'use client';
// Force rebuild for static import fix

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Brush } from 'recharts';
import * as React from 'react';
import { formatMonth } from '@/lib/planning-data';
import { usePlanning } from '@/lib/planning-context';
import { TrendingUp } from 'lucide-react';

interface TrendChartProps {
    className?: string;
}

export default function TrendChart({ className }: TrendChartProps) {
    const { dashboardData } = usePlanning();
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    // 1. Prepare Chart Data
    let chartData: any[] = [];

    // Use dashboardData if available (Real Data from API)
    if (dashboardData && dashboardData.length > 0) {
        // Group by month
        const monthlySales = new Map<string, number>();
        dashboardData.forEach((item: any) => {
            const current = monthlySales.get(item.year_month) || 0;
            monthlySales.set(item.year_month, current + item.sales_qty);
        });

        const sortedMonths = Array.from(monthlySales.keys()).sort();

        chartData = sortedMonths.map(month => {
            const actual = monthlySales.get(month) || 0;
            return {
                month: formatMonth(month),
                actual,
                originalMonth: month // Keep for sorting/key
            };
        });
    }

    // 2. Calculate domains
    const dataValues = chartData.map(d => d.actual).filter(v => v != null && typeof v === 'number');
    let yAxisDomain: [number, number] | undefined = undefined;

    if (dataValues.length > 0) {
        const minValue = Math.min(...dataValues);
        const maxValue = Math.max(...dataValues);
        const range = maxValue - minValue;
        const padding = range * 0.15;
        const domainMin = Math.max(0, Math.floor((minValue - padding) / 1000) * 1000);
        const domainMax = Math.ceil((maxValue + padding) / 1000) * 1000;
        yAxisDomain = [domainMin, domainMax];
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="backdrop-blur-md bg-white/95 p-4 rounded-xl shadow-xl border border-white/50 ring-1 ring-slate-900/5">
                    <p className="font-bold text-slate-800 mb-3 text-sm">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-3 mb-2 last:mb-0">
                            <div className="w-3 h-1 rounded-full bg-blue-700 shadow-[0_0_8px_rgba(29,78,216,0.6)]" />
                            <span className="text-sm text-slate-500 font-medium min-w-[100px]">
                                {entry.name}
                            </span>
                            <span className="text-sm font-bold text-blue-800">
                                {entry.value?.toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="card-enterprise p-8 bg-white rounded-2xl shadow-sm border border-slate-100/60">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                        <TrendingUp className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">Sales Trend</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            Historical actual sales performance
                        </p>
                    </div>
                </div>
                {/* Removed Focus Mode, AI Confidence, More Menu as requested */}
            </div>

            {/* Chart Area */}
            <div className="h-[450px] w-full select-none">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 50 }}>
                        <defs>
                            {/* Gradient for Fill (Area under the line) */}
                            <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                            </linearGradient>

                            {/* Gradient for Stroke (The line itself) */}
                            <linearGradient id="strokeActual" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#1d4ed8" />
                                <stop offset="100%" stopColor="#0e7490" />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                            dataKey="month"
                            tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                            interval="preserveStartEnd"
                            minTickGap={30}
                        />
                        <YAxis
                            domain={yAxisDomain || [0, 'auto']}
                            tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            axisLine={false}
                            tickLine={false}
                            dx={-10}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        {/* Legend Removed */}

                        <Area
                            type="monotone"
                            dataKey="actual"
                            name="Actual Sales"
                            stroke="url(#strokeActual)"
                            strokeWidth={3}
                            fill="url(#fillActual)"
                            dot={{ r: 5, strokeWidth: 2, fill: '#1d4ed8', stroke: '#fff' }}
                            activeDot={{ r: 5, strokeWidth: 2, fill: '#1d4ed8', stroke: '#fff' }}
                            animationDuration={1000}
                        />

                        <Brush
                            dataKey="month"
                            height={30}
                            stroke="#e2e8f0"
                            fill="#f8fafc"
                            tickFormatter={() => ''}
                            y={410} // Position at bottom
                            travellerWidth={10}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
