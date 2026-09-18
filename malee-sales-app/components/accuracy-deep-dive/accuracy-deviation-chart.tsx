"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface AccuracyDeviationChartProps {
    /** The deep-dive KPI. Its volumes are summed per row by the backend. */
    kpi?: { under_plan_volume?: number; over_plan_volume?: number } | null;
    loading?: boolean;
}

export function AccuracyDeviationChart({ kpi, loading }: AccuracyDeviationChartProps) {
    const pieData = useMemo(() => {
        // These come straight from the backend, which sums them row by row. Deriving them here
        // from the monthly trend series netted a month's shortfalls against its excesses, so a
        // dataset that outsells its plan every month showed Under Plan 0% (issue #12).
        const underPlan = kpi?.under_plan_volume ?? 0;
        const overPlan = kpi?.over_plan_volume ?? 0;
        const total = underPlan + overPlan;
        if (total <= 0) return [];

        return [
            { name: 'Under Plan', value: underPlan, color: '#3B82F6', percentage: (underPlan / total) * 100 },
            { name: 'Over Plan', value: overPlan, color: '#F97316', percentage: (overPlan / total) * 100 },
        ];
    }, [kpi]);

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
