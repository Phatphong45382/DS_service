'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InterpretPanel } from './interpret-panel';

const AVAILABLE_YEARS = [2023, 2024];

interface PromoDistributionChartProps {
    globalFilters?: any;
    showInterpret?: boolean;
}

interface BoxPlotData {
    name: string;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
}

// Generate mock box plot stats
function generateMockStats(base: number, variance: number): Omit<BoxPlotData, 'name'> {
    return {
        min: Math.round(base - variance * 1.2),
        q1: Math.round(base - variance * 0.5),
        median: Math.round(base),
        q3: Math.round(base + variance * 0.5),
        max: Math.round(base + variance * 1.2),
    };
}

// Custom Box Plot Component
function BoxPlot({ data, color, fillColor }: { data: BoxPlotData; color: string; fillColor: string }) {
    const boxHeight = 100;
    const boxWidth = 80;
    const whiskerWidth = 40;

    // Calculate positions (inverted because SVG y=0 is at top)
    const maxY = 10;
    const minY = boxHeight - 10;
    const q3Y = maxY + (boxHeight - 20) * 0.25;
    const q1Y = maxY + (boxHeight - 20) * 0.75;
    const medianY = maxY + (boxHeight - 20) * 0.5;
    const centerX = boxWidth / 2;

    const fmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format;

    return (
        <div className="flex flex-col items-center">
            <svg width={boxWidth} height={boxHeight + 40} className="overflow-visible">
                {/* Vertical whisker line */}
                <line
                    x1={centerX}
                    y1={maxY}
                    x2={centerX}
                    y2={minY}
                    stroke={color}
                    strokeWidth={2}
                />
                {/* Max cap */}
                <line
                    x1={centerX - whiskerWidth / 2}
                    y1={maxY}
                    x2={centerX + whiskerWidth / 2}
                    y2={maxY}
                    stroke={color}
                    strokeWidth={2}
                />
                {/* Min cap */}
                <line
                    x1={centerX - whiskerWidth / 2}
                    y1={minY}
                    x2={centerX + whiskerWidth / 2}
                    y2={minY}
                    stroke={color}
                    strokeWidth={2}
                />
                {/* Box (Q1 to Q3) */}
                <rect
                    x={centerX - whiskerWidth / 2}
                    y={q3Y}
                    width={whiskerWidth}
                    height={q1Y - q3Y}
                    fill={fillColor}
                    stroke={color}
                    strokeWidth={2}
                    rx={3}
                />
                {/* Median line */}
                <line
                    x1={centerX - whiskerWidth / 2}
                    y1={medianY}
                    x2={centerX + whiskerWidth / 2}
                    y2={medianY}
                    stroke={color}
                    strokeWidth={3}
                />
                {/* Value labels */}
                <text x={centerX + whiskerWidth / 2 + 8} y={maxY + 4} fontSize="10" fill="#64748b">
                    {fmt(data.max)}
                </text>
                <text x={centerX + whiskerWidth / 2 + 8} y={q3Y + 4} fontSize="10" fill="#64748b">
                    {fmt(data.q3)}
                </text>
                <text x={centerX + whiskerWidth / 2 + 8} y={medianY + 4} fontSize="10" fill={color} fontWeight="bold">
                    {fmt(data.median)}
                </text>
                <text x={centerX + whiskerWidth / 2 + 8} y={q1Y + 4} fontSize="10" fill="#64748b">
                    {fmt(data.q1)}
                </text>
                <text x={centerX + whiskerWidth / 2 + 8} y={minY + 4} fontSize="10" fill="#64748b">
                    {fmt(data.min)}
                </text>
            </svg>
        </div>
    );
}

