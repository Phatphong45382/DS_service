'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { InterpretPanel } from './interpret-panel';
import type { DecompositionPoint } from '@/lib/api-client';

interface TrendDecompositionChartProps {
    data?: DecompositionPoint[] | null;
    historyMonths?: number;
    showInterpret?: boolean;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format;
const label = (p: DecompositionPoint) => `${MONTH_NAMES[p.month - 1]} ${String(p.year).slice(2)}`;

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
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

function insightsFor(points: DecompositionPoint[], historyMonths?: number) {
    const first = points[0], last = points[points.length - 1];
    const drift = first.trend > 0 ? ((last.trend - first.trend) / first.trend) * 100 : 0;
    const peak = points.reduce((a, p) => (p.seasonality > a.seasonality ? p : a), points[0]);
    const dip = points.reduce((a, p) => (p.seasonality < a.seasonality ? p : a), points[0]);
    const meanTrend = points.reduce((s, p) => s + p.trend, 0) / points.length;
    const residualPct = meanTrend > 0 ? (Math.sqrt(points.reduce((s, p) => s + p.residual ** 2, 0) / points.length) / meanTrend) * 100 : 0;
    return [
        { emoji: '📈', text: `Trend ${drift >= 0 ? 'rises' : 'falls'} ${Math.abs(drift).toFixed(1)}% from ${label(first)} to ${label(last)}` },
        { emoji: '🌊', text: `Seasonal peak ${MONTH_NAMES[peak.month - 1]} (${peak.seasonality >= 0 ? '+' : ''}${fmt(peak.seasonality)}), dip ${MONTH_NAMES[dip.month - 1]} (${fmt(dip.seasonality)})` },
        { emoji: '🔀', text: `Residual is ${residualPct.toFixed(1)}% of trend (RMS)${historyMonths ? `, fitted on ${historyMonths} months of history` : ''}` },
        { emoji: residualPct < 10 ? '✅' : '⚠️', text: residualPct < 10 ? 'Trend + seasonality explain most of the movement' : 'A lot of movement sits outside trend + seasonality — check promotions' },
    ];
}

export function TrendDecompositionChart({ data, historyMonths, showInterpret }: TrendDecompositionChartProps) {
    const points = data ?? [];
    const chartData = points.map(p => ({ ...p, label: label(p) }));

    return (
        <Card className="flex flex-col shadow-sm border-slate-200">
            <CardHeader className="pb-2 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold text-slate-900">Trend Decomposition</CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            Monthly Actual = linear Trend + calendar-month Seasonality + Residual, fitted on the full history and shown for the selected range
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded bg-blue-500" /><span className="font-medium text-slate-600">Trend</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded bg-amber-500" /><span className="font-medium text-slate-600">Seasonality</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded bg-rose-500" /><span className="font-medium text-slate-600">Residual</span></div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0 pb-0">
                <div className="h-[240px]">
                    {points.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-sm text-slate-400">
                            {data ? 'No rows match the current filters' : 'Loading…'}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="trend" name="Trend" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                <Line type="monotone" dataKey="seasonality" name="Seasonality" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                <Line type="monotone" dataKey="residual" name="Residual" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: '#f43f5e' }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
                {showInterpret && points.length > 0 && <InterpretPanel insights={insightsFor(points, historyMonths)} />}
            </CardContent>
        </Card>
    );
}
