'use client';

import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { categoryData } from "@/lib/data";
import * as React from 'react';

export function CategoryChart() {
    const [isMounted, setIsMounted] = React.useState(false);
    React.useEffect(() => setIsMounted(true), []);

    if (!isMounted) return null;

    return (
        <Card className="bg-white rounded-[24px] p-8 border-2 border-[#FFF0E5] shadow-[0_8px_20px_rgba(255,138,91,0.05)] h-[400px]">
            <div className="space-y-1 mb-4">
                <h3 className="text-xl font-bold text-[#2D2D2D] font-poppins">Sales by Category 🍩</h3>
                <p className="text-sm text-[#7A7A7A] font-medium mt-1">Distribution across product lines</p>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={categoryData}
                        cx="50%"
                        cy="40%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#FFFFFF',
                            border: '2px solid #FFF0E5',
                            borderRadius: '16px',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                            padding: '12px',
                            color: '#44403C'
                        }}
                        itemStyle={{ color: '#FF8A5B', fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        formatter={(value) => <span className="text-[#44403C] font-medium ml-1">{value}</span>}
                    />
                </PieChart>
            </ResponsiveContainer>
        </Card>
    );
}
