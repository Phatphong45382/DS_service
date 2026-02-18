'use client';

import { CheckCircle2, TrendingUp, Download, ArrowRight, BarChart3, Clock, Zap } from 'lucide-react';
import Link from 'next/link';
// import { TrendChart } from '@/components/planning/trend-chart';
import { downloadForecastResultFile } from '@/lib/api-client';
import PredictionChart from './prediction-chart';

interface RunResultsProps {
    data?: any;
}

export function RunResults({ data }: RunResultsProps) {
    return (
        <div className="space-y-6">
            {/* Success Banner */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-6 flex flex-col md:flex-row items-center justify-between shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-full shadow-sm border border-emerald-100">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-emerald-900">Forecast Generated Successfully</h2>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-emerald-700 text-sm font-medium">
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                ID: #REQ-2024-001
                            </span>
                            <span className="hidden md:inline text-emerald-300">•</span>
                            <span>Duration: 45s</span>
                            <span className="hidden md:inline text-emerald-300">•</span>
                            <span>Model: Time Series</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => downloadForecastResultFile(data?.filename)}
                        className="flex-1 md:flex-none justify-center px-4 py-2 bg-white border border-emerald-200 text-emerald-700 font-medium rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-2 shadow-sm text-sm"
                    >
                        <Download className="w-4 h-4" />
                        Download CSV
                    </button>
                    <Link
                        href="/scenario-planner"
                        className="flex-1 md:flex-none justify-center px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 duration-200 text-sm"
                    >
                        Go to Scenario Planner
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* Summary Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <BarChart3 className="w-16 h-16 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Forecast Volume</p>
                    <div className="mt-2 flex items-baseline gap-2 pb-2">
                        <h3 className="text-3xl font-bold text-slate-900">
                            {data?.rows ? data.rows.length.toLocaleString() : '1.2M'}
                        </h3>
                        {data?.rows ? (
                            <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">Rows</span>
                        ) : (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">+5.2%</span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 border-t border-slate-50 pt-2 mt-1">
                        {data?.filename ? `Source: ${data.filename}` : 'Aggregate for next 6 months vs baseline'}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Zap className="w-16 h-16 text-indigo-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Confidence Score</p>
                    <div className="mt-2 flex items-baseline gap-2 pb-2">
                        <h3 className="text-3xl font-bold text-slate-900">High</h3>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">92%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div className="bg-indigo-500 h-1.5 rounded-full w-[92%]"></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Clock className="w-16 h-16 text-amber-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Processing Time</p>
                    <div className="mt-2 flex items-baseline gap-2 pb-2">
                        <h3 className="text-3xl font-bold text-slate-900">0.45s</h3>
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Fast Mode</span>
                    </div>
                    <p className="text-xs text-slate-400 border-t border-slate-50 pt-2 mt-1">
                        Server response latency
                    </p>
                </div>
            </div>

            {/* Chart Preview Section */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Forecast Preview</h3>
                            <p className="text-sm text-slate-500">Quick view of generated results</p>
                        </div>
                    </div>
                    <button className="text-sm text-blue-600 font-medium hover:text-blue-700 hover:underline">
                        View Full Report
                    </button>
                </div>

                {/* Reusing existing TrendChart for preview, wrapped in a fixed height container */}
                <div className="w-full">
                    <PredictionChart data={data?.rows} filename={data?.filename} />
                </div>
            </div>
        </div>
    );
}
