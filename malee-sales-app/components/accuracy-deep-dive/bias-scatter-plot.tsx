'use client';

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

// Mock Data
// Deterministic Mock Data Generator
const generateScatterData = () => {
    return Array.from({ length: 100 }, (_, i) => {
        const planned = 1000 + ((i * 137) % 4000);
        const deviation = ((i * 151) % 2000) - 1000; // variance
        const promo = (i * 197 + 7) % 10 > 7;
        const actual = Math.max(0, planned + deviation + (promo ? 500 : 0));

        return {
            planned,
            actual,
            promo,
            name: `Product ${(i % 20) + 1}`
        };
    });
};

const data = generateScatterData();

const promoData = data.filter(d => d.promo);
const normalData = data.filter(d => !d.promo);

export function BiasScatterPlot() {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-slate-900">Actual vs Planned (Bias Direction)</h3>
                <p className="text-xs text-slate-500">Above line = Under-planned, Below = Over-planned</p>
            </div>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            type="number"
                            dataKey="planned"
                            name="Planned Sales"
                            unit=""
                            stroke="#94a3b8"
                            fontSize={12}
                            tickFormatter={(val) => `${val / 1000}k`}
                            label={{ value: 'Planned Sales', position: 'insideBottom', offset: -10, fill: '#64748b' }}
                        />
                        <YAxis
                            type="number"
                            dataKey="actual"
                            name="Actual Sales"
                            unit=""
                            stroke="#94a3b8"
                            fontSize={12}
                            tickFormatter={(val) => `${val / 1000}k`}
                            label={{ value: 'Actual Sales', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                        />
                        <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-white p-2 border border-slate-200 shadow-md rounded text-xs">
                                            <p className="font-semibold">{data.name}</p>
                                            <p>Planned: {data.planned}</p>
                                            <p>Actual: {data.actual}</p>
                                            <p className={data.actual > data.planned ? 'text-red-500' : 'text-blue-500'}>
                                                {data.actual > data.planned ? 'Under-planned' : 'Over-planned'}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />

                        {/* Perfect Plan Line (y=x) */}
                        <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 6000, y: 6000 }]} stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" label="Ideal" />

                        {/* Series */}
                        <Scatter name="Normal Sales" data={normalData} fill="#94a3b8" shape="circle" />
                        <Scatter name="Promotion Sales" data={promoData} fill="#8b5cf6" shape="triangle" />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
