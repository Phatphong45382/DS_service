"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface AccuracyDeviationChartProps {
    data?: any[];
    loading?: boolean;
}

export function AccuracyDeviationChart({ data, loading }: AccuracyDeviationChartProps) {
    // Pie Chart Data Calculation
    const pieData = useMemo(() => {
        if (!data || data.length === 0) return [];

        let overPlan = 0;
        let underPlan = 0;

        data.forEach(series => {
            const isActual = series.label.includes('Actual');
            // We need to match actual and planned data points
            // Assuming data structure allows easy matching or we process it like in TrendChart
        });

        // Better approach: Reuse the logic from TrendChart to get clean data points first
        const map = new Map<string, any>();
        data.forEach(series => {
            const isActual = series.label.includes('Actual');
            series.data.forEach((pt: any) => {
                const key = `${pt.year}-${pt.month}`;
                if (!map.has(key)) {
                    map.set(key, { actual: 0, planned: 0 });
                }
                const entry = map.get(key);
                if (isActual) entry.actual = pt.qty;
                else entry.planned = pt.qty;
            });
        });

        const items = Array.from(map.values());
        overPlan = items.reduce((acc, item) => acc + (item.actual > item.planned ? item.actual - item.planned : 0), 0);
        underPlan = items.reduce((acc, item) => acc + (item.planned > item.actual ? item.planned - item.actual : 0), 0);

        const total = overPlan + underPlan;

        return [
            { name: 'Under Plan', value: underPlan, color: '#3B82F6', percentage: total > 0 ? (underPlan / total) * 100 : 0 },
            { name: 'Over Plan', value: overPlan, color: '#F97316', percentage: total > 0 ? (overPlan / total) * 100 : 0 },
        ];
    }, [data]);

    if (loading) {
        return (
            <Card className="shadow-sm border-slate-200 h-full">
                <CardHeader>
                    <div className="h-6 w-32 bg-slate-100 rounded mb-2 animate-pulse"></div>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full bg-slate-50 flex items-center justify-center rounded-lg animate-pulse">
                        <span className="text-slate-400">Loading...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm border-slate-200 h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-slate-800">Deviation Volume</CardTitle>
                <CardDescription>Share of error by type</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center">
                <div className="w-full h-[250px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: any) => new Intl.NumberFormat('en-US').format(Number(value))}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs text-slate-400 font-medium">Total Error</span>
                        <span className="text-lg font-bold text-slate-800">
                            {new Intl.NumberFormat('en-US', { notation: "compact" }).format(pieData.reduce((a, c) => a + c.value, 0))}
                        </span>
                    </div>
                </div>
                {/* Custom Legend */}
                <div className="w-full space-y-3 mt-4">
                    {pieData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-slate-600">{item.name}</span>
                            </div>
                            <div className="font-semibold text-slate-900">{item.percentage.toFixed(1)}%</div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
