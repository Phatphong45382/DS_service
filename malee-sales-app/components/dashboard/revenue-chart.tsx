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
        <Card className="bg-white/50 backdrop-blur-sm rounded-[var(--radius-card)] p-8 border border-warm-border shadow-warm-sm">
            <div className="space-y-1 mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-warm-text-primary font-poppins">Revenue Trends 📈</h3>
                        <p className="text-sm text-warm-text-secondary font-medium mt-1">Showing data for the last 30 days</p>
                    </div>
                    <div className="bg-warm-bg-subtle rounded-xl p-1 flex border border-warm-bg-hover">
                        <button className="bg-warm-accent text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-enterprise-sm">Monthly</button>
                        <button className="text-warm-text-secondary text-xs font-medium px-3 py-1.5 hover:text-warm-accent">Yearly</button>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--warm-bg-hover)" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="var(--warm-text-muted)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        fontFamily="var(--font-display)"
                        fontWeight={500}
                    />
                    <YAxis
                        stroke="var(--warm-text-muted)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        fontFamily="var(--font-display)"
                        fontWeight={500}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--warm-bg-card)',
                            border: '1px solid var(--warm-border)',
                            borderRadius: '16px',
                            boxShadow: '0 8px 24px var(--warm-shadow-hover)',
                            padding: '12px'
                        }}
                        labelStyle={{ color: 'var(--warm-text-primary)', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '4px' }}
                        itemStyle={{ color: 'var(--warm-accent)', fontFamily: 'var(--font-display)', fontWeight: 600 }}
                        cursor={{ stroke: 'var(--warm-accent)', strokeWidth: 2, strokeDasharray: '4 4' }}
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
