'use client';

import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MiniMetricCardProps {
    title: string;
    value: string;
    change: string;
    isPositive: boolean;
    data: Array<{ value: number }>;
    color: string;
    bgColor?: string;
}

export function MiniMetricCard({ title, value, change, isPositive, data, color, bgColor = 'bg-white' }: MiniMetricCardProps) {
    return (
        <div className={`${bgColor} rounded-xl p-5 shadow-md border border-slate-100 hover:shadow-lg transition-all duration-300`}>
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h4 className="text-sm font-medium text-slate-600">{title}</h4>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-xs text-slate-400">V3 26.49% (Prev)</span>
                        </div>
                    </div>
                </div>

                {/* Value */}
                <div className="flex items-end justify-between">
                    <div className="text-3xl font-bold text-slate-900">{value}</div>
                    <div className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {change}
                    </div>
                </div>

                {/* Mini Chart */}
                <div className="h-14 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={color}
                                strokeWidth={2}
                                fill={`url(#gradient-${color})`}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
