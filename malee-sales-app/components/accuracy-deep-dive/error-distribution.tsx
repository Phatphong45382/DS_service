'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

// Mock Data: Binned error percentages
const data = [
    { bin: '< -30%', count: 15, fill: '#ef4444' },
    { bin: '-30% to -20%', count: 25, fill: '#f87171' },
    { bin: '-20% to -10%', count: 45, fill: '#fca5a5' },
    { bin: '-10% to 0%', count: 80, fill: '#fee2e2' },
    { bin: '0% to 10%', count: 95, fill: '#dbeafe' },
    { bin: '10% to 20%', count: 50, fill: '#93c5fd' },
    { bin: '20% to 30%', count: 30, fill: '#60a5fa' },
    { bin: '> 30%', count: 20, fill: '#3b82f6' },
];

export function ErrorDistribution() {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-slate-900">Error Distribution</h3>
                <p className="text-xs text-slate-500">Shows spread of forecast errors</p>
            </div>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="bin"
                            fontSize={10}
                            tickMargin={10}
                            interval={0}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis fontSize={12} />
                        <Tooltip
                            cursor={{ fill: '#f1f5f9' }}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-white p-2 border border-slate-200 shadow-md rounded text-xs">
                                            <p className="font-semibold">{label}</p>
                                            <p>Count: {payload[0].value}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <ReferenceLine x="0% to 10%" stroke="#94a3b8" strokeDasharray="3 3" label={{ position: 'top', value: 'Ideal' }} />
                        <Bar dataKey="count" name="Frequency" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="flex justify-center gap-4 mt-2 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-400 rounded-sm"></div>
                    <span>Over-planned (Negative Error)</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
                    <span>Under-planned (Positive Error)</span>
                </div>
            </div>
        </div>
    );
}
