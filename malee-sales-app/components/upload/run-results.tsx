'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Download } from 'lucide-react';
import type { RunRecord } from '@/types/runs';
import { formatDuration, formatMonth, formatMonthShort, toCsv } from '@/lib/forecast-utils';

interface RunResultsProps {
    data?: { run: RunRecord; rows: { date: string; sales: number | null; forecast: number | null }[]; filename?: string } | null;
    onRestart?: () => void;
}

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format;

/** Direction B: the number the Run produced leads, accuracy beside it, one chart, three ways onward. Fits one screen. */
export function RunResults({ data, onRestart }: RunResultsProps) {
    const run = data?.run;
    const rows = useMemo(() => data?.rows ?? [], [data]);

    const facts = useMemo(() => {
        const forecastRows = rows.filter(r => r.forecast != null);
        const total = forecastRows.reduce((s, r) => s + (r.forecast ?? 0), 0);
        const bySales = new Map(rows.filter(r => r.sales != null).map(r => [r.date, r.sales as number]));
        // the same months a year earlier, only when every one of them is in the history
        // the history keys the same shape the forecast uses ("2026-09-01"), so only the year moves
        const prior = forecastRows.map(r => bySales.get(`${Number(r.date.slice(0, 4)) - 1}-${r.date.slice(5)}`));
        const yoy = prior.length && prior.every(v => v != null) ? total / prior.reduce((s, v) => s + (v as number), 0) - 1 : null;
        const first = forecastRows[0]?.date, last = forecastRows[forecastRows.length - 1]?.date;
        return { total, yoy, first, last };
    }, [rows]);

    const chartData = useMemo(() => rows.map(r => ({
        month: formatMonthShort(r.date),
        actual: r.sales,
        forecast: r.forecast,
    })), [rows]);

    const handleDownload = () => {
        const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `${run?.run_id ?? 'forecast'}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (!run) return null;

    if (run.status !== 'success') {
        const problems = run.validation.filter(v => v.status !== 'pass');
        return (
            <div className="flex flex-col gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-6">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-rose-600" />
                    <h2 className="text-lg font-bold text-rose-900">The Run did not pass validation</h2>
                </div>
                <ul className="space-y-1.5 text-sm text-rose-800">
                    {problems.map(p => <li key={p.rule}><span className="font-semibold">{p.rule}:</span> {p.message}</li>)}
                </ul>
                <div>
                    <button type="button" onClick={onRestart} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">Fix the file and start again</button>
                </div>
            </div>
        );
    }

    const bias = run.bias ?? 0;

    return (
        <div className="flex flex-col gap-4">
            {/* The headline: what the Run produced */}
            <div className="flex flex-col gap-5 rounded-2xl bg-slate-900 px-7 py-6 text-white sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <p className="text-sm text-slate-400">
                        Forecast for {facts.first && facts.last ? `${formatMonth(facts.first)} – ${formatMonth(facts.last)}` : `${run.horizon_months} months`}, {run.product_count} products
                    </p>
                    <p className="mt-1.5 text-5xl font-extrabold leading-none tracking-tight">
                        {compact(facts.total)} <span className="text-xl font-semibold text-slate-300">units</span>
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                        {facts.yoy != null && <>{facts.yoy >= 0 ? '+' : ''}{(facts.yoy * 100).toFixed(1)}% on the same months last year · </>}
                        saved as <span className="font-mono text-white">{run.run_id}</span>
                    </p>
                </div>
                <div className="flex shrink-0 gap-8">
                    <div>
                        <p className="text-xs text-slate-400">WAPE</p>
                        <p className="text-3xl font-extrabold">{run.wape != null ? `${run.wape.toFixed(1)}%` : '—'}</p>
                        <p className="text-[11px] text-slate-400">{run.accuracy_basis?.startsWith('holdout') ? 'holdout, unseen months' : 'in-sample backtest'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Bias</p>
                        <p className={`text-3xl font-extrabold ${Math.abs(bias) < 2 ? 'text-white' : 'text-amber-400'}`}>{run.bias != null ? `${bias >= 0 ? '+' : ''}${bias.toFixed(1)}%` : '—'}</p>
                        <p className="text-[11px] text-slate-400">{bias >= 0 ? 'over-forecast' : 'under-forecast'}</p>
                    </div>
                </div>
            </div>

            {/* One chart, no chrome around it */}
            <div className="rounded-2xl border border-slate-200 bg-white px-5 pb-3 pt-4">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Actual and forecast, all products</h3>
                    <p className="text-xs text-slate-500">monthly units · {run.model_name} {run.model_version} · {formatDuration(run.duration_sec)}</p>
                </div>
                <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => compact(v)} width={48} />
                            <Tooltip formatter={(v: any, name: any) => [Number(v).toLocaleString(), name === 'actual' ? 'Actual' : 'Forecast']} labelStyle={{ fontWeight: 600 }} contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }} />
                            <Area type="monotone" dataKey="forecast" name="forecast" stroke="none" fill="#dbeafe" fillOpacity={0.8} connectNulls={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="actual" name="actual" stroke="#0f172a" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="forecast" name="forecast" stroke="#2563eb" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Three ways onward */}
            <div className="grid gap-3 sm:grid-cols-3">
                <Link href="/forecast" className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition-colors hover:border-blue-300 hover:bg-blue-50/40">
                    <p className="text-sm font-bold text-blue-700">Open in Forecast</p>
                    <p className="mt-0.5 text-xs text-slate-500">Per SKU, with the P10–P90 band and the Plan</p>
                </Link>
                <Link href={`/runs/compare?b=${run.run_id}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition-colors hover:border-blue-300 hover:bg-blue-50/40">
                    <p className="text-sm font-bold text-blue-700">Compare with the previous Run</p>
                    <p className="mt-0.5 text-xs text-slate-500">Side by side, month by month</p>
                </Link>
                <Link href="/scenario-planner" className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition-colors hover:border-blue-300 hover:bg-blue-50/40">
                    <p className="text-sm font-bold text-blue-700">Plan a scenario</p>
                    <p className="mt-0.5 text-xs text-slate-500">Promotions and uplift on this forecast</p>
                </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <button type="button" onClick={handleDownload} className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900">
                    <Download className="h-4 w-4" />
                    Download CSV
                </button>
                <Link href={`/runs/${run.run_id}`} className="font-semibold text-slate-700 hover:text-slate-900">See it in Runs</Link>
                {onRestart && (
                    <button type="button" onClick={onRestart} className="ml-auto text-slate-500 hover:text-slate-800">Start another</button>
                )}
            </div>
        </div>
    );
}
