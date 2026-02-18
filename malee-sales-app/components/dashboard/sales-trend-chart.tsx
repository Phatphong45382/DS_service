'use client';

import { Card } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { salesTrendData } from "@/lib/data";
import * as React from 'react';

export function SalesTrendChart() {
    const [isMounted, setIsMounted] = React.useState(false);
    React.useEffect(() => setIsMounted(true), []);

    if (!isMounted) return null;

    return (
        <Card className="bg-white rounded-[24px] p-8 border-2 border-[#FFF0E5] shadow-[0_8px_20px_rgba(255,138,91,0.05)] h-[400px]">
            <div className="space-y-1 mb-6">
                <h3 className="text-xl font-bold text-[#2D2D2D] font-poppins">Sales & Profit Trends 📈</h3>
                <p className="text-sm text-[#7A7A7A] font-medium mt-1">Monthly performance overview</p>
            </div>

            <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={salesTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF8A5B" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#FF8A5B" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FFCC80" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#FFCC80" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBE5E0" />
                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#A8A29E', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#A8A29E', fontSize: 12 }}
                        tickFormatter={(value) => `฿${value}`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#FFFFFF',
                            border: '2px solid #FFF0E5',
                            borderRadius: '16px',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                            padding: '12px',
                            color: '#44403C'
                        }}
                        itemStyle={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area
                        type="monotone"
                        dataKey="sales"
                        stroke="#FF8A5B"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorSales)"
                        name="Revenue"
                    />
                    <Area
                        type="monotone"
                        dataKey="profit"
                        stroke="#FFCC80"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorProfit)"
                        name="Profit"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </Card>
    );
}
