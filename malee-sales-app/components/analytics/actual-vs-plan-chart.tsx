'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getDeepDiveAnalytics } from "@/lib/api-client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const AVAILABLE_YEARS = [2023, 2024];

interface ActualVsPlanChartProps {
    globalFilters?: any;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const actual = payload.find((p: any) => p.dataKey === 'actual')?.value || 0;
    const planned = payload.find((p: any) => p.dataKey === 'planned')?.value || 0;
    const achievement = planned > 0 ? ((actual / planned) * 100).toFixed(1) : '–';
    const fmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format;
    const isAbove = planned > 0 && actual >= planned;

    return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg min-w-[150px]">
            <p className="text-sm font-semibold text-slate-900 mb-2">{label}</p>
            <div className="space-y-1 text-xs">
                <div className="flex justify-between gap-6">
                    <span className="text-slate-500">Actual</span>
                    <span className="font-medium text-blue-600">{fmt(actual)}</span>
                </div>
                <div className="flex justify-between gap-6">
                    <span className="text-slate-500">Planned</span>
                    <span className="font-medium text-slate-400">{fmt(planned)}</span>
                </div>
                <div className="pt-1 mt-1 border-t border-slate-100 flex justify-between gap-6">
                    <span className="text-slate-500">Achievement</span>
                    <span className={`font-semibold ${isAbove ? 'text-green-600' : 'text-red-500'}`}>
                        {achievement}%
                    </span>
                </div>
            </div>
        </div>
    );
};

export function ActualVsPlanChart({ globalFilters }: ActualVsPlanChartProps) {
    const [loading, setLoading] = useState(false);
    const [salesTrend, setSalesTrend] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState<number>(() => {
        if (globalFilters?.date_range?.start) {
            return parseInt(globalFilters.date_range.start.split('-')[0]);
        }
        return new Date().getFullYear();
    });

    // Update selected year when global filters change
    useEffect(() => {
        if (globalFilters?.date_range?.start) {
            const filterYear = parseInt(globalFilters.date_range.start.split('-')[0]);
            setSelectedYear(filterYear);
        }
    }, [globalFilters?.date_range?.start]);

    useEffect(() => {
        if (!globalFilters) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const params: any = {
                    year_from: selectedYear,
                    month_from: 1,
                    year_to: selectedYear,
                    month_to: 12,
                };

                if (globalFilters.product_group && globalFilters.product_group !== 'all') params.product_group = globalFilters.product_group;
                if (globalFilters.flavor && globalFilters.flavor !== 'all') params.flavor = globalFilters.flavor;
                if (globalFilters.size && globalFilters.size !== 'all') params.size = globalFilters.size;
                if (globalFilters.customer && globalFilters.customer !== 'all') params.customer = globalFilters.customer;

                const data: any = await getDeepDiveAnalytics(params);
                setSalesTrend(data.sales_trend || []);
            } catch (e) {
                console.error('ActualVsPlan fetch error', e);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchData, 300);
        return () => clearTimeout(timer);
    }, [globalFilters, selectedYear]);

    const chartData = useMemo(() => {
        const actualSeries = salesTrend.find((s: any) => s.label === 'Actual Sales');
        const plannedSeries = salesTrend.find((s: any) => s.label === 'Planned Sales');

        if (!actualSeries || !plannedSeries) return [];

        const map = new Map<string, { sortKey: number; month: string; actual: number; planned: number }>();

        plannedSeries.data.forEach((pt: any) => {
            if (pt.year !== selectedYear) return;
            const key = `${pt.year}-${String(pt.month).padStart(2, '0')}`;
            const label = MONTH_NAMES[pt.month - 1];
            map.set(key, { sortKey: pt.month, month: label, actual: 0, planned: pt.qty });
        });

        actualSeries.data.forEach((pt: any) => {
            if (pt.year !== selectedYear) return;
            const key = `${pt.year}-${String(pt.month).padStart(2, '0')}`;
            const label = MONTH_NAMES[pt.month - 1];
            const existing = map.get(key);
            if (existing) {
                existing.actual = pt.qty;
            } else {
                map.set(key, { sortKey: pt.month, month: label, actual: pt.qty, planned: 0 });
            }
        });

        return Array.from(map.values())
            .sort((a, b) => a.sortKey - b.sortKey)
            .map(({ sortKey: _, ...rest }) => rest);
    }, [salesTrend, selectedYear]);

    return (
        <Card className="h-full flex flex-col shadow-sm border-slate-200">
            <CardHeader className="pb-2 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold text-slate-900">Actual vs Plan</CardTitle>
                        <CardDescription className="text-xs text-slate-500">Monthly sales volume vs target</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                        {/* Legend */}
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-blue-500" />
                                <span className="font-medium text-slate-600">Actual</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-slate-300" />
                                <span className="font-medium text-slate-600">Planned</span>
                            </div>
                        </div>
                        {/* Year Selector */}
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                            {AVAILABLE_YEARS.map(year => (
                                <Button
                                    key={year}
                                    variant={selectedYear === year ? "secondary" : "ghost"}
                                    size="sm"
                                    className={`h-6 text-xs px-2 ${selectedYear === year ? 'bg-white shadow-sm' : ''}`}
                                    onClick={() => setSelectedYear(year)}
                                >
                                    {year}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 pt-0">
                {chartData.length === 0 && !loading ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                        No data available
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barCategoryGap="30%">
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                axisLine={{ stroke: '#e2e8f0' }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(v)}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="actual" name="Actual" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={22} />
                            <Bar dataKey="planned" name="Planned" fill="#cbd5e1" radius={[3, 3, 0, 0]} maxBarSize={22} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
