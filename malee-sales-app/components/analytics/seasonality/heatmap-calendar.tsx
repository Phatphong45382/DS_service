'use client';

import { Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Mock Data
const years = [2023, 2024];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Generate consistent mock data for demo
const getData = (year: number, monthIndex: number) => {
    // Simulate high season in Feb, Oct
    const base = 500000;
    const seasonality = [0.8, 1.5, 1.0, 1.1, 1.0, 0.9, 0.9, 1.0, 1.0, 1.4, 0.8, 1.2];
    const growth = year === 2024 ? 1.1 : 1.0;
    return base * seasonality[monthIndex] * growth;
};

// Helper for color scale
const getColor = (value: number) => {
    const max = 1000000;
    const min = 300000;
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));

    // Green gradient
    // Low: #f0fdf4 (green-50) -> High: #15803d (green-700)
    if (ratio < 0.2) return "bg-green-50 text-green-700";
    if (ratio < 0.4) return "bg-green-100 text-green-800";
    if (ratio < 0.6) return "bg-green-300 text-green-900";
    if (ratio < 0.8) return "bg-green-500 text-white";
    return "bg-green-700 text-white";
};

export function HeatmapCalendar() {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>1. Heatmap Calendar (Seasonality)</CardTitle>
                <CardDescription>
                    Best for spotting patterns: "Which months are always hot/cold?"
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                        <div className="grid grid-cols-[auto_repeat(12,1fr)] gap-2">
                            {/* Header Row */}
                            <div className="h-10"></div>
                            {months.map(m => (
                                <div key={m} className="flex items-center justify-center text-sm font-medium text-slate-500">
                                    {m}
                                </div>
                            ))}

                            {/* Data Rows */}
                            {years.map(year => (
                                <Fragment key={year}>
                                    <div className="flex items-center justify-center font-bold text-slate-700">
                                        {year}
                                    </div>
                                    {months.map((_, mIndex) => {
                                        const val = getData(year, mIndex);
                                        return (
                                            <div
                                                key={`${year}-${mIndex}`}
                                                className={`h-12 rounded-md flex items-center justify-center text-xs font-semibold shadow-sm transition-all hover:scale-105 cursor-pointer ${getColor(val)}`}
                                                title={`${months[mIndex]} ${year}: ${new Intl.NumberFormat('en-US', { notation: "compact" }).format(val)}`}
                                            >
                                                {new Intl.NumberFormat('en-US', { notation: "compact" }).format(val)}
                                            </div>
                                        );
                                    })}
                                </Fragment>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 text-xs text-slate-500">
                    <span>Low Sales</span>
                    <div className="flex gap-1">
                        <div className="w-4 h-4 rounded bg-green-50"></div>
                        <div className="w-4 h-4 rounded bg-green-100"></div>
                        <div className="w-4 h-4 rounded bg-green-300"></div>
                        <div className="w-4 h-4 rounded bg-green-500"></div>
                        <div className="w-4 h-4 rounded bg-green-700"></div>
                    </div>
                    <span>High Sales</span>
                </div>
            </CardContent>
        </Card>
    );
}
