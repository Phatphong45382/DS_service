'use client';

import { Card } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SalesData } from "@/types";
import * as React from 'react';

interface RevenueChartProps {
    data: SalesData[];
}

export function RevenueChart({ data }: RevenueChartProps) {
    const [isMounted, setIsMounted] = React.useState(false);
    React.useEffect(() => setIsMounted(true), []);

    if (!isMounted) return null;

    // Format data for chart
    const chartData = data.map(item => ({
        date: new Date(item.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
        revenue: item.revenue,
    }));

    return (
        <Card className="bg-white/50 backdrop-blur-sm rounded-[24px] p-8 border border-[#EBE5E0] shadow-[0_4px_16px_rgba(97,78,66,0.03)]">
            <div className="space-y-1 mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-[#44403C] font-poppins">Revenue Trends 📈</h3>
                        <p className="text-sm text-[#78716C] font-medium mt-1">Showing data for the last 30 days</p>
                    </div>
                    <div className="bg-[#F5EFE9] rounded-xl p-1 flex border border-[#F0E6DD]">
                        <button className="bg-[#FF8A5B] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">Monthly</button>
                        <button className="text-[#78716C] text-xs font-medium px-3 py-1.5 hover:text-[#FF8A5B]">Yearly</button>
                    </div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorRevenueWarm" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF8A5B" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#FF8A5B" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0E6DD" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#A8A29E"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        fontFamily="Poppins, sans-serif"
                        fontWeight={500}
                    />
                    <YAxis
                        stroke="#A8A29E"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        fontFamily="Poppins, sans-serif"
                        fontWeight={500}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#FCFBF9',
                            border: '1px solid #EBE5E0',
                            borderRadius: '16px',
                            boxShadow: '0 8px 24px rgba(97,78,66,0.08)',
                            padding: '12px'
                        }}
                        labelStyle={{ color: '#44403C', fontWeight: 700, fontFamily: 'Poppins, sans-serif', marginBottom: '4px' }}
                        itemStyle={{ color: '#FF8A5B', fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}
                        cursor={{ stroke: '#FF8A5B', strokeWidth: 2, strokeDasharray: '4 4' }}
                        formatter={(value: number | undefined) => {
                            if (value === undefined) return ['', 'Revenue'];
                            return [
                                new Intl.NumberFormat('th-TH', {
                                    style: 'currency',
                                    currency: 'THB',
                                    minimumFractionDigits: 0,
                                }).format(value),
                                'Revenue'
                            ];
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#FF8A5B"
                        strokeWidth={4}
                        fill="url(#colorRevenueWarm)"
                        animationDuration={1500}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </Card>
    );
}
