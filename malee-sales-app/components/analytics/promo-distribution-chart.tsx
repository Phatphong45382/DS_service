'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InterpretPanel } from './interpret-panel';
import type { BoxStats } from '@/lib/api-client';

interface PromoDistributionChartProps {
    data?: BoxStats[] | null;
    showInterpret?: boolean;
}

type BoxPlotData = BoxStats;

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

const fmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format;

function insightsFor(nonPromo: BoxStats, promo: BoxStats) {
    const lift = nonPromo.median > 0 ? (promo.median / nonPromo.median - 1) * 100 : 0;
    const spread = (b: BoxStats) => (b.median > 0 ? (b.q3 - b.q1) / b.median : 0);
    const promoWider = spread(promo) > spread(nonPromo);
    return [
        { emoji: '📦', text: `Promo median ${lift >= 0 ? '+' : ''}${lift.toFixed(1)}% vs Non-Promo (${promo.count.toLocaleString()} vs ${nonPromo.count.toLocaleString()} rows)` },
        { emoji: '📊', text: `Non-Promo middle half ${fmt(nonPromo.q1)}–${fmt(nonPromo.q3)}${promoWider ? ' = the tighter, more predictable baseline' : ''}` },
        { emoji: '⚡', text: promoWider ? `Promo middle half ${fmt(promo.q1)}–${fmt(promo.q3)} is wider — review the campaigns behind the tail` : `Promo middle half ${fmt(promo.q1)}–${fmt(promo.q3)} is no wider than baseline` },
    ];
}

export function PromoDistributionChart({ data, showInterpret }: PromoDistributionChartProps) {
    const nonPromo = data?.find(b => b.name === 'Non-Promo');
    const promo = data?.find(b => b.name === 'Promotion');
    const ready = nonPromo && promo && nonPromo.count + promo.count > 0;

    return (
        <Card className="h-full flex flex-col shadow-sm border-slate-200">
            <CardHeader className="pt-2 pb-1 px-6 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold text-slate-900">Sales Distribution</CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            Box plot of monthly Actual per SKU and customer, Promo vs Non-Promo, over the selected range
                        </CardDescription>
                    </div>
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
                </div>
            </CardHeader>
            <CardContent className="flex-1 pt-0 pb-0 flex flex-col">
                {!ready ? (
                    <div className="h-[240px] flex items-center justify-center text-sm text-slate-400">
                        {data ? 'No rows match the current filters' : 'Loading…'}
                    </div>
                ) : (
                    <div className="h-[240px] flex">
                        <div className="h-full w-full flex">
                            <div className="flex-1 flex items-start justify-center gap-8 pt-2">
                                {[[nonPromo, '#94a3b8', '#f1f5f9'], [promo, '#22c55e', '#dcfce7']].map(([box, color, fill]) => (
                                    <div key={(box as BoxStats).name} className="flex flex-col items-center">
                                        <BoxPlot data={box as BoxStats} color={color as string} fillColor={fill as string} />
                                        <span className="text-sm font-medium text-slate-600 mt-2">{(box as BoxStats).name}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="w-44 border-l border-slate-100 pl-3 ml-2 flex flex-col pt-2 shrink-0">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Statistics</h4>
                                {[[nonPromo, 'bg-slate-400'], [promo, 'bg-green-500']].map(([box, dot]) => (
                                    <div key={(box as BoxStats).name} className="mb-2">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                                            <span className="text-xs font-medium text-slate-600">{(box as BoxStats).name}</span>
                                        </div>
                                        <div className="space-y-0.5 pl-3.5">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400">Median</span>
                                                <span className="font-medium text-slate-700">{fmt((box as BoxStats).median)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400">Range</span>
                                                <span className="text-slate-500 text-[11px]">{fmt((box as BoxStats).min)} - {fmt((box as BoxStats).max)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div className="mt-auto pt-2 border-t border-slate-100">
                                    <div className="text-xs text-slate-500 mb-0.5">Promo vs Non-Promo median</div>
                                    <div className={`text-sm font-semibold ${promo.median >= nonPromo.median ? 'text-green-600' : 'text-red-600'}`}>
                                        {nonPromo.median > 0 ? `${promo.median >= nonPromo.median ? '+' : ''}${((promo.median / nonPromo.median - 1) * 100).toFixed(1)}%` : '—'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex-1" />
                {showInterpret && ready && <InterpretPanel insights={insightsFor(nonPromo, promo)} />}
            </CardContent>
        </Card>
    );
}
