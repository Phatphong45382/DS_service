'use client';

import { usePlanning } from '@/lib/planning-context';
import { Target, Zap, RefreshCw, RotateCcw, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export function ScenarioControls() {
    const { scenarioParams, setScenarioParams } = usePlanning();

    return (
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden border border-slate-100/50">
            {/* Main Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-600 rounded-full" />
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight font-display">Parameters</h2>
                </div>
                <button
                    onClick={() => setScenarioParams({
                        horizon: 6,
                        method: 'baseline',
                        smoothing_window: 3,
                        promo_enabled: false,
                        promo_days: 0,
                        discount_pct: 0,
                        uplift_pct: 0,
                        safety_stock_pct: 15,
                    })}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                    title="Reset to defaults"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>

            <div className="divide-y divide-slate-100">
                {/* Forecast Settings */}
                <div className="p-5 space-y-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        <h3 className="text-sm font-bold text-slate-900">Forecast Settings</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                                Forecast Horizon
                            </Label>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                {[3, 6, 12].map((months) => (
                                    <button
                                        key={months}
                                        onClick={() => setScenarioParams({ ...scenarioParams, horizon: months as any })}
                                        className={`
                                            flex-1 py-1.5 text-xs font-bold rounded-md transition-all
                                            ${scenarioParams.horizon === months
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700'
                                            }
                                        `}
                                    >
                                        {months}M
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                                Baseline Method
                            </Label>
                            <select
                                value={scenarioParams.method}
                                onChange={(e) => setScenarioParams({ ...scenarioParams, method: e.target.value as any })}
                                className="w-full px-3 py-2 text-sm bg-slate-50 border-none rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500/20 font-medium"
                            >
                                <option value="baseline">Moving Average (3M)</option>
                                <option value="model">Seasonal Naive</option>
                                <option value="weighted">Weighted Average</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Promo Simulation */}
                <div className={`p-5 space-y-5 transition-all duration-300 ${scenarioParams.promo_enabled ? '' : 'bg-slate-50/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Zap className={`w-4 h-4 ${scenarioParams.promo_enabled ? 'text-amber-500' : 'text-slate-400'}`} />
                            <h3 className={`text-sm font-bold ${scenarioParams.promo_enabled ? 'text-slate-900' : 'text-slate-500'}`}>Promo Simulation</h3>
                        </div>
                        <Switch
                            checked={scenarioParams.promo_enabled}
                            onCheckedChange={(checked) => setScenarioParams({ ...scenarioParams, promo_enabled: checked })}
                        />
                    </div>

                    <div className={`space-y-4 transition-all duration-300 ${scenarioParams.promo_enabled ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-bold text-slate-700">Discount</Label>
                                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                                    {scenarioParams.discount_pct || 0}%
                                </span>
                            </div>
                            <Slider
                                value={[scenarioParams.discount_pct || 0]}
                                max={50}
                                step={5}
                                onValueChange={(val) => setScenarioParams({ ...scenarioParams, discount_pct: val[0] })}
                                className="py-1"
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-bold text-slate-700">Duration</Label>
                                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                    {scenarioParams.promo_days || 0} days
                                </span>
                            </div>
                            <Slider
                                value={[scenarioParams.promo_days || 0]}
                                max={30}
                                step={5}
                                onValueChange={(val) => setScenarioParams({ ...scenarioParams, promo_days: val[0] })}
                                className="py-1"
                            />
                        </div>

                        {scenarioParams.promo_enabled && (
                            <div className="pt-2">
                                <div className="flex gap-2 text-xs text-slate-600 bg-blue-50/50 p-3 rounded-xl leading-relaxed">
                                    <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />
                                    <p>Estimated uplift: <strong className="text-blue-700">+{((scenarioParams.discount_pct || 0) * 1.5).toFixed(0)}%</strong> demand.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Production Settings */}
                <div className="p-5 space-y-5">
                    <div className="flex items-center gap-2 mb-2">
                        <RefreshCw className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-sm font-bold text-slate-900">Production Plan</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-bold text-slate-700">Safety Stock</Label>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                    {scenarioParams.safety_stock_pct || 15}%
                                </span>
                            </div>
                            <Slider
                                value={[scenarioParams.safety_stock_pct || 15]}
                                max={50}
                                step={5}
                                onValueChange={(val) => setScenarioParams({ ...scenarioParams, safety_stock_pct: val[0] })}
                                className="py-1"
                            />
                            <p className="text-[10px] text-slate-400 leading-normal">
                                Higher buffer reduces stockout risk but increases holding costs.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
