'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getDeepDiveAnalytics } from "@/lib/api-client";
import { Loader2, BarChart3 } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, ReferenceLine
} from 'recharts';

interface ErrorDistributionChartProps {
    globalFilters?: any;
}

interface ErrorBin {
    bin: string;
    count: number;
}

const BIN_COLORS: Record<string, string> = {
    '< -30%': '#dc2626',
    '-30% to -20%': '#ef4444',
    '-20% to -10%': '#f87171',
    '-10% to 0%': '#fca5a5',
    '0% to 10%': '#86efac',
    '10% to 20%': '#4ade80',
    '20% to 30%': '#22c55e',
    '> 30%': '#16a34a',
};

const MOCK_DATA: ErrorBin[] = [
    { bin: '< -30%', count: 12 },
    { bin: '-30% to -20%', count: 25 },
    { bin: '-20% to -10%', count: 48 },
    { bin: '-10% to 0%', count: 85 },
    { bin: '0% to 10%', count: 92 },
    { bin: '10% to 20%', count: 55 },
    { bin: '20% to 30%', count: 30 },
    { bin: '> 30%', count: 18 },
];

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-white rounded-lg shadow-lg border border-slate-100 p-3 text-xs">
            <p className="font-semibold text-slate-900 mb-1">{d.bin}</p>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: BIN_COLORS[d.bin] || '#94a3b8' }} />
                <span className="text-slate-500">Count:</span>
                <span className="font-medium text-slate-900 ml-auto">{d.count.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-500">Share:</span>
                <span className="font-medium text-slate-900 ml-auto">{d.percentage}%</span>
            </div>
        </div>
    );
};

export function ErrorDistributionChart({ globalFilters }: ErrorDistributionChartProps) {
    const [loading, setLoading] = useState(false);
    const [rawData, setRawData] = useState<ErrorBin[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!globalFilters) return;
            setLoading(true);
            try {
                const params: any = {
                    year_from: parseInt(globalFilters.date_range.start.split('-')[0]),
                    month_from: parseInt(globalFilters.date_range.start.split('-')[1]),
                    year_to: parseInt(globalFilters.date_range.end.split('-')[0]),
                    month_to: parseInt(globalFilters.date_range.end.split('-')[1]),
                };
                if (globalFilters.product_group && globalFilters.product_group !== 'all') params.product_group = globalFilters.product_group;
                if (globalFilters.flavor && globalFilters.flavor !== 'all') params.flavor = globalFilters.flavor;
                if (globalFilters.size && globalFilters.size !== 'all') params.size = globalFilters.size;
                if (globalFilters.customer && globalFilters.customer !== 'all') params.customer = globalFilters.customer;

                const result: any = await getDeepDiveAnalytics(params);
                if (result?.error_dist?.length) {
                    setRawData(result.error_dist);
                }
            } catch (error) {
                console.error("Failed to fetch error distribution", error);
            } finally {
                setLoading(false);
            }
        };
        const timer = setTimeout(fetchData, 300);
        return () => clearTimeout(timer);
    }, [globalFilters]);

    const data = useMemo(() => {
        const source = rawData.length > 0 ? rawData : MOCK_DATA;
        const total = source.reduce((s, d) => s + d.count, 0);
        return source.map(d => ({
            ...d,
            percentage: total > 0 ? ((d.count / total) * 100).toFixed(1) : '0',
        }));
    }, [rawData]);

    return (
        <Card className="shadow-sm border-slate-200 h-full flex flex-col">
            <CardHeader className="pb-2 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-indigo-600" />
                            Forecast Error Distribution
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            Distribution of forecast errors across all SKUs — shows over/under-prediction patterns
                        </CardDescription>
                    </div>
                    {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 pt-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                            dataKey="bin"
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            tickLine={false}
                            axisLine={{ stroke: '#e2e8f0' }}
                            interval={0}
                            angle={-20}
                            textAnchor="end"
                            height={50}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine x="-10% to 0%" stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "Zero", position: "top", fontSize: 10, fill: "#94a3b8" }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50}>
                            {data.map((entry, index) => (
                                <Cell key={index} fill={BIN_COLORS[entry.bin] || '#94a3b8'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
