'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

// Mock Data
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const seasonality = [0.8, 1.5, 1.0, 1.1, 1.0, 0.9, 0.9, 1.0, 1.0, 1.4, 0.8, 1.2];
const base = 500000;

const data = months.map((m, i) => ({
    name: m,
    "2023": Math.round(base * seasonality[i]),
    "2024": Math.round(base * seasonality[i] * 1.1),
}));

export function YearOverYearBarChart() {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>3. Year-over-Year Bar Chart</CardTitle>
                <CardDescription>
                    Best for direct comparison: "Did we beat last year's January?"
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={{ stroke: '#e2e8f0' }} tick={{ fill: '#64748b' }} />
                        <YAxis axisLine={{ stroke: '#e2e8f0' }} tick={{ fill: '#64748b' }} tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(value)} />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            formatter={(value: any) => new Intl.NumberFormat('en-US').format(Number(value || 0))}
                        />
                        <Legend />
                        <Bar name="2023" dataKey="2023" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar name="2024" dataKey="2024" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
