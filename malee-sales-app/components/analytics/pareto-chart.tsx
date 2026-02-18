'use client';

import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';

interface ParetoData {
    name: string;
    error: number;
    cumulativePercentage: number;
}

const data: ParetoData[] = [
    { name: '7-Eleven x coconut 350ml', error: 220000, cumulativePercentage: 26 },
    { name: 'Lotus x coconut 350ml', error: 160000, cumulativePercentage: 46 },
    { name: 'BigC x coconut 350ml', error: 120000, cumulativePercentage: 60 },
    { name: 'Makro x coconut 350ml', error: 90000, cumulativePercentage: 71 },
    { name: 'CJ x coconut 350ml', error: 70000, cumulativePercentage: 79 },
    { name: 'Tops x coconut 350ml', error: 50000, cumulativePercentage: 85 },
    { name: 'Online x coconut 350ml', error: 40000, cumulativePercentage: 90 },
    { name: 'Other MT x coconut 350ml', error: 30000, cumulativePercentage: 94 },
    { name: 'Traditional x coconut 350ml', error: 25000, cumulativePercentage: 98 },
    { name: 'Export x coconut 350ml', error: 20000, cumulativePercentage: 100 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                <p className="text-sm font-bold text-slate-900 mb-2">{label}</p>
                <div className="space-y-1">
                    <p className="text-xs text-blue-600">
                        Total Error: <span className="font-semibold">{payload[0].value.toLocaleString()}</span>
                    </p>
                    <p className="text-xs text-slate-600">
                        Cumulative %: <span className="font-semibold">{payload[1].value}%</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export function ParetoChart() {
    return (
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">Top 10 Contributors to Error (Pareto)</h3>
                    <p className="text-sm text-slate-500 mt-0.5">Analysis of error distribution by customer & SKU</p>
                </div>
            </div>

            <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart
                        data={data}
                        margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
                    >
                        <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="name"
                            angle={-30}
                            textAnchor="end"
                            interval={0}
                            height={80}
                            tick={{ fontSize: 12, fill: '#94a3b8' }}
                            axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis
                            yAxisId="left"
                            label={{ value: 'Total Absolute Error (pieces)', angle: -90, position: 'insideLeft', offset: 0, style: { fontSize: 12, fill: '#94a3b8' } }}
                            tick={{ fontSize: 12, fill: '#94a3b8' }}
                            axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            domain={[0, 110]}
                            label={{ value: 'Cumulative % of Top-10 Error', angle: 90, position: 'insideRight', offset: 0, style: { fontSize: 12, fill: '#94a3b8' } }}
                            tick={{ fontSize: 12, fill: '#94a3b8' }}
                            tickFormatter={(value) => `${value}%`}
                            axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={80} yAxisId="right" stroke="#0ea5e9" strokeDasharray="3 3" label={{ value: '80%', position: 'right', fill: '#0ea5e9', fontSize: 12 }} />

                        <Bar
                            yAxisId="left"
                            dataKey="error"
                            fill="#1d4ed8"
                            barSize={30}
                            radius={[4, 4, 0, 0]}
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="cumulativePercentage"
                            stroke="#0284c7"
                            strokeWidth={2}
                            dot={{ fill: '#0284c7', r: 4, strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6 }}
                        >
                            {/* Adding labels to line points */}
                            {/* <LabelList dataKey="cumulativePercentage" position="top" formatter={(val: number) => `${val}%`} style={{ fontSize: 10, fill: '#0284c7' }} /> */}
                        </Line>
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
