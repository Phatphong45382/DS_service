'use client';

import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { ArrowLeft, ArrowUpRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface TimeSeriesPoint {
    label: string;
    data: {
        year: number;
        month: number;
        qty: number;
    }[];
}

interface ActualSalesChartProps {
    data?: {
        year: number;
        month: number;
        qty: number;
    }[];
    breakdownData?: TimeSeriesPoint[];
    title?: string;
    onDrillDown?: (key: string) => void;
    onBack?: () => void;
    level?: number; // 0: Total, 1: Group, 2: Flavor
    isLoading?: boolean;
}

const COLORS = [
    '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#14b8a6'
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function VisitorsChart({
    data,
    breakdownData,
    title = "Actual Sales Overview",
    onDrillDown,
    onBack,
    level = 0,
    isLoading = false
}: ActualSalesChartProps) {

    // State for Seasonality View
    const [isSeasonalityView, setIsSeasonalityView] = useState(false);

    // Transform Data
    const chartData = useMemo(() => {
        let result: any[] = [];
        const seriesKeys: string[] = [];

        if (breakdownData && breakdownData.length > 0) {
            // Collect series keys
            breakdownData.forEach(series => {
                if (!seriesKeys.includes(series.label)) {
                    seriesKeys.push(series.label);
                }
            });

            if (isSeasonalityView) {
                // Seasonality View: Aggregate by Month (Average)
                const monthMap = new Map<number, { [key: string]: { sum: number, count: number } }>();

                // Initialize map for 12 months
                for (let m = 1; m <= 12; m++) {
                    monthMap.set(m, {});
                    seriesKeys.forEach(key => {
                        monthMap.get(m)![key] = { sum: 0, count: 0 };
                    });
                }

                breakdownData.forEach(series => {
                    series.data.forEach(p => {
                        const monthData = monthMap.get(p.month);
                        if (monthData) {
                            monthData[series.label].sum += p.qty;
                            monthData[series.label].count += 1;
                        }
                    });
                });

                // Flatten to chart data
                for (let m = 1; m <= 12; m++) {
                    const row: any = {
                        name: MONTH_NAMES[m - 1],
                        fullDate: `Month ${m}`
                    };
                    const monthData = monthMap.get(m)!;
                    seriesKeys.forEach(key => {
                        const { sum, count } = monthData[key];
                        row[key] = count > 0 ? sum / count : 0;
                    });
                    result.push(row);
                }

            } else {
                // Standard Time Series View
                // 1. Collect all dates
                const dateSet = new Set<string>();
                breakdownData.forEach(series => {
                    series.data.forEach(p => dateSet.add(`${p.year}-${p.month}`));
                });

                // 2. Sort dates
                const sortedDates = Array.from(dateSet).sort((a, b) => {
                    const [y1, m1] = a.split('-').map(Number);
                    const [y2, m2] = b.split('-').map(Number);
                    return (y1 * 100 + m1) - (y2 * 100 + m2);
                });

                // 3. Build rows
                result = sortedDates.map(dateStr => {
                    const [y, m] = dateStr.split('-').map(Number);
                    const row: any = {
                        name: `${MONTH_NAMES[m - 1]} ${y.toString().slice(-2)}`,
                        fullDate: dateStr
                    };

                    breakdownData.forEach(series => {
                        const point = series.data.find(d => d.year === y && d.month === m);
                        row[series.label] = point ? point.qty : 0;
                    });

                    return row;
                });
            }

        } else if (data) {
            // Total View
            seriesKeys.push("Actual Sales");

            if (isSeasonalityView) {
                // Seasonality View for Total
                const monthMap = new Map<number, { sum: number, count: number }>();
                for (let m = 1; m <= 12; m++) monthMap.set(m, { sum: 0, count: 0 });

                data.forEach(item => {
                    const current = monthMap.get(item.month)!;
                    current.sum += item.qty;
                    current.count += 1;
                });

                for (let m = 1; m <= 12; m++) {
                    const { sum, count } = monthMap.get(m)!;
                    const avgValue = count > 0 ? sum / count : 0;
                    result.push({
                        name: MONTH_NAMES[m - 1],
                        actual: avgValue,
                        "Actual Sales": avgValue,
                        fullDate: `Month ${m}`
                    });
                }

            } else {
                // Standard Time Series
                result = data.map(item => ({
                    name: `${MONTH_NAMES[item.month - 1]} ${item.year.toString().slice(-2)}`,
                    actual: item.qty,
                    fullDate: `${item.year}-${item.month}`,
                    "Actual Sales": item.qty
                }));
            }
        }
        return result;
    }, [data, breakdownData, isSeasonalityView]);

    const seriesKeys = useMemo(() => {
        const keys: string[] = [];
        if (breakdownData && breakdownData.length > 0) {
            breakdownData.forEach(series => {
                if (!keys.includes(series.label)) keys.push(series.label);
            });
        } else if (data) {
            keys.push("Actual Sales");
        }
        return keys;
    }, [breakdownData, data]);

    const handleClick = (data: any) => {
        if (level < 3 && onDrillDown && data && data.activeTooltipIndex !== undefined) {
            // ...
        }
    };

    // Generate Stable Color Map
    const colorMap: Record<string, string> = {};
    seriesKeys.forEach((key, index) => {
        colorMap[key] = COLORS[index % COLORS.length];
    });

    return (
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100 h-full flex flex-col relative">
            {isLoading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {level > 0 && (
                        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 -ml-2 text-slate-500 hover:text-slate-900">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                        <p className="text-xs text-slate-500">
                            {level === 0 ? "All Products" : level === 1 ? "By Product Group" : level === 2 ? "By Flavor" : "By Size"}
                        </p>
                    </div>
                </div>

                {level < 3 && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant={isSeasonalityView ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setIsSeasonalityView(!isSeasonalityView)}
                            className="text-xs gap-1"
                        >
                            <Calendar className="h-3 w-3" />
                            {isSeasonalityView ? "Month Agg" : "Timeline"}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDrillDown && onDrillDown('next')}
                            className="text-xs gap-1"
                        >
                            Drill Down <ArrowUpRight className="h-3 w-3" />
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            {seriesKeys.map((key) => (
                                <linearGradient key={key} id={`color-${key.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colorMap[key]} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={colorMap[key]} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                            dataKey="name"
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            axisLine={{ stroke: '#e2e8f0' }}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            axisLine={{ stroke: '#e2e8f0' }}
                            tickFormatter={(value) => new Intl.NumberFormat('en-US', {
                                notation: "compact",
                                maximumFractionDigits: 1
                            }).format(value)}
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    // Sort payload by value descending to match visual expectation
                                    const sortedPayload = [...payload].sort((a: any, b: any) => b.value - a.value);

                                    return (
                                        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg outline-none">
                                            <p className="text-sm font-semibold text-slate-900 mb-2">{label}</p>
                                            {sortedPayload.map((entry: any, index: number) => {
                                                const key = entry.name;
                                                const value = entry.value;
                                                const color = colorMap[key] || entry.color; // Ensure color match

                                                // Calculate Spike logic
                                                const values = chartData.map(d => d[key] as number).filter(v => typeof v === 'number');
                                                const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
                                                const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
                                                const isSpike = (value - mean) > (1.5 * stdDev);

                                                return (
                                                    <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                                                        <div
                                                            className="w-2 h-2 rounded-full"
                                                            style={{ backgroundColor: color }}
                                                        />
                                                        <span className="text-xs text-slate-500">{key}:</span>
                                                        <span className="text-xs font-medium text-slate-900 ml-auto">
                                                            {new Intl.NumberFormat('en-US').format(value)}
                                                        </span>
                                                        {isSpike && (
                                                            <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                                                                Spike
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        {(Legend as any) && (
                            <Legend
                                wrapperStyle={{ paddingTop: '10px' }}
                                iconType="circle"
                                // @ts-ignore
                                payload={seriesKeys.map((key) => ({
                                    value: key,
                                    type: 'circle',
                                    id: key,
                                    color: colorMap[key]
                                }))}
                                onClick={(e: any) => {
                                    // Allow clicking legend to drill down specific series
                                    if (level < 3 && onDrillDown && e && e.value) {
                                        onDrillDown(String(e.value));
                                    }
                                }}
                                formatter={(value: any) => <span className="text-xs font-medium text-slate-600 cursor-pointer hover:text-blue-600 hover:underline">{value}</span>}
                            />
                        )}
                        {seriesKeys.map((key) => (
                            <Area
                                key={key}
                                type="monotone" // Smoother lines
                                isAnimationActive={false}
                                dataKey={key}
                                // Removed stackId="1" to unstack
                                stroke={colorMap[key]}
                                strokeWidth={2}
                                fill={`url(#color-${key.replace(/\s+/g, '-')})`}
                                fillOpacity={0.1} // Reduced opacity for overlapping
                                name={key}
                                activeDot={{ r: 4, strokeWidth: 0 }}
                                dot={(props: any) => {
                                    const { cx, cy, payload, index: dataIndex } = props;
                                    const value = payload[key];
                                    const color = colorMap[key];

                                    // Calculate stats for this series (memoized if possible, but simple calc here is fine for small data)
                                    const values = chartData.map(d => d[key] as number).filter(v => typeof v === 'number');
                                    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
                                    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

                                    // Detect Spike (Z-Score > 1.5)
                                    const isSpike = (value - mean) > (1.5 * stdDev);

                                    if (isSpike) {
                                        return (
                                            <circle
                                                key={`dot-${key}-${dataIndex}`}
                                                cx={cx}
                                                cy={cy}
                                                r={5} // Slightly larger for emphasis
                                                fill="#ef4444"
                                                stroke="white"
                                                strokeWidth={2}
                                            />
                                        );
                                    }

                                    // Default Dot
                                    return (
                                        <circle
                                            key={`dot-${key}-${dataIndex}`}
                                            cx={cx}
                                            cy={cy}
                                            r={3}
                                            stroke={color}
                                            strokeWidth={2}
                                            fill="white"
                                        />
                                    );
                                }}
                                style={{ cursor: level < 3 ? 'pointer' : 'default' }}
                                onClick={(data: any) => {
                                    if (level < 3 && onDrillDown) {
                                        onDrillDown(key);
                                    }
                                }}
                            />
                        ))}

                        {/* Average Line */}
                        {chartData.length > 0 && (
                            <ReferenceLine
                                y={
                                    level === 0
                                        ? chartData.reduce((sum, item) => sum + (item.actual || 0), 0) / chartData.length
                                        : chartData.reduce((sum, item) => {
                                            const rowSum = seriesKeys.reduce((s, k) => s + (item[k] || 0), 0);
                                            return sum + rowSum;
                                        }, 0) / (chartData.length * seriesKeys.length)
                                }
                                stroke="#ef4444"
                                strokeDasharray="3 3"
                                label={{
                                    position: 'insideBottomRight',
                                    value: level === 0 ? 'Avg Total' : 'Avg',
                                    fill: '#ef4444',
                                    fontSize: 10,
                                    dy: -10
                                }}
                            />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
