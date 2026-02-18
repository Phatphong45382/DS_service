'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { getAnalyticsData } from "@/lib/api-client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const AVAILABLE_YEARS = [2023, 2024];

interface PromotionImpactChartProps {
    globalFilters?: any;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const promo = payload.find((p: any) => p.dataKey === 'promotion')?.value || 0;
    const regular = payload.find((p: any) => p.dataKey === 'regular')?.value || 0;
    const total = promo + regular;
    const promoPct = total > 0 ? ((promo / total) * 100).toFixed(1) : '0';
    const fmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format;

    return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg min-w-[160px]">
            <p className="text-sm font-semibold text-slate-900 mb-2">{label}</p>
            <div className="space-y-1 text-xs">
                <div className="flex justify-between gap-6">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-slate-500">Promotion</span>
                    </div>
                    <span className="font-medium text-green-600">{fmt(promo)}</span>
                </div>
                <div className="flex justify-between gap-6">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                        <span className="text-slate-500">Regular</span>
                    </div>
                    <span className="font-medium text-slate-500">{fmt(regular)}</span>
                </div>
                <div className="pt-1 mt-1 border-t border-slate-100 flex justify-between gap-6">
                    <span className="text-slate-500">Promo Share</span>
                    <span className="font-semibold text-green-600">{promoPct}%</span>
                </div>
            </div>
        </div>
    );
};

export function PromotionImpactChart({ globalFilters }: PromotionImpactChartProps) {
    const [loading, setLoading] = useState(false);
    const [promoTs, setPromoTs] = useState<any[]>([]);
    const [regularTs, setRegularTs] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState<number>(() => {
        if (globalFilters?.date_range?.start) {
            return parseInt(globalFilters.date_range.start.split('-')[0]);
        }
        return new Date().getFullYear();
    });

    // Update selected year when global filters change
    useEffect(() => {
        if (globalFilters?.date_range?.start) {
            const filterYear = parseInt(globalFilters.date_range.start.split('-')[0]);
            setSelectedYear(filterYear);
        }
    }, [globalFilters?.date_range?.start]);

    useEffect(() => {
        if (!globalFilters) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const baseParams: any = {
                    year_from: selectedYear,
                    month_from: 1,
                    year_to: selectedYear,
                    month_to: 12,
                };

                if (globalFilters.product_group && globalFilters.product_group !== 'all') baseParams.product_group = globalFilters.product_group;
                if (globalFilters.flavor && globalFilters.flavor !== 'all') baseParams.flavor = globalFilters.flavor;
                if (globalFilters.size && globalFilters.size !== 'all') baseParams.size = globalFilters.size;
                if (globalFilters.customer && globalFilters.customer !== 'all') baseParams.customer = globalFilters.customer;

                const [promoData, regularData] = await Promise.all([
                    getAnalyticsData({ ...baseParams, has_promotion: 1 }),
                    getAnalyticsData({ ...baseParams, has_promotion: 0 }),
                ]);

                setPromoTs((promoData as any).monthly_ts || []);
                setRegularTs((regularData as any).monthly_ts || []);
            } catch (e) {
                console.error('PromotionImpact fetch error', e);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchData, 300);
        return () => clearTimeout(timer);
    }, [globalFilters, selectedYear]);

    const chartData = useMemo(() => {
        const map = new Map<string, { sortKey: number; month: string; promotion: number; regular: number }>();

        promoTs.forEach((pt: any) => {
            if (pt.year !== selectedYear) return;
            const key = `${pt.year}-${String(pt.month).padStart(2, '0')}`;
            const label = MONTH_NAMES[pt.month - 1];
            map.set(key, { sortKey: pt.month, month: label, promotion: pt.qty, regular: 0 });
        });

        regularTs.forEach((pt: any) => {
            if (pt.year !== selectedYear) return;
            const key = `${pt.year}-${String(pt.month).padStart(2, '0')}`;
            const label = MONTH_NAMES[pt.month - 1];
            const existing = map.get(key);
            if (existing) {
                existing.regular = pt.qty;
            } else {
                map.set(key, { sortKey: pt.month, month: label, promotion: 0, regular: pt.qty });
            }
        });

        return Array.from(map.values())
            .sort((a, b) => a.sortKey - b.sortKey)
            .map(({ sortKey: _, ...rest }) => rest);
    }, [promoTs, regularTs, selectedYear]);

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2 shrink-0">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">Promotion Impact</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Monthly sales vs. promotion periods</p>
                </div>
                <div className="flex items-center gap-3">
                    {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-green-500" />
                            <span className="font-medium text-slate-600">Promotion</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-slate-300" />
                            <span className="font-medium text-slate-600">Regular</span>
                        </div>
                    </div>
                    {/* Year Selector */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                        {AVAILABLE_YEARS.map(year => (
                            <Button
                                key={year}
                                variant={selectedYear === year ? "secondary" : "ghost"}
                                size="sm"
                                className={`h-6 text-xs px-2 ${selectedYear === year ? 'bg-white shadow-sm' : ''}`}
                                onClick={() => setSelectedYear(year)}
                            >
                                {year}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 w-full">
                {chartData.length === 0 && !loading ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                        No data available
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }} barCategoryGap="30%">
                            <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                axisLine={{ stroke: '#e2e8f0' }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(v)}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="promotion" name="Promotion" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={22} />
                            <Bar dataKey="regular" name="Regular" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={22} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
