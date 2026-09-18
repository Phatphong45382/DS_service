'use client';

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

export interface ScatterPoint { planned: number; actual: number; is_promo: boolean; label: string }

const fmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format;

export function BiasScatterPlot({ data, loading }: { data: ScatterPoint[]; loading?: boolean }) {
    const promoData = data.filter(d => d.is_promo);
    const normalData = data.filter(d => !d.is_promo);
    const top = data.reduce((m, d) => Math.max(m, d.planned, d.actual), 0);

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-slate-900">Actual vs Planned (Bias Direction)</h3>
                <p className="text-xs text-slate-500">Above line = Under-planned, Below = Over-planned</p>
            </div>

            <div className="flex-1 min-h-0">
                {data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                        {loading ? 'Loading…' : 'No rows match the current filters'}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" dataKey="planned" name="Planned" stroke="#94a3b8" fontSize={12} tickFormatter={fmt}
                                label={{ value: 'Planned', position: 'insideBottom', offset: -10, fill: '#64748b' }} />
                            <YAxis type="number" dataKey="actual" name="Actual" stroke="#94a3b8" fontSize={12} tickFormatter={fmt}
                                label={{ value: 'Actual', angle: -90, position: 'insideLeft', fill: '#64748b' }} />
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload as ScatterPoint;
                                        return (
                                            <div className="bg-white p-2 border border-slate-200 shadow-md rounded text-xs">
                                                <p className="font-semibold">{d.label}</p>
                                                <p>Planned: {d.planned.toLocaleString()}</p>
                                                <p>Actual: {d.actual.toLocaleString()}</p>
                                                <p className={d.actual > d.planned ? 'text-red-500' : 'text-blue-500'}>
                                                    {d.actual > d.planned ? 'Under-planned' : 'Over-planned'}
                                                </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                            <ReferenceLine segment={[{ x: 0, y: 0 }, { x: top, y: top }]} stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" label="Ideal" />
                            <Scatter name="No promotion" data={normalData} fill="#94a3b8" shape="circle" />
                            <Scatter name="Promotion" data={promoData} fill="#8b5cf6" shape="triangle" />
                        </ScatterChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
