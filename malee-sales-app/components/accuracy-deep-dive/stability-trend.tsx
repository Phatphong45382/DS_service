'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

export interface TimeSeriesPoint { label: string; data: { year: number; month: number; qty: number }[] }

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function StabilityTrend({ data, loading }: { data: TimeSeriesPoint[]; loading?: boolean }) {
    const wape = data.find(s => s.label === 'WAPE')?.data ?? [];
    const bias = data.find(s => s.label === 'Bias')?.data ?? [];
    const rows = wape.map((p, i) => ({
        month: `${MONTH_NAMES[p.month - 1]} ${String(p.year).slice(2)}`,
        wape: Number(p.qty.toFixed(1)),
        bias: Number((bias[i]?.qty ?? 0).toFixed(1)),
    }));

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-slate-900">Monthly Accuracy Trend (Stability)</h3>
                <p className="text-xs text-slate-500">WAPE and Bias of the Plan by month; Bias below 0 = under-planned</p>
            </div>

            <div className="flex-1 min-h-0">
                {rows.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                        {loading ? 'Loading…' : 'No rows match the current filters'}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={rows} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" fontSize={12} tickMargin={10} />
                            <YAxis fontSize={12} unit="%" />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v: any) => `${v}%`} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <ReferenceLine y={0} stroke="#cbd5e1" />
                            <Line type="monotone" dataKey="wape" name="WAPE (Error Magnitude)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="bias" name="Bias (Direction)" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
