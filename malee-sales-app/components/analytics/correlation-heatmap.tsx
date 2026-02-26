'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InterpretPanel } from './interpret-panel';

interface CorrelationHeatmapProps {
    globalFilters?: any;
    showInterpret?: boolean;
}

const VARIABLES = ['Discount', 'Promo Days', 'Sales'];
const SHORT_NAMES = ['Discount', 'Promo', 'Sales'];

// Generate mock correlation matrix
function generateMockCorrelationMatrix(): number[][] {
    return [
        [1.00, 0.65, -0.45],
        [0.65, 1.00, 0.72],
        [-0.45, 0.72, 1.00]
    ];
}

export function CorrelationHeatmap({ globalFilters, showInterpret }: CorrelationHeatmapProps) {
    const correlationMatrix = useMemo(() => {
        return generateMockCorrelationMatrix();
    }, []);

    const getColor = (value: number): string => {
        if (value > 0) {
            if (value >= 0.7) return 'rgb(30, 64, 175)';
            if (value >= 0.4) return 'rgb(59, 130, 246)';
            if (value >= 0.1) return 'rgb(147, 197, 253)';
            return 'rgb(219, 234, 254)';
        } else if (value < 0) {
            if (value <= -0.7) return 'rgb(185, 28, 28)';
            if (value <= -0.4) return 'rgb(239, 68, 68)';
            if (value <= -0.1) return 'rgb(252, 165, 165)';
            return 'rgb(254, 226, 226)';
        }
        return 'rgb(248, 250, 252)';
    };

    const getTextColor = (value: number): string => {
        if (Math.abs(value) >= 0.4) return 'text-white';
        return 'text-slate-700';
    };

    const getCorrelationLabel = (value: number): string => {
        const abs = Math.abs(value);
        if (abs >= 0.7) return value > 0 ? 'Strong' : 'Strong';
        if (abs >= 0.4) return 'Moderate';
        if (abs >= 0.1) return 'Weak';
        return 'None';
    };

    return (
        <Card className="h-full flex flex-col shadow-sm border-slate-200">
            <CardHeader className="pt-2 pb-1 px-6 shrink-0">
                <div>
                    <CardTitle className="text-base font-semibold text-slate-900">Correlation Matrix</CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                        Discount, Promo Days, and Sales
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-1 pt-0 pb-0 px-0 flex flex-col">
                {/* Heatmap Grid */}
                <div className="flex flex-col px-4 pt-0 pb-4 min-w-0">
                    <div className="flex flex-col justify-start pt-1">
                        {/* Y-labels + Grid wrapper */}
                        <div className="flex items-start gap-2 w-full">
                            {/* Y-axis labels */}
                            <div className="flex flex-col w-14 shrink-0">
                                {/* spacer for X-axis header */}
                                <div className="h-7" />
                                {SHORT_NAMES.map((v, i) => (
                                    <div key={i} className="h-12 flex items-center justify-end pr-2">
                                        <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">{v}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Main grid + X-axis labels */}
                            <div className="flex-1 flex flex-col gap-1">
                                {/* X-axis labels */}
                                <div className="grid grid-cols-3 gap-1">
                                    {SHORT_NAMES.map((v, i) => (
                                        <div key={i} className="flex items-center justify-center">
                                            <span className="text-[11px] font-medium text-slate-500">{v}</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Cells */}
                                <div className="grid grid-cols-3 gap-1">
                                    {correlationMatrix.map((row, i) =>
                                        row.map((value, j) => {
                                            const isDiagonal = i === j;
                                            return (
                                                <div
                                                    key={`${i}-${j}`}
                                                    className={`
                                                    h-12 rounded-lg flex flex-col items-center justify-center
                                                    transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer
                                                    ${isDiagonal ? 'ring-1 ring-white/40' : ''}
                                                `}
                                                    style={{ backgroundColor: getColor(value) }}
                                                    title={`${VARIABLES[i]} vs ${VARIABLES[j]}: ${value.toFixed(2)}`}
                                                >
                                                    <span className={`text-sm font-bold ${getTextColor(value)}`}>
                                                        {value.toFixed(2)}
                                                    </span>
                                                    {!isDiagonal && (
                                                        <span className={`text-[9px] ${getTextColor(value)} opacity-90 mt-0.5`}>
                                                            {getCorrelationLabel(value)}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Compact Legend */}
                    <div className="mt-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-[9px] text-slate-400">-1</span>
                            <div className="flex gap-px">
                                <div className="w-3 h-3 rounded-l-sm bg-red-700"></div>
                                <div className="w-3 h-3 bg-red-500"></div>
                                <div className="w-3 h-3 bg-red-300"></div>
                                <div className="w-3 h-3 bg-red-100"></div>
                                <div className="w-3 h-3 bg-slate-100 border border-slate-200"></div>
                                <div className="w-3 h-3 bg-blue-100"></div>
                                <div className="w-3 h-3 bg-blue-300"></div>
                                <div className="w-3 h-3 bg-blue-500"></div>
                                <div className="w-3 h-3 rounded-r-sm bg-blue-700"></div>
                            </div>
                            <span className="text-[9px] text-slate-400">+1</span>
                        </div>
                        <div className="flex justify-center gap-4 mt-1 text-[9px] text-slate-500">
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                Negative
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Positive
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex-1" />
                {showInterpret && (
                    <InterpretPanel insights={[
                        { emoji: '🔗', text: 'Promo Days → Sales: r=0.72 (strong)' },
                        { emoji: '💸', text: 'Discount → Sales: r=−0.45 (discounting alone ≠ volume)' },
                        { emoji: '✅', text: 'Lever: increase Promo Days, not just price cuts' },
                    ]} />
                )}
            </CardContent>
        </Card >
    );
}
