'use client';

import { alerts, formatMonth } from '@/lib/planning-data';
import { AlertTriangle, TrendingUp, TrendingDown, Percent, Info, ChevronRight, Activity, Search, Filter, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export function AlertsFeed() {
    const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'demand_spike': return <TrendingUp className="w-5 h-5 text-rose-600" />;
            case 'demand_drop': return <TrendingDown className="w-5 h-5 text-amber-600" />;
            case 'promo_conflict': return <Percent className="w-5 h-5 text-purple-600" />;
            case 'forecast_drift': return <Activity className="w-5 h-5 text-blue-600" />;
            default: return <Info className="w-5 h-5 text-slate-600" />;
        }
    };

    const getSeverityConfig = (severity: string) => {
        switch (severity) {
            case 'high': return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' };
            case 'medium': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
            case 'low': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
            default: return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' };
        }
    };

    const selectedAlertData = alerts.find(a => a.id === selectedAlert);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full font-sans">
            {/* Feed List (Left Pane) */}
            <div className="lg:col-span-5 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col h-[600px] overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-slate-500" />
                            Alerts Feed
                        </h3>
                        <span className="flex items-center justify-center bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
                            {alerts.length} New
                        </span>
                    </div>
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search alerts..."
                            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 p-2 space-y-2 bg-slate-50/30">
                    {alerts.map((alert) => {
                        const style = getSeverityConfig(alert.severity);
                        return (
                            <div
                                key={alert.id}
                                onClick={() => setSelectedAlert(alert.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm group relative ${selectedAlert === alert.id
                                    ? 'border-blue-500 bg-white ring-1 ring-blue-100 shadow-md z-10'
                                    : 'border-slate-200 bg-white hover:border-blue-300'
                                    }`}
                            >
                                <div className="absolute top-3 right-3 text-xs text-slate-400 font-medium group-hover:text-slate-600 transition-colors">
                                    {formatMonth(alert.date)}
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className={`mt-1 w-2 h-2 rounded-full ${style.dot} shrink-0`} />
                                    <div className="flex-1 pr-12">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${style.bg} ${style.text} ${style.border}`}>
                                                {alert.severity}
                                            </span>
                                            <h4 className="font-semibold text-slate-900 text-sm truncate">
                                                {alert.flavor} {alert.size}ml
                                            </h4>
                                        </div>
                                        <p className="text-sm text-slate-600 line-clamp-2 leading-snug">
                                            {alert.message}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Detail Pane (Right Pane) */}
            <div className="lg:col-span-7 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col h-[600px] overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-900">Analysis & Action</h3>
                    <div className="flex gap-2">
                        <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {selectedAlertData ? (
                    <div className="p-6 flex-1 overflow-y-auto">
                        <div className="flex items-start gap-4 mb-6">
                            <div className={`p-3 rounded-xl border ${getSeverityConfig(selectedAlertData.severity).bg} ${getSeverityConfig(selectedAlertData.severity).border}`}>
                                {getAlertIcon(selectedAlertData.alert_type)}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-1">
                                    {selectedAlertData.flavor} {selectedAlertData.size}ml
                                </h2>
                                <p className="text-slate-600 text-sm">
                                    Issue detected on {formatMonth(selectedAlertData.date)} • <span className="underline decoration-slate-300 underline-offset-4 decoration-dotted">View History</span>
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mb-6">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Description</h4>
                            <p className="text-sm text-slate-800 leading-relaxed">
                                {selectedAlertData.message}
                            </p>
                        </div>

                        <div className="mb-6">
                            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                                Recommended Actions
                            </h4>
                            <div className="space-y-2">
                                {selectedAlertData.recommended_action.map((action, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-emerald-200 hover:shadow-sm transition-all group">
                                        <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <span className="text-xs font-bold group-hover:opacity-0 absolute">{idx + 1}</span>
                                        </div>
                                        <p className="text-sm text-slate-700">{action}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                                Impact Drivers
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 border border-slate-200 rounded-lg">
                                    <p className="text-xs text-slate-500 font-medium mb-1">Competitor Price</p>
                                    <div className="flex items-end gap-2">
                                        <span className="text-lg font-bold text-rose-600">-15%</span>
                                        <span className="text-xs text-slate-400 mb-1">Significant drop</span>
                                    </div>
                                </div>
                                <div className="p-4 border border-slate-200 rounded-lg">
                                    <p className="text-xs text-slate-500 font-medium mb-1">Social Sentiment</p>
                                    <div className="flex items-end gap-2">
                                        <span className="text-lg font-bold text-emerald-600">+24</span>
                                        <span className="text-xs text-slate-400 mb-1">Positive trend</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/30">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200">
                            <Search className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-600 mb-1">No Alert Selected</h3>
                        <p className="text-sm text-slate-500 max-w-xs mx-auto">
                            Select an item from the feed on the left to view detailed analysis and recommended actions.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
