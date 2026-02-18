"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface AccuracyTrendChartProps {
    data?: any[];
    loading?: boolean;
}

export function AccuracyTrendChart({ data, loading }: AccuracyTrendChartProps) {
    // Transform Data
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const map = new Map<string, any>();

        data.forEach(series => {
            const isActual = series.label.includes('Actual');
            series.data.forEach((pt: any) => {
                const key = `${pt.year}-${pt.month}`;
                if (!map.has(key)) {
                    map.set(key, {
                        name: new Date(pt.year, pt.month - 1).toLocaleString('default', { month: 'short', year: '2-digit' }),
                        fullName: new Date(pt.year, pt.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' }),
                        sortKey: pt.year * 100 + pt.month,
                        actual: 0,
                        planned: 0
                    });
                }
                const entry = map.get(key);
                if (isActual) entry.actual = pt.qty;
                else entry.planned = pt.qty;
            });
        });

        return Array.from(map.values())
            .sort((a, b) => a.sortKey - b.sortKey)
            .map(item => {
                const diff = item.actual - item.planned;
                const variancePct = item.planned > 0 ? (diff / item.planned) * 100 : 0;
                return {
                    ...item,
                    diff,
                    variancePct,
                    isPositive: diff >= 0
                };
            });
    }, [data]);

    if (loading) {
        return (
            <Card className="shadow-sm border-slate-200">
                <CardHeader>
                    <div className="h-6 w-48 bg-slate-100 rounded mb-2 animate-pulse"></div>
                    <div className="h-4 w-64 bg-slate-100 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                    <div className="h-[350px] w-full bg-slate-50 flex items-center justify-center rounded-lg animate-pulse">
                        <span className="text-slate-400">Loading chart data...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const actual = payload.find((p: any) => p.dataKey === 'actual');
            const planned = payload.find((p: any) => p.dataKey === 'planned');
            const data = actual?.payload || {};

            return (
                <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100 text-sm min-w-[200px]">
                    <p className="font-bold text-slate-800 mb-2">{data.fullName}</p>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-slate-900" />
                                <span className="text-slate-500">Actual:</span>
                            </div>
                            <span className="font-semibold text-slate-900">
                                {new Intl.NumberFormat('en-US').format(data.actual)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-slate-400" />
                                <span className="text-slate-500">Planned:</span>
                            </div>
                            <span className="font-semibold text-slate-500">
                                {new Intl.NumberFormat('en-US').format(data.planned)}
                            </span>
                        </div>

                        <div className="h-px bg-slate-100 my-2" />

                        <div className="flex justify-between items-center gap-4">
                            <span className="text-slate-500">Variance:</span>
                            <div className="flex items-center gap-2">
                                <span className={`font-bold ${data.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {data.diff > 0 ? '+' : ''}{new Intl.NumberFormat('en-US').format(data.diff)}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${data.isPositive
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-rose-100 text-rose-700'
                                    }`}>
                                    {data.diff > 0 ? '+' : ''}{data.variancePct.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    const CustomizedDot = (props: any) => {
        const { cx, cy, payload } = props;
        const isPositive = payload.isPositive;

        return (
            <circle
                cx={cx}
                cy={cy}
                r={4}
                stroke="white"
                strokeWidth={2}
                fill={isPositive ? "#10B981" : "#EF4444"}
            />
        );
    };

    return (
        <Card className="shadow-sm border-slate-200 h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-slate-800">Sales Trend: Actual vs Planned</CardTitle>
                <CardDescription>Comparison of actual sales performance against the plan over time.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12 }}
                                tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(value)}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Line
                                type="monotone"
                                dataKey="planned"
                                name="Planned Sales"
                                stroke="#94A3B8"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                dot={false}
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#94A3B8' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="actual"
                                name="Actual Sales"
                                stroke="#2563eb"
                                strokeWidth={3}
                                dot={<CustomizedDot />}
                                activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
