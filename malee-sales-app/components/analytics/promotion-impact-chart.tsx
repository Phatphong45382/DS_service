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

interface SalesData {
    month: string;
    sales: number;
    hasPromotion: boolean;
    promotionName?: string;
}

const data: SalesData[] = [
    { month: 'Jan', sales: 120000, hasPromotion: false },
    { month: 'Feb', sales: 180000, hasPromotion: true, promotionName: 'CNY Sale' },
    { month: 'Mar', sales: 160000, hasPromotion: true, promotionName: 'Summer Start' },
    { month: 'Apr', sales: 140000, hasPromotion: false },
    { month: 'May', sales: 130000, hasPromotion: false },
    { month: 'Jun', sales: 190000, hasPromotion: true, promotionName: 'Mid-Year' },
    { month: 'Jul', sales: 150000, hasPromotion: false },
    { month: 'Aug', sales: 145000, hasPromotion: false },
    { month: 'Sep', sales: 210000, hasPromotion: true, promotionName: '9.9 Mega' },
    { month: 'Oct', sales: 135000, hasPromotion: false },
    { month: 'Nov', sales: 230000, hasPromotion: true, promotionName: '11.11' },
    { month: 'Dec', sales: 250000, hasPromotion: true, promotionName: 'Year End' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const item = payload[0].payload;
        return (
            <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                <p className="text-sm font-bold text-slate-900 mb-1">{item.month}</p>
                <div className="space-y-1">
                    <p className="text-xs text-slate-600">
                        Sales: <span className="font-semibold text-slate-900">{item.sales.toLocaleString()}</span>
                    </p>
                    {item.hasPromotion && (
                        <div className="flex items-center gap-1.5 mt-2 bg-green-50 px-2 py-1 rounded text-green-700">
                            <span className="text-[10px] font-bold">PROMO</span>
                            <span className="text-[10px]">{item.promotionName}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

// Custom shape for the bar to show visually distinct style for promo months
const CustomBar = (props: any) => {
    const { fill, x, y, width, height, hasPromotion } = props;

    return (
        <g>
            {/* Main Bar */}
            <rect x={x} y={y} width={width} height={height} rx={4} ry={4} fill={fill} />

            {/* Promo Indicator (Star/Badge on top) */}
            {hasPromotion && (
                <rect
                    x={x + width / 2 - 3}
                    y={y - 8}
                    width={6}
                    height={6}
                    rx={3}
                    fill="#10b981"
                />
            )}
        </g>
    );
};

export function PromotionImpactChart() {
    return (
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">Promotion Impact</h3>
                    <p className="text-sm text-slate-500 mt-0.5">Monthly sales vs. promotion periods</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-green-500"></div>
                        <span className="text-slate-600">Promotion</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-slate-300"></div>
                        <span className="text-slate-600">Regular</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                        data={data}
                        margin={{ top: 20, right: 10, bottom: 0, left: 10 }}
                    >
                        <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="month"
                            tick={{ fontSize: 12, fill: '#94a3b8' }}
                            axisLine={{ stroke: '#e2e8f0' }}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 12, fill: '#94a3b8' }}
                            axisLine={{ stroke: '#e2e8f0' }}
                            tickLine={false}
                            tickFormatter={(value) => `${value / 1000}k`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="sales" radius={[4, 4, 0, 0]} maxBarSize={50}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.hasPromotion ? '#22c55e' : '#cbd5e1'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
