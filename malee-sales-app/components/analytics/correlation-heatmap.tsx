'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InterpretPanel } from './interpret-panel';

interface CorrelationHeatmapProps {
    data?: { variables: string[]; matrix: number[][] } | null;
    showInterpret?: boolean;
}

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

const getTextColor = (value: number): string => (Math.abs(value) >= 0.4 ? 'text-white' : 'text-slate-700');

const strength = (value: number): string => {
    const abs = Math.abs(value);
    if (abs >= 0.7) return 'strong';
    if (abs >= 0.4) return 'moderate';
    if (abs >= 0.1) return 'weak';
    return 'none';
};

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function insightsFor(variables: string[], matrix: number[][]) {
    const sales = variables.length - 1; // Actual is the last variable
    const r = (i: number) => matrix[i][sales];
    const lines = variables.slice(0, sales).map((v, i) => ({
        emoji: i === 0 ? '💸' : '🔗',
        text: `${v} → Actual: r=${r(i).toFixed(2)} (${strength(r(i))})`,
    }));
    const best = variables.slice(0, sales).reduce((b, _, i) => (Math.abs(r(i)) > Math.abs(r(b)) ? i : b), 0);
    lines.push({
        emoji: '✅',
        text: strength(r(best)) === 'none'
            ? 'Neither lever moves Actual within these filters'
            : `Lever: ${variables[best]} tracks Actual ${r(best) > 0 ? 'positively' : 'negatively'} (${strength(r(best))})`,
    });
    return lines;
}

export function CorrelationHeatmap({ data, showInterpret }: CorrelationHeatmapProps) {
    const variables = data?.variables ?? [];
    const matrix = data?.matrix ?? [];
    const ready = variables.length > 0 && matrix.length === variables.length;

    return (
        <Card className="h-full flex flex-col shadow-sm border-slate-200">
            <CardHeader className="pt-2 pb-1 px-6 shrink-0">
                <div>
                    <CardTitle className="text-base font-semibold text-slate-900">Correlation Matrix</CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                        Pearson r across the rows in range: Discount %, Promo Days and Actual
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-1 pt-0 pb-0 px-0 flex flex-col">
                {!ready ? (
                    <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">
                        {data ? 'No rows match the current filters' : 'Loading…'}
                    </div>
                ) : (
                    <div className="flex flex-col px-4 pt-0 pb-4 min-w-0">
                        <div className="flex items-start gap-2 w-full pt-1">
                            <div className="flex flex-col w-14 shrink-0">
                                <div className="h-7" />
                                {variables.map((v) => (
                                    <div key={v} className="h-12 flex items-center justify-end pr-2">
                                        <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">{v}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex-1 flex flex-col gap-1">
                                <div className="grid grid-cols-3 gap-1">
                                    {variables.map((v) => (
                                        <div key={v} className="flex items-center justify-center">
                                            <span className="text-[11px] font-medium text-slate-500">{v}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                    {matrix.map((row, i) =>
                                        row.map((value, j) => (
                                            <div
                                                key={`${i}-${j}`}
                                                className={`h-12 rounded-lg flex flex-col items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer ${i === j ? 'ring-1 ring-white/40' : ''}`}
                                                style={{ backgroundColor: getColor(value) }}
                                                title={`${variables[i]} vs ${variables[j]}: ${value.toFixed(2)}`}
                                            >
                                                <span className={`text-sm font-bold ${getTextColor(value)}`}>{value.toFixed(2)}</span>
                                                {i !== j && (
                                                    <span className={`text-[9px] ${getTextColor(value)} opacity-90 mt-0.5`}>{capital(strength(value))}</span>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

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
                                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>Negative</span>
                                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Positive</span>
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex-1" />
                {showInterpret && ready && <InterpretPanel insights={insightsFor(variables, matrix)} />}
            </CardContent>
        </Card>
    );
}
