'use client';

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Brush, Line } from 'recharts';
import * as React from 'react';
import { formatMonth } from '@/lib/planning-data';
import { TrendingUp } from 'lucide-react';

interface PredictionChartProps {
    data?: any[];
    filename?: string;
}

export default function PredictionChart({ data, filename }: PredictionChartProps) {
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    // 1. Prepare Chart Data from CSV Rows
    let chartData: any[] = [];

    if (data && data.length > 0) {
        const monthlyData = new Map();

        data.forEach(row => {
            // Find date column (could be 'date', 'Date', 'year_month', etc.)
            const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('month'));

            // Find Actuals column
            const actualKey = Object.keys(row).find(k =>
                k === 'Quantity_sum' || // Specific to this dataset
                k.toLowerCase() === 'sales'
            );

            // Find Forecast column
            const forecastKey = Object.keys(row).find(k =>
                k.toLowerCase() === 'forecast' ||
                k.toLowerCase().includes('predict')
            );

            if (dateKey) {
                const dateStr = row[dateKey];
                if (!dateStr) return;

                // Simple parsing, assuming YYYY-MM
                const month = dateStr.substring(0, 7);

                if (!monthlyData.has(month)) {
                    monthlyData.set(month, {
                        month,
                        displayMonth: formatMonth(month),
                        actual: null,
                        forecast: null
                    });
                }

                const current = monthlyData.get(month);

                // Parse Actuals
                if (actualKey && row[actualKey]) {
                    const val = parseFloat(row[actualKey]);
                    if (!isNaN(val)) current.actual = (current.actual || 0) + val;
                }

                // Parse Forecast
                if (forecastKey && row[forecastKey]) {
                    const val = parseFloat(row[forecastKey]);
                    if (!isNaN(val)) current.forecast = (current.forecast || 0) + val;
                }
            }
        });

        chartData = Array.from(monthlyData.values())
            .sort((a: any, b: any) => a.month.localeCompare(b.month));
    }

    // 2. Calculate domains for Y-Axis
    const allValues = chartData.flatMap(d => [d.actual, d.forecast]).filter(v => v != null && typeof v === 'number');
    let yAxisDomain: [number, number] | undefined = undefined;

    if (allValues.length > 0) {
        const minValue = Math.min(...allValues);
        const maxValue = Math.max(...allValues);
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
                            <div
                                className="w-3 h-1 rounded-full shadow-sm"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm text-slate-500 font-medium min-w-[100px]">
                                {entry.name}
                            </span>
                            <span className="text-sm font-bold" style={{ color: entry.color }}>
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
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">Prediction Result</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            Actuals vs Forecast based on {filename || 'uploaded data'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="h-[450px] w-full select-none">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 50 }}>
                        <defs>
                            {/* Gradient for Actuals */}
                            <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                            </linearGradient>

                            {/* Gradient for Forecast */}
                            <linearGradient id="fillForecast" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                            dataKey="displayMonth"
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

                        {/* Actual Sales Line (Grey/Neutral) */}
                        <Area
                            type="monotone"
                            dataKey="actual"
                            name="Actual Sales"
                            stroke="#64748b"
                            strokeWidth={2}
                            fill="url(#fillActual)"
                            dot={{ r: 4, strokeWidth: 2, fill: '#64748b', stroke: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 2, fill: '#64748b', stroke: '#fff' }}
                            connectNulls
                        />

                        {/* Forecast Line (Primary Color) */}
                        <Area
                            type="monotone"
                            dataKey="forecast"
                            name="Forecast"
                            stroke="#4f46e5"
                            strokeWidth={3}
                            fill="url(#fillForecast)"
                            dot={{ r: 4, strokeWidth: 2, fill: '#4f46e5', stroke: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 2, fill: '#4f46e5', stroke: '#fff' }}
                            strokeDasharray="5 5"
                        />

                        <Brush
                            dataKey="displayMonth"
                            height={30}
                            stroke="#e2e8f0"
                            fill="#f8fafc"
                            tickFormatter={() => ''}
                            y={410}
                            travellerWidth={10}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
