'use client';

import { Activity, ArrowUpRight, ArrowDownRight, Target, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { salesMonthly, forecastBaseline, generateYearMonth } from '@/lib/planning-data';

export function HealthOverview() {
    const lastMonth = generateYearMonth(-1);

    // Calculate MAPE (Mean Absolute Percentage Error) for last month
    let totalError = 0;
    let count = 0;
    let totalSales = 0;
    let totalForecast = 0;

    // Sample a few flavors/sizes for demo
    salesMonthly
        .filter(s => s.year_month === lastMonth)
        .forEach(sale => {
            const forecast = forecastBaseline.find(
                f => f.year_month === lastMonth && f.flavor === sale.flavor && f.size === sale.size
            );

            if (forecast) {
                const error = Math.abs(sale.sales_qty - forecast.forecast_qty) / sale.sales_qty;
                totalError += error;
                count++;
                totalSales += sale.sales_qty;
                totalForecast += forecast.forecast_qty;
            }
        });

    const mape = count > 0 ? (totalError / count) * 100 : 15.5; // Default mock
    const accuracy = 100 - mape;

    // Bias calculation (Positive = Under-forecast, Negative = Over-forecast)
    const bias = ((totalSales - totalForecast) / totalForecast) * 100 || -2.5;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Forecast Accuracy */}
            <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Target className="w-16 h-16 text-blue-600" />
                </div>
                <div className="relative z-10">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Forecast Accuracy</p>
                    <div className="flex items-baseline gap-2 mt-2">
                        <h3 className="text-3xl font-bold text-slate-900">{accuracy.toFixed(1)}%</h3>
                        <span className="text-sm font-medium text-slate-400">Target: 85%</span>
                    </div>
                    <div className="flex items-center mt-3 text-sm">
                        <div className="flex items-center px-2 py-0.5 rounded text-emerald-700 bg-emerald-50 font-medium">
                            <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                            <span>1.2%</span>
                        </div>
                        <span className="text-slate-500 ml-2">vs last month</span>
                    </div>
                </div>
            </div>

            {/* Forecast Bias */}
            <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Activity className="w-16 h-16 text-amber-600" />
                </div>
                <div className="relative z-10">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Forecast Bias</p>
                    <div className="flex items-baseline gap-2 mt-2">
                        <h3 className={`text-3xl font-bold ${Math.abs(bias) > 5 ? 'text-amber-600' : 'text-slate-900'}`}>
                            {bias > 0 ? '+' : ''}{bias.toFixed(1)}%
                        </h3>
                        <span className="text-sm font-medium text-slate-400">Total Var.</span>
                    </div>
                    <div className="flex items-center mt-3 text-sm">
                        {bias < 0 ? (
                            <div className="flex items-center px-2 py-0.5 rounded text-amber-700 bg-amber-50 font-medium">
                                <span className="mr-1">Over-forecast</span>
                            </div>
                        ) : (
                            <div className="flex items-center px-2 py-0.5 rounded text-blue-700 bg-blue-50 font-medium">
                                <span className="mr-1">Under-forecast</span>
                            </div>
                        )}
                        <span className="text-slate-500 ml-2">Status</span>
                    </div>
                </div>
            </div>

            {/* Active Alerts */}
            <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <AlertTriangle className="w-16 h-16 text-red-600" />
                </div>
                <div className="relative z-10">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">System Alerts</p>
                    <div className="flex items-baseline gap-2 mt-2">
                        <h3 className="text-3xl font-bold text-slate-900">3</h3>
                        <span className="text-sm font-medium text-slate-400">Active</span>
                    </div>
                    <div className="flex items-center mt-3 text-sm gap-2">
                        <div className="flex items-center px-2 py-0.5 rounded text-red-700 bg-red-50 font-medium border border-red-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
                            2 High
                        </div>
                        <div className="flex items-center px-2 py-0.5 rounded text-amber-700 bg-amber-50 font-medium border border-amber-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                            1 Med
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
