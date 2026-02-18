'use client';

import { Settings, Play, Loader2, Sparkles, Filter, CalendarClock, Database, Layers, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

interface ForecastConfigProps {
    onRun: () => void;
    isLoading: boolean;
    uploadResult?: any;
}

export function ForecastConfig({ onRun, isLoading, uploadResult }: ForecastConfigProps) {
    const [config, setConfig] = useState({
        horizon: 6,
        model: 'ensemble',
        includePromo: true,
        historicalWindow: 24,
        confidenceLevel: 95
    });

    const [progress, setProgress] = useState(0);

    // Simulate progress when loading
    useEffect(() => {
        if (isLoading) {
            setProgress(0);
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 95) return prev;
                    // Non-linear progress simulation
                    const increment = Math.random() * (prev < 30 ? 5 : prev < 70 ? 2 : 0.5);
                    return Math.min(prev + increment, 99);
                });
            }, 200);

            return () => clearInterval(interval);
        } else {
            setProgress(0);
        }
    }, [isLoading]);

    // Log upload result for debugging
    useEffect(() => {
        if (uploadResult) {
            console.log('📁 Uploaded file info:', uploadResult);
        }
    }, [uploadResult]);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 h-full flex flex-col max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm border border-indigo-100">
                    <Sparkles className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Configure Forecast Model</h2>
                    <p className="text-sm text-slate-500">Set parameters for the AI prediction engine</p>
                </div>
            </div>

            <div className="space-y-8 flex-1">
                {/* Forecast Horizon */}
                <div className="space-y-4">
                    <Label className="flex items-center gap-2 text-slate-700">
                        <CalendarClock className="w-4 h-4 text-slate-400" />
                        Forecast Horizon (Months)
                    </Label>
                    <div className="grid grid-cols-3 gap-4">
                        {[3, 6, 12].map(m => (
                            <button
                                key={m}
                                onClick={() => setConfig({ ...config, horizon: m })}
                                disabled={isLoading}
                                className={`
                                    relative py-3 px-4 rounded-xl border text-sm font-medium transition-all duration-200
                                    ${config.horizon === m
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                    }
                                `}
                            >
                                {config.horizon === m && (
                                    <div className="absolute top-2 right-2 text-indigo-600">
                                        <Check className="w-3 h-3" />
                                    </div>
                                )}
                                <span className="text-lg font-bold block mb-1">{m}</span>
                                <span className="text-xs opacity-80">Months Ahead</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Model Strategy */}
                <div className="space-y-4">
                    <Label className="flex items-center gap-2 text-slate-700">
                        <Database className="w-4 h-4 text-slate-400" />
                        Model Strategy
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div
                            onClick={() => !isLoading && setConfig({ ...config, model: 'ensemble' })}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${config.model === 'ensemble'
                                ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-200'
                                : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-slate-900">Time Series Model</span>
                                {config.model === 'ensemble' && <Check className="w-4 h-4 text-indigo-600" />}
                            </div>
                            <p className="text-xs text-slate-500">Baseline model used for testing Dataiku integration (read & plot graphs).</p>
                        </div>
                        <div
                            onClick={() => !isLoading && setConfig({ ...config, model: 'xgboost' })}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${config.model === 'xgboost'
                                ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-200'
                                : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-slate-900">XGBoost</span>
                                {config.model === 'xgboost' && <Check className="w-4 h-4 text-indigo-600" />}
                            </div>
                            <p className="text-xs text-slate-500">Gradient boosting. Best for capturing complex non-linear patterns.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Promo Option */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base font-medium text-slate-900">Promotions</Label>
                            <p className="text-xs text-slate-500">Include promo effects</p>
                        </div>
                        <Switch
                            checked={config.includePromo}
                            onCheckedChange={(checked) => setConfig({ ...config, includePromo: checked })}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Confidence Interval */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-slate-900">Confidence Level</Label>
                            <span className="text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                                {config.confidenceLevel}%
                            </span>
                        </div>
                        <Slider
                            defaultValue={[config.confidenceLevel]}
                            max={99}
                            min={80}
                            step={1}
                            onValueChange={(vals) => setConfig({ ...config, confidenceLevel: vals[0] })}
                            disabled={isLoading}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
                {!isLoading ? (
                    <button
                        onClick={onRun}
                        className="w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg"
                    >
                        <Play className="w-5 h-5 fill-current" />
                        Run Forecast Model
                    </button>
                ) : (
                    <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <div className="flex justify-between text-xs font-bold text-slate-600 uppercase tracking-wide">
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                {progress < 30 ? 'Validating data...' : progress < 60 ? 'Training ensemble...' : 'Generating forecast...'}
                            </span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-center text-slate-400">
                            This typically takes 20-30 seconds depending on data size.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
