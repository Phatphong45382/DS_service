"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatDate } from "@/lib/mock-data";

interface DeltaData {
    date: string;
    baseline: number;
    scenario: number;
    delta: number;
}

interface ScenarioDeltaChartProps {
    data: DeltaData[];
    title?: string;
}

export function ScenarioDeltaChart({ data, title = "Impact Analysis" }: ScenarioDeltaChartProps) {
    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription className="text-xs">Scenario vs Baseline Difference</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(val) => formatDate(val)}
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: "8px", border: "1px solid #e5e5e5" }}
                            labelFormatter={(label) => formatDate(label)}
                        />
                        <ReferenceLine y={0} stroke="#000" />
                        <Bar dataKey="delta" name="Net Change (Units)">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.delta >= 0 ? "#10b981" : "#ef4444"} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
