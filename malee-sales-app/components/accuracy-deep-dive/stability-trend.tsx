'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Mock Data
const data = [
    { month: 'Jan', wape: 15, bias: 5 },
    { month: 'Feb', wape: 18, bias: 8 },
    { month: 'Mar', wape: 12, bias: -2 },
    { month: 'Apr', wape: 10, bias: -1 },
    { month: 'May', wape: 22, bias: 12 },
    { month: 'Jun', wape: 25, bias: 15 },
    { month: 'Jul', wape: 20, bias: 8 },
    { month: 'Aug', wape: 18, bias: 4 },
    { month: 'Sep', wape: 15, bias: -3 },
    { month: 'Oct', wape: 12, bias: -5 },
    { month: 'Nov', wape: 14, bias: 2 },
    { month: 'Dec', wape: 28, bias: 18 }, // High error in Dec
];

export function StabilityTrend() {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-slate-900">Monthly Accuracy Trend (Stability)</h3>
                <p className="text-xs text-slate-500">Track WAPE & Bias over time</p>
            </div>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" fontSize={12} tickMargin={10} />
                        <YAxis fontSize={12} unit="%" />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />

                        <Line
                            type="monotone"
                            dataKey="wape"
                            name="WAPE (Error Magnitude)"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ r: 4, strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="bias"
                            name="Bias (Direction)"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            dot={{ r: 4, strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
