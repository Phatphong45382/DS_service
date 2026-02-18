'use client';

import { Card } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { regionalSalesData } from "@/lib/data";
import * as React from 'react';

const COLORS = ['#FF8A5B', '#FFB74D', '#FFCC80', '#FFE0B2', '#FFF3E0'];

export function RegionalSalesChart() {
    const [isMounted, setIsMounted] = React.useState(false);
    React.useEffect(() => setIsMounted(true), []);

    if (!isMounted) return null;

    return (
        <Card className="bg-white rounded-[var(--radius-card)] p-8 border-2 border-warm-border-light shadow-warm-accent h-[400px]">
            <div className="space-y-1 mb-6">
                <h3 className="text-xl font-bold text-warm-text-primary font-poppins">Regional Sales 🗺️</h3>
                <p className="text-sm text-warm-text-secondary font-medium mt-1">Performance by territory</p>
            </div>

            <ResponsiveContainer width="100%" height="85%">
                <BarChart data={regionalSalesData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--warm-border)" />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="region"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--warm-text-secondary)', fontSize: 13, fontWeight: 600 }}
                        width={80}
                    />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{
                            backgroundColor: '#FFFFFF',
                            border: '2px solid var(--warm-border-light)',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            padding: '8px 12px',
                            color: 'var(--warm-text-primary)'
                        }}
                    />
                    <Bar dataKey="sales" radius={[0, 8, 8, 0]} barSize={32}>
                        {regionalSalesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </Card>
    );
}
