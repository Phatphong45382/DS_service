'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button";
import { InterpretPanel } from './interpret-panel';

const AVAILABLE_YEARS = [2023, 2024];

interface TrendDecompositionChartProps {
    globalFilters?: any;
    showInterpret?: boolean;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const fmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format;

    return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg min-w-[180px]">
            <p className="text-sm font-semibold text-slate-900 mb-2">{label}</p>
            <div className="space-y-1.5 text-xs">
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-slate-500">{entry.name}</span>
                        </div>
                        <span className="font-medium text-slate-900">{fmt(entry.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Generate mock decomposition data
function generateMockDecomposition(year: number) {
    const data = [];
    const baseTrend = 50000;

    for (let month = 1; month <= 12; month++) {
        // Trend: gradually increasing
        const trend = baseTrend + (month * 2000) + (year === 2024 ? 15000 : 0);

        // Seasonality: sine wave pattern (peak in Dec, low in Jun)
        const seasonality = Math.sin((month - 1) * Math.PI / 6) * 8000;

        // Residual: fixed pseudo-random noise (deterministic for same year)
        const residual = Math.sin(month * 2.5) * 3000 + Math.cos(month * 1.3) * 2000;

        data.push({
            month: MONTH_NAMES[month - 1],
            monthIndex: month,
            trend: Math.round(trend),
            seasonality: Math.round(seasonality),
            residual: Math.round(residual),
            actual: Math.round(trend + seasonality + residual)
        });
    }
    return data;
}

export function TrendDecompositionChart({ globalFilters, showInterpret }: TrendDecompositionChartProps) {
    const [selectedYear, setSelectedYear] = useState<number>(() => {
        if (globalFilters?.date_range?.start) {
            return parseInt(globalFilters.date_range.start.split('-')[0]);
        }
        return 2024;
    });

    // Generate mock data based on selected year
    const chartData = useMemo(() => {
        return generateMockDecomposition(selectedYear);
    }, [selectedYear]);

    return (
        <Card className="flex flex-col shadow-sm border-slate-200">
            <CardHeader className="pb-2 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold text-slate-900">Trend Decomposition</CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            Breakdown of sales into Trend, Seasonality, and Residual components
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Legend */}
                        <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-1 rounded bg-blue-500" />
                                <span className="font-medium text-slate-600">Trend</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-1 rounded bg-amber-500" />
                                <span className="font-medium text-slate-600">Seasonality</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-1 rounded bg-rose-500" />
                                <span className="font-medium text-slate-600">Residual</span>
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
            <CardContent className="pt-0 pb-0">
                <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
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
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="trend" name="Trend" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey="seasonality" name="Seasonality" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey="residual" name="Residual" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: '#f43f5e' }} activeDot={{ r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                {showInterpret && (
                    <InterpretPanel insights={[
                        { emoji: '📈', text: 'Sales trend is steadily increasing — 2024 shows a +15K base lift vs 2023.' },
                        { emoji: '🌊', text: 'Seasonality peaks in Dec, dips in Jun — align inventory and campaigns around this cycle.' },
                        { emoji: '🔀', text: 'Residual noise is small (±5K) relative to trend, suggesting the model captures most variance.' },
                        { emoji: '✅', text: 'Low residual component means forecast reliability should be high for planning.' },
                    ]} />
                )}
            </CardContent>
        </Card>
    );
}
