'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend } from 'recharts';

// Mock Data
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const seasonality = [0.8, 1.5, 1.0, 1.1, 1.0, 0.9, 0.9, 1.0, 1.0, 1.4, 0.8, 1.2];
const base = 500000;

const data = months.map((m, i) => ({
    subject: m,
    A: base * seasonality[i], // 2023
    B: base * seasonality[i] * 1.1, // 2024
    fullMark: base * 2,
}));

export function RadialSeasonalityChart() {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>2. Radial / Radar Chart</CardTitle>
                <CardDescription>
                    Best for cyclical view: "Shape of the year" & repeating trends.
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 1000000]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Radar
                            name="2023"
                            dataKey="A"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fill="#3b82f6"
                            fillOpacity={0.1}
                        />
                        <Radar
                            name="2024"
                            dataKey="B"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="#10b981"
                            fillOpacity={0.1}
                        />
                        <Legend />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: any) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(Number(value || 0))}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
