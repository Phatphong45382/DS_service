'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2 } from "lucide-react";

interface GroupByPoint {
    label: string;
    qty: number;
}

interface TopCustomersChartProps {
    data?: GroupByPoint[];
    isLoading?: boolean;
}

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
            <p className="text-sm font-semibold text-slate-800">{payload[0].payload.fullName}</p>
            <p className="text-xs text-slate-500 mt-1">
                Volume: <span className="font-bold text-blue-600">
                    {new Intl.NumberFormat('en-US').format(payload[0].value)}
                </span>
            </p>
        </div>
    );
};

export function TopCustomersChart({ data = [], isLoading = false }: TopCustomersChartProps) {
    const fmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format;

    const chartData = data.slice(0, 8).map(d => ({
        name: d.label.length > 14 ? d.label.slice(0, 14) + '…' : d.label,
        fullName: d.label,
        qty: d.qty,
    }));

    return (
        <Card className="h-full flex flex-col shadow-sm border-slate-200">
            <CardHeader className="pb-2 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-bold text-slate-800">Top Customers</CardTitle>
                        <CardDescription>Sales volume by customer (top 8)</CardDescription>
                    </div>
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 pt-0">
                {chartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                        No data available
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis
                                type="number"
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={fmt}
                            />
                            <YAxis
                                dataKey="name"
                                type="category"
                                tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                                width={90}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="qty" name="Volume" radius={[0, 4, 4, 0]} maxBarSize={18}>
                                {chartData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
