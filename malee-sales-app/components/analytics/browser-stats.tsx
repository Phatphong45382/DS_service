'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useMemo } from 'react';

const COLORS = [
    '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#14b8a6'
];

interface SalesDistributionChartProps {
    data: any[]; // TimeSeriesPoint[] or similar structure
    level: number;
    onDrillDown?: (key: string) => void;
    isLoading?: boolean;
}

const CustomLegend = ({ payload, onDrillDown, level }: any) => {
    return (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 max-h-[100px] overflow-y-auto">
            {payload.map((entry: any, index: number) => (
                <div
                    key={`legend-${index}`}
                    className={`flex items-center gap-2 ${level < 3 ? 'cursor-pointer hover:opacity-80' : ''}`}
                    onClick={() => level < 3 && onDrillDown && onDrillDown(entry.payload.name)}
                >
                    <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs text-slate-600 hover:text-blue-600 hover:underline">
                        {entry.payload.name}: <span className="font-semibold text-slate-900">{entry.payload.percent}%</span>
                    </span>
                </div>
            ))}
        </div>
    );
};

export function BrowserStats({ data, level, onDrillDown, isLoading }: SalesDistributionChartProps) {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const total = data.reduce((sum, item) => {
            const itemTotal = item.data.reduce((s: number, p: any) => s + p.qty, 0);
            return sum + itemTotal;
        }, 0);

        return data.map((item, index) => {
            const value = item.data.reduce((s: number, p: any) => s + p.qty, 0);
            return {
                name: item.label,
                value: value,
                percent: total > 0 ? ((value / total) * 100).toFixed(1) : '0.0',
                color: COLORS[index % COLORS.length]
            };
        }).sort((a, b) => b.value - a.value);
    }, [data]);

    const totalValue = useMemo(() => {
        return chartData.reduce((sum, item) => sum + item.value, 0);
    }, [chartData]);

    const title = level === 0 ? "Sales by Product Group" :
        level === 1 ? "Sales by Flavor" :
            level === 2 ? "Sales by Size" : "Sales Distribution";

    return (
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100 h-full flex flex-col relative">
            {isLoading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                </div>
                {/* Optional: Add a subtle indicator of drill level */}
                <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                    {level === 0 ? "Group" : level === 1 ? "Flavor" : "Size"}
                </span>
            </div>

            <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
                <div className="w-full max-w-[300px]">
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={85}
                                fill="#8884d8"
                                dataKey="value"
                                paddingAngle={2}
                                stroke="white"
                                strokeWidth={3}
                                onClick={(data) => {
                                    if (level < 3 && onDrillDown && data) {
                                        onDrillDown(data.name);
                                    }
                                }}
                                style={{ cursor: level < 3 ? 'pointer' : 'default' }}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color || COLORS[index % COLORS.length]}
                                        style={{ cursor: level < 3 ? 'pointer' : 'default' }}
                                    />
                                ))}
                            </Pie>
                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                                <tspan x="50%" dy="-5" className="fill-slate-500" style={{ fontSize: '11px' }}>Total Sales</tspan>
                                <tspan x="50%" dy="20" className="fill-slate-900 font-bold" style={{ fontSize: '18px' }}>
                                    {new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(totalValue)}
                                </tspan>
                            </text>
                            <Tooltip
                                formatter={(value: number | undefined) => new Intl.NumberFormat('en-US').format(value || 0)}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2">
                        <CustomLegend
                            payload={chartData.map(item => ({
                                value: item.name,
                                color: item.color,
                                payload: item
                            }))}
                            onDrillDown={onDrillDown}
                            level={level}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
