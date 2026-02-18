'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine,
    LabelList
} from 'recharts';

const data = [
    { month: 'Jan', error: 5000 },
    { month: 'Feb', error: -2000 },
    { month: 'Mar', error: 10000 },
    { month: 'Apr', error: -2000 },
    { month: 'May', error: 10000 },
    { month: 'Jun', error: -5000 },
    { month: 'Jul', error: -5000 },
    { month: 'Aug', error: 5000 },
    { month: 'Sep', error: 15000 },
    { month: 'Oct', error: -5000 },
    { month: 'Nov', error: -10000 },
    { month: 'Dec', error: 10000 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const value = payload[0].value;
        const isPositive = value >= 0;
        return (
            <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                <p className="text-sm font-bold text-slate-900 mb-1">{label}</p>
                <div className="space-y-1">
                    <p className={`text-xs font-semibold ${isPositive ? 'text-blue-600' : 'text-red-500'}`}>
                        Error: {value > 0 ? '+' : ''}{value.toLocaleString()} pieces
                    </p>
                    <p className="text-xs text-slate-500">
                        {isPositive ? 'Over-forecast (Planned > Actual)' : 'Under-forecast (Actual > Planned)'}
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export function MonthlyErrorChart() {
    return (
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">Monthly Error (Planned - Actual)</h3>
                    <p className="text-sm text-slate-500 mt-0.5">Diverging bar chart showing forecast accuracy</p>
                </div>
            </div>

            <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                        data={data}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        stackOffset="sign"
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                            dataKey="month"
                            tick={{ fontSize: 12, fill: '#94a3b8' }}
                            axisLine={{ stroke: '#e2e8f0' }}
                            tickLine={false}
                        />
                        <YAxis
                            hide // Hide Y axis for cleaner look as we have labels on bars
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                        <ReferenceLine y={0} stroke="#94a3b8" />
                        <Bar dataKey="error" fill="#1d4ed8" maxBarSize={50}>
                            {
                                data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.error >= 0 ? '#1d4ed8' : '#ef4444'} radius={entry.error >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4] as any} />
                                ))
                            }
                            <LabelList
                                dataKey="error"
                                position="top"
                                formatter={(val: any) => val.toLocaleString()}
                                style={{ fontSize: 10, fill: '#64748b' }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
