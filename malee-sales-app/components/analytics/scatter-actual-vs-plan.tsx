'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getDeepDiveAnalytics } from "@/lib/api-client";
import { Loader2, ScatterChart as ScatterIcon } from "lucide-react";
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';

interface ScatterActualVsPlanProps {
    globalFilters?: any;
}

interface ScatterPoint {
    planned: number;
    actual: number;
    is_promo: boolean;
    label: string;
}

const MOCK_DATA: ScatterPoint[] = Array.from({ length: 80 }, (_, i) => {
    const planned = Math.floor(Math.random() * 50000) + 5000;
    const isPromo = Math.random() > 0.6;
    const noise = (Math.random() - 0.5) * planned * 0.6;
    const promoLift = isPromo ? planned * 0.15 : 0;
    return {
        planned,
        actual: Math.max(0, Math.round(planned + noise + promoLift)),
        is_promo: isPromo,
        label: `Product ${i + 1}`,
    };
});

const formatCompact = (val: number) =>
    new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(val);

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const error = d.actual - d.planned;
    const errorPct = d.planned > 0 ? ((error / d.planned) * 100).toFixed(1) : '0';
    return (
        <div className="bg-white rounded-lg shadow-lg border border-slate-100 p-3 text-xs max-w-[220px]">
            <p className="font-semibold text-slate-900 mb-1.5 truncate">{d.label}</p>
            <div className="flex flex-col gap-1">
                <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Planned:</span>
                    <span className="font-medium">{formatCompact(d.planned)}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Actual:</span>
                    <span className="font-medium">{formatCompact(d.actual)}</span>
                </div>
                <div className="flex justify-between gap-4 pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Error:</span>
                    <span className={`font-semibold ${error >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {error >= 0 ? '+' : ''}{errorPct}%
                    </span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Promo:</span>
                    <span className={`font-medium ${d.is_promo ? 'text-amber-600' : 'text-slate-400'}`}>
                        {d.is_promo ? 'Yes' : 'No'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export function ScatterActualVsPlan({ globalFilters }: ScatterActualVsPlanProps) {
    const [loading, setLoading] = useState(false);
    const [rawData, setRawData] = useState<ScatterPoint[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!globalFilters) return;
            setLoading(true);
            try {
                const params: any = {
                    year_from: parseInt(globalFilters.date_range.start.split('-')[0]),
                    month_from: parseInt(globalFilters.date_range.start.split('-')[1]),
                    year_to: parseInt(globalFilters.date_range.end.split('-')[0]),
                    month_to: parseInt(globalFilters.date_range.end.split('-')[1]),
                };
                if (globalFilters.product_group && globalFilters.product_group !== 'all') params.product_group = globalFilters.product_group;
                if (globalFilters.flavor && globalFilters.flavor !== 'all') params.flavor = globalFilters.flavor;
                if (globalFilters.size && globalFilters.size !== 'all') params.size = globalFilters.size;
                if (globalFilters.customer && globalFilters.customer !== 'all') params.customer = globalFilters.customer;

                const result: any = await getDeepDiveAnalytics(params);
                if (result?.scatter_data?.length) {
                    setRawData(result.scatter_data);
                }
            } catch (error) {
                console.error("Failed to fetch scatter data", error);
            } finally {
                setLoading(false);
            }
        };
        const timer = setTimeout(fetchData, 300);
        return () => clearTimeout(timer);
    }, [globalFilters]);

    const { promoData, nonPromoData, maxVal } = useMemo(() => {
        const source = rawData.length > 0 ? rawData : MOCK_DATA;
        const promo = source.filter(d => d.is_promo);
        const nonPromo = source.filter(d => !d.is_promo);
        const max = Math.max(...source.map(d => Math.max(d.planned, d.actual)), 1);
        return { promoData: promo, nonPromoData: nonPromo, maxVal: max };
    }, [rawData]);

    return (
        <Card className="shadow-sm border-slate-200 h-full flex flex-col">
            <CardHeader className="pb-2 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                            <ScatterIcon className="w-4 h-4 text-violet-600" />
                            Planned vs Actual Scatter
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            Each dot = one SKU-month — dots above diagonal line = actual exceeded plan
                        </CardDescription>
                    </div>
                    {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 pt-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                            dataKey="planned"
                            type="number"
                            name="Planned"
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            tickFormatter={formatCompact}
                            tickLine={false}
                            axisLine={{ stroke: '#e2e8f0' }}
                            label={{ value: 'Planned', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#94a3b8' }}
                        />
                        <YAxis
                            dataKey="actual"
                            type="number"
                            name="Actual"
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            tickFormatter={formatCompact}
                            tickLine={false}
                            axisLine={false}
                            label={{ value: 'Actual', angle: -90, position: 'insideLeft', offset: 20, fontSize: 11, fill: '#94a3b8' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="top"
                            height={28}
                            iconSize={8}
                            wrapperStyle={{ fontSize: 11 }}
                        />
                        {/* Perfect prediction line (diagonal) */}
                        <ReferenceLine
                            segment={[{ x: 0, y: 0 }, { x: maxVal, y: maxVal }]}
                            stroke="#94a3b8"
                            strokeDasharray="6 4"
                            strokeWidth={1.5}
                            label={{ value: "Perfect Forecast", position: "insideTopLeft", fontSize: 10, fill: "#94a3b8" }}
                        />
                        <Scatter
                            name="Non-Promo"
                            data={nonPromoData}
                            fill="#6366f1"
                            fillOpacity={0.5}
                            r={4}
                        />
                        <Scatter
                            name="Promo"
                            data={promoData}
                            fill="#f59e0b"
                            fillOpacity={0.6}
                            r={5}
                            shape="diamond"
                        />
                    </ScatterChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
