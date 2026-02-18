'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ErrorHeatmapProps {
    title: string;
    type: 'customer' | 'product';
    data: any[];
    loading?: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Discrete Color Scale: Green -> Yellow -> Orange -> Red
const getColor = (wape: number) => {
    if (wape === 0) return 'bg-slate-50 text-slate-400'; // No Error
    if (wape < 10) return 'bg-emerald-100 text-emerald-700'; // 0-10%
    if (wape < 20) return 'bg-yellow-100 text-yellow-700'; // 10-20%
    if (wape < 30) return 'bg-orange-100 text-orange-700'; // 20-30%
    return 'bg-red-100 text-red-700'; // >30%
};

const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);

export function ErrorHeatmap({ title, type, data, loading }: ErrorHeatmapProps) {

    // Process data into grid format
    const processedData = useMemo(() => {
        if (!data || data.length === 0) return { rows: [], grid: [] };

        // 1. Get unique rows and calculate Avg WAPE for sorting
        const uniqueRows = Array.from(new Set(data.map(item => item.row)));

        const rowStats = uniqueRows.map(row => {
            const rowData = data.filter(d => d.row === row);
            const totalWape = rowData.reduce((sum, item) => sum + (item.wape || 0), 0);
            const avgWape = rowData.length > 0 ? totalWape / rowData.length : 0;
            return { row, avgWape };
        });

        // Sort by Avg WAPE Descending
        rowStats.sort((a, b) => b.avgWape - a.avgWape);
        const sortedRows = rowStats.map(s => s.row);

        // 2. Build grid
        const grid = sortedRows.map(rowLabel => {
            return MONTHS.map((month, index) => {
                // Find matching data point(s)
                // Find matching data point(s)
                const matches = data.filter(d => {
                    if (d.row !== rowLabel) return false; // Strict row check

                    const mStr = String(d.month);
                    // Handle "YYYY-MM" format (e.g. "2024-01")
                    if (mStr.includes('-')) {
                        const parts = mStr.split('-');
                        if (parts.length >= 2) {
                            return parseInt(parts[1], 10) === index + 1;
                        }
                    }
                    // Handle numeric "1", "01"
                    if (!isNaN(Number(mStr))) {
                        return Number(mStr) === index + 1;
                    }
                    // Handle "Jan", "Jan 23"
                    return mStr === month || mStr.startsWith(month + ' ');
                });

                let wape = 0;
                let actual = 0;
                let planned = 0;
                let error = 0;
                let hasData = false;

                if (matches.length > 0) {
                    hasData = true;
                    // Aggregate if multiple matches (e.g. multiple years for same month -> Seasonality)
                    // WAPE should be averaged (or weighted average, but simple average is fine for deep dive heatmap)
                    wape = matches.reduce((sum, item) => sum + (item.wape || 0), 0) / matches.length;

                    // Volumes should be summed
                    actual = matches.reduce((sum, item) => sum + (item.actual || 0), 0);
                    planned = matches.reduce((sum, item) => sum + (item.planned || 0), 0);
                    error = matches.reduce((sum, item) => sum + (item.error || 0), 0);
                }

                return {
                    month,
                    wape,
                    actual,
                    planned,
                    error,
                    hasData,
                    colorClass: hasData ? getColor(wape) : 'bg-slate-50'
                };
            });
        });

        return { rows: sortedRows, grid };
    }, [data]);

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                    <p className="text-sm text-slate-500 font-medium">Loading Heatmap...</p>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex items-center justify-center">
                <p className="text-slate-400">No data available for heatmap</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-auto flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-6">{title}</h3>

            <div className="flex-1 w-full">
                <div className="w-full">
                    {/* Header */}
                    <div className="flex mb-2">
                        <div className="w-24 shrink-0"></div> {/* Row Label Spacer */}
                        {MONTHS.map(month => (
                            <div key={month} className="flex-1 text-center text-xs font-semibold text-slate-500 truncate">
                                {month}
                            </div>
                        ))}
                    </div>

                    {/* Rows */}
                    <div className="space-y-2">
                        {processedData.rows.map((rowLabel, rowIndex) => (
                            <div key={rowLabel} className="flex items-center gap-1">
                                <div className="w-24 shrink-0 text-xs font-semibold text-slate-700 truncate" title={rowLabel}>
                                    {rowLabel}
                                </div>
                                {processedData.grid[rowIndex].map((cell, cellIndex) => (
                                    <div key={cellIndex} className="flex-1 aspect-[2/1]">
                                        {cell.hasData ? (
                                            <TooltipProvider delayDuration={0}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className={`w-full h-full rounded-md ${cell.colorClass} flex items-center justify-center cursor-pointer transition-transform hover:scale-105`}
                                                        >
                                                            <span className="text-[10px] font-bold">{cell.wape.toFixed(0)}%</span>
                                                        </motion.div>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="p-3 bg-slate-900 border-slate-800 text-white shadow-xl">
                                                        <div className="space-y-2">
                                                            <div className="border-b border-slate-700 pb-2 mb-2">
                                                                <p className="font-bold text-sm text-white">{rowLabel}</p>
                                                                <p className="text-xs text-slate-400">{cell.month}</p>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                                                <span className="text-slate-400">WAPE:</span>
                                                                <span className="font-mono font-bold text-right text-yellow-400">{cell.wape.toFixed(1)}%</span>

                                                                <span className="text-slate-400">Actual:</span>
                                                                <span className="font-mono text-right">{formatNumber(cell.actual)}</span>

                                                                <span className="text-slate-400">Forecast:</span>
                                                                <span className="font-mono text-right">{formatNumber(cell.planned)}</span>

                                                                <span className="text-slate-400">Error:</span>
                                                                <span className={`font-mono text-right ${cell.error > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                                    {cell.error > 0 ? '+' : ''}{formatNumber(cell.error)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : (
                                            <div className="w-full h-full bg-slate-50 rounded-md" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-end gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-200"></div>
                    <span>0-10%</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-200"></div>
                    <span>10-20%</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-100 border border-orange-200"></div>
                    <span>20-30%</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-100 border border-red-200"></div>
                    <span>&gt;30%</span>
                </div>
            </div>
        </div>
    );
}