export function PromoDistributionChart({ globalFilters, showInterpret }: PromoDistributionChartProps) {
    const [selectedYear, setSelectedYear] = useState<number>(() => {
        if (globalFilters?.date_range?.start) {
            return parseInt(globalFilters.date_range.start.split('-')[0]);
        }
        return 2024;
    });

    // Generate mock data based on selected year
    const boxPlotData = useMemo<BoxPlotData[]>(() => {
        const baseValue = selectedYear === 2024 ? 55000 : 35000;
        return [
            { name: 'Non-Promo', ...generateMockStats(baseValue * 0.65, baseValue * 0.2) },
            { name: 'Promotion', ...generateMockStats(baseValue, baseValue * 0.25) }
        ];
    }, [selectedYear]);

    const fmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format;

    return (
        <Card className="h-full flex flex-col shadow-sm border-slate-200">
            <CardHeader className="pt-2 pb-1 px-6 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold text-slate-900">Sales Distribution</CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            Box plot comparing Promo vs Non-Promo sales distribution
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Legend */}
                        <div className="flex items-center gap-2 text-xs">
                            <div className="flex items-center gap-1 whitespace-nowrap">
                                <div className="w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-500 shrink-0" />
                                <span className="font-medium text-slate-600">Promotion</span>
                            </div>
                            <div className="flex items-center gap-1 whitespace-nowrap">
                                <div className="w-2.5 h-2.5 rounded-sm bg-slate-100 border border-slate-400 shrink-0" />
                                <span className="font-medium text-slate-600">Non-Promo</span>
                            </div>
                        </div>
                        {/* Year Selector */}
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                            {AVAILABLE_YEARS.map(year => (
                                <Button
                                    key={year}
                                    variant={selectedYear === year ? "secondary" : "ghost"}
                                    size="sm"
                                    className={`h-6 text-xs px-2 ${selectedYear === year ? 'bg-white shadow-sm' : ''}`}
                                    onClick={() => setSelectedYear(year)}
                                >
                                    {year}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 pt-0 pb-0 flex flex-col">
                <div className="h-[240px] flex">
                    <div className="h-full w-full flex">
                        {/* Chart Area */}
                        <div className="flex-1 flex items-start justify-center gap-8 pt-2">
                            {/* Non-Promo Box */}
                            <div className="flex flex-col items-center">
                                <BoxPlot
                                    data={boxPlotData[0]}
                                    color="#94a3b8"
                                    fillColor="#f1f5f9"
                                />
                                <span className="text-sm font-medium text-slate-600 mt-2">{boxPlotData[0].name}</span>
                            </div>

                            {/* Promotion Box */}
                            <div className="flex flex-col items-center">
                                <BoxPlot
                                    data={boxPlotData[1]}
                                    color="#22c55e"
                                    fillColor="#dcfce7"
                                />
                                <span className="text-sm font-medium text-slate-600 mt-2">{boxPlotData[1].name}</span>
                            </div>
                        </div>

                        {/* Stats Panel */}
                        <div className="w-44 border-l border-slate-100 pl-3 ml-2 flex flex-col pt-2 shrink-0">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Statistics</h4>

                            {/* Non-Promo Stats */}
                            <div className="mb-2">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                                    <span className="text-xs font-medium text-slate-600">Non-Promo</span>
                                </div>
                                <div className="space-y-0.5 pl-3.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Median</span>
                                        <span className="font-medium text-slate-700">{fmt(boxPlotData[0].median)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Range</span>
                                        <span className="text-slate-500 text-[11px]">{fmt(boxPlotData[0].min)} - {fmt(boxPlotData[0].max)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Promo Stats */}
                            <div className="mb-2">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                    <span className="text-xs font-medium text-slate-600">Promotion</span>
                                </div>
                                <div className="space-y-0.5 pl-3.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Median</span>
                                        <span className="font-medium text-slate-700">{fmt(boxPlotData[1].median)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Range</span>
                                        <span className="text-slate-500 text-[11px]">{fmt(boxPlotData[1].min)} - {fmt(boxPlotData[1].max)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Comparison - pushed to bottom */}
                            <div className="mt-auto pt-2 border-t border-slate-100">
                                <div className="text-xs text-slate-500 mb-0.5">Promo vs Non-Promo</div>
                                <div className="text-sm font-semibold text-green-600">
                                    +{((boxPlotData[1].median / boxPlotData[0].median - 1) * 100).toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex-1" />
                {showInterpret && (
                    <InterpretPanel insights={[
                        { emoji: '📦', text: 'Promo median +53.8% vs Non-Promo' },
                        { emoji: '📊', text: 'Non-Promo tighter (14.4K–31.2K) = predictable baseline' },
                        { emoji: '⚡', text: 'Promo variance wider — review top campaigns' },
                    ]} />
                )}
            </CardContent>
        </Card>
    );
}
