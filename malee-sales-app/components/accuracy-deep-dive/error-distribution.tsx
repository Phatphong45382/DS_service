'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

export interface ErrorDistBin { bin: string; count: number }

// bins run from most under-planned (red) to most over-planned (blue), in the order the API sends them
const FILLS = ['#ef4444', '#f87171', '#fca5a5', '#fee2e2', '#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6'];

export function ErrorDistribution({ data, loading }: { data: ErrorDistBin[]; loading?: boolean }) {
    const total = data.reduce((s, d) => s + d.count, 0);

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-slate-900">Error Distribution</h3>
                <p className="text-xs text-slate-500">Rows by (Plan − Actual) / Plan</p>
            </div>

            <div className="flex-1 min-h-0">
                {total === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                        {loading ? 'Loading…' : 'No rows match the current filters'}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="bin" fontSize={10} tickMargin={10} interval={0} angle={-45} textAnchor="end" height={60} />
                            <YAxis fontSize={12} />
                            <Tooltip
                                cursor={{ fill: '#f1f5f9' }}
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const count = Number(payload[0].value);
                                        return (
                                            <div className="bg-white p-2 border border-slate-200 shadow-md rounded text-xs">
                                                <p className="font-semibold">{label}</p>
                                                <p>Rows: {count.toLocaleString()} ({((count / total) * 100).toFixed(1)}%)</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <ReferenceLine x="0% to 10%" stroke="#94a3b8" strokeDasharray="3 3" label={{ position: 'top', value: 'Ideal' }} />
                            <Bar dataKey="count" name="Rows" radius={[4, 4, 0, 0]}>
                                {data.map((d, i) => <Cell key={d.bin} fill={FILLS[i] ?? '#94a3b8'} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="flex justify-center gap-4 mt-2 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-400 rounded-sm"></div>
                    <span>Under-planned (Negative Error)</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
                    <span>Over-planned (Positive Error)</span>
                </div>
            </div>
        </div>
    );
}
