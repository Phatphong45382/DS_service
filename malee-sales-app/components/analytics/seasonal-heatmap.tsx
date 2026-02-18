'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAnalyticsData, getAnalyticsFilters } from "@/lib/api-client";
import { Loader2 } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface SeasonalHeatmapProps {
    globalFilters?: any;
}

export function SeasonalHeatmap({ globalFilters }: SeasonalHeatmapProps) {
    const [loading, setLoading] = useState(false);
    const [heatmapData, setHeatmapData] = useState<Map<string, number>>(new Map());
    const [yearlyAverages, setYearlyAverages] = useState<Map<number, number>>(new Map());

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (!globalFilters) return;
            setLoading(true);
            try {
                // Prepare params
                const params: any = {
                    year_from: parseInt(globalFilters.date_range.start.split('-')[0]),
                    month_from: parseInt(globalFilters.date_range.start.split('-')[1]),
                    year_to: parseInt(globalFilters.date_range.end.split('-')[0]),
                    month_to: parseInt(globalFilters.date_range.end.split('-')[1]),
                };

                if (globalFilters.product_group && globalFilters.product_group !== 'all') params.product_group = globalFilters.product_group;
                if (globalFilters.flavor && globalFilters.flavor !== 'all') params.flavor = globalFilters.flavor;
                if (globalFilters.size && globalFilters.size !== 'all') params.size = globalFilters.size;
                if (globalFilters.customer && globalFilters.customer !== 'all') params.customer = globalFilters.customer;

                // Call API
                const data: any = await getAnalyticsData(params);

                // Process Data (Standard Time Series)
                const timeSeries = data.monthly_ts || [];

                const map = new Map<string, number>();
                const yearTotals = new Map<number, number>();
                const yearCounts = new Map<number, number>();

                timeSeries.forEach((item: any) => {
                    const key = `${item.year}-${item.month}`;
                    map.set(key, item.qty);

                    // Accumulate for yearly average
                    yearTotals.set(item.year, (yearTotals.get(item.year) || 0) + item.qty);
                    yearCounts.set(item.year, (yearCounts.get(item.year) || 0) + 1);
                });

                // Calculate Yearly Averages
                const yearAvgs = new Map<number, number>();
                yearTotals.forEach((total, year) => {
                    const count = yearCounts.get(year) || 1;
                    yearAvgs.set(year, total / count);
                });

                setHeatmapData(map);
                setYearlyAverages(yearAvgs);

            } catch (error) {
                console.error("Failed to fetch heatmap data", error);
            } finally {
                setLoading(false);
            }
        };

        // Debounce slightly to prevent rapid calls
        const timer = setTimeout(() => fetchData(), 300);
        return () => clearTimeout(timer);

    }, [globalFilters]); // Depend on global state only

    // Helper for color scale (Diverging, Fixed Range -50% to +50%)
    const getColor = (val: number, yearAvg: number) => {
        if (yearAvg === 0) return "bg-slate-50";

        const deviation = (val - yearAvg) / yearAvg;

        // Fixed scale: Max saturation at +/- 50%
        const maxDev = 0.5;
        const ratio = Math.min(Math.abs(deviation), maxDev) / maxDev; // 0 to 1

        if (deviation > 0) {
            // Green for positive
            if (ratio < 0.2) return "bg-green-50 text-green-700";
            if (ratio < 0.4) return "bg-green-100 text-green-800";
            if (ratio < 0.6) return "bg-green-300 text-green-900";
            if (ratio < 0.8) return "bg-green-500 text-white";
            return "bg-green-700 text-white";
        } else {
            // Red for negative
            if (ratio < 0.2) return "bg-red-50 text-red-700";
            if (ratio < 0.4) return "bg-red-100 text-red-800";
            if (ratio < 0.6) return "bg-red-300 text-red-900";
            if (ratio < 0.8) return "bg-red-500 text-white";
            return "bg-red-700 text-white";
        }
    };

    const getDeviationText = (val: number, yearAvg: number) => {
        if (yearAvg === 0) return "0%";
        const dev = ((val - yearAvg) / yearAvg) * 100;
        return `${dev > 0 ? '+' : ''}${dev.toFixed(0)}%`;
    };

    const getTooltipText = (val: number, year: number) => {
        const yearAvg = yearlyAverages.get(year) || 0;
        const devText = getDeviationText(val, yearAvg);
        const fmt = new Intl.NumberFormat('en-US', { notation: "compact" }).format;
        return `Actual: ${fmt(val)}\nYear Avg (${year}): ${fmt(yearAvg)}\nDeviation: ${devText}`;
    };

    const years = useMemo(() => {
        if (!globalFilters) return [2023, 2024];
        const start = parseInt(globalFilters.date_range.start.split('-')[0]);
        const end = parseInt(globalFilters.date_range.end.split('-')[0]);
        const arr = [];
        for (let y = start; y <= end; y++) arr.push(y);
        return arr;
    }, [globalFilters]);

    // Tooltip State
    const [hoveredCell, setHoveredCell] = useState<{
        year: number;
        month: string;
        value: number;
        yearAvg: number;
        x: number;
        y: number;
    } | null>(null);

    return (
        <Card className="col-span-1 shadow-sm border-slate-200 h-full flex flex-col relative">
            <CardHeader className="pb-4 shrink-0">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            Seasonal Heatmap (Within-Year Index)
                        </CardTitle>
                        <CardDescription>
                            % Deviation from each year's average (Baseline = 0%)
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="h-full flex flex-col justify-between relative" onMouseLeave={() => setHoveredCell(null)}>
                {/* Main Grid Container - Flex Grow to fill space */}
                <div className="flex-1 w-full min-h-0 flex flex-col justify-center">
                    <div className="w-full relative">
                        <div className="grid grid-cols-[auto_repeat(12,1fr)] gap-2 lg:gap-3">
                            {/* Header Row */}
                            <div className="h-8"></div> {/* Spacer for Year Column */}
                            {MONTHS.map(m => (
                                <div key={m} className="flex items-center justify-center text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">
                                    {m}
                                </div>
                            ))}

                            {/* Data Rows */}
                            {years.filter(year => yearlyAverages.has(year) && yearlyAverages.get(year)! > 0).map(year => (
                                <div key={year} className="contents transition-opacity duration-300">
                                    <div className="flex items-center justify-start font-bold text-slate-700 text-sm pr-4">
                                        {year}
                                    </div>
                                    {MONTHS.map((_, mIndex) => {
                                        const key = `${year}-${mIndex + 1}`;
                                        const val = heatmapData.get(key) || 0;
                                        const hasData = heatmapData.has(key);
                                        const yearAvg = yearlyAverages.get(year) || 0;
                                        const colorClass = hasData ? getColor(val, yearAvg) : 'bg-slate-50 text-slate-300 border-dashed border-slate-200';

                                        return (
                                            <div
                                                key={`${year}-${mIndex}`}
                                                className={`
                                                    relative h-12 lg:h-14 rounded-lg flex items-center justify-center text-[11px] font-bold 
                                                    transition-all duration-200 border border-transparent
                                                    ${colorClass}
                                                    ${hasData ? 'hover:scale-110 hover:shadow-lg hover:z-10 hover:border-white/50 cursor-help' : ''}
                                                `}
                                                onMouseEnter={(e) => {
                                                    if (hasData) {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        // Calculate position relative to viewport or container? 
                                                        // Using fixed position for tooltip usually works best to avoid clipping
                                                        setHoveredCell({
                                                            year,
                                                            month: MONTHS[mIndex],
                                                            value: val,
                                                            yearAvg,
                                                            x: rect.left + rect.width / 2,
                                                            y: rect.top
                                                        });
                                                    }
                                                }}
                                                onMouseLeave={() => setHoveredCell(null)}
                                            >
                                                {/* Tooltip content if not using title */}
                                                {hasData ? (
                                                    <span className="drop-shadow-sm pointer-events-none">{getDeviationText(val, yearAvg)}</span>
                                                ) : (
                                                    <span className="text-[10px] font-normal opacity-50 pointer-events-none">-</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Legend - Fixed at bottom */}
                <div className="mt-6 flex items-center justify-end gap-3 text-xs text-slate-500 shrink-0">
                    <span className="font-medium text-slate-400 text-[10px] uppercase tracking-wide mr-2">0% = Yearly Avg</span>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                        <span className="text-[10px] font-medium text-red-700">Below</span>
                        <div className="flex gap-0.5">
                            <div className="w-2.5 h-4 rounded-sm bg-red-500"></div>
                            <div className="w-2.5 h-4 rounded-sm bg-red-300"></div>
                            <div className="w-2.5 h-4 rounded-sm bg-slate-100 border border-slate-200"></div>
                            <div className="w-2.5 h-4 rounded-sm bg-green-300"></div>
                            <div className="w-2.5 h-4 rounded-sm bg-green-500"></div>
                        </div>
                        <span className="text-[10px] font-medium text-green-700">Above</span>
                    </div>
                </div>
            </CardContent>

            {/* Custom Floating Tooltip Portal/Overlay */}
            {hoveredCell && (
                <div
                    className="fixed z-50 bg-white rounded-xl shadow-xl border border-slate-100 p-3 pointer-events-none animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        left: hoveredCell.x,
                        top: hoveredCell.y - 10,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <div className="text-sm font-bold text-slate-800 mb-1">
                        {hoveredCell.month} {hoveredCell.year}
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-slate-500">Actual Sales:</span>
                            <span className="font-bold text-slate-800 ml-auto">
                                {new Intl.NumberFormat('en-US').format(hoveredCell.value)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                            <span className="text-slate-500">Year Avg:</span>
                            <span className="font-medium text-slate-700 ml-auto">
                                {new Intl.NumberFormat('en-US', { notation: "compact" }).format(hoveredCell.yearAvg)}
                            </span>
                        </div>
                        <div className="pt-1 mt-1 border-t border-slate-100 flex items-center gap-2">
                            <span className="text-slate-500">Deviation:</span>
                            <span className={`font-bold ml-auto ${getDeviationText(hoveredCell.value, hoveredCell.yearAvg).includes('+') ? 'text-green-600' : 'text-red-600'}`}>
                                {getDeviationText(hoveredCell.value, hoveredCell.yearAvg)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
