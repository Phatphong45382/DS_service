'use client';

import { Crosshair, Scale, PackageMinus, PackagePlus } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string;
    subValue: string;
    trend: 'up' | 'down' | 'neutral';
    icon: any;
    color: string;
}

function KPICard({ title, value, subValue, trend, icon: Icon, color }: KPICardProps) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm text-slate-500 font-medium">{title}</p>
                <div className="flex items-baseline gap-2 mt-1">
                    <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                    <span className={`text-xs font-medium ${trend === 'down' ? 'text-green-600' : 'text-red-600'}`}>
                        {subValue}
                    </span>
                </div>
            </div>
            <div className={`p-3 rounded-lg bg-${color}-100 text-${color}-600`}>
                <Icon className="h-6 w-6" />
            </div>
        </div>
    );
}

interface AccuracyKPIsProps {
    data?: any;
    loading?: boolean;
}

export function AccuracyKPIs({ data, loading }: AccuracyKPIsProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-[88px] animate-pulse">
                        <div className="h-4 w-24 bg-slate-100 rounded mb-2"></div>
                        <div className="h-8 w-16 bg-slate-100 rounded"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!data) return (
        <div className="text-center p-4 text-red-500 bg-red-50 rounded-lg">
            No KPI Data Available
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
                title="WAPE (Weighted MAPE)"
                value={`${data.wape.toFixed(1)}%`}
                subValue="Weighted Error"
                trend="neutral"
                icon={Crosshair}
                color="blue"
            />
            <KPICard
                title="Bias"
                value={`${data.bias > 0 ? '+' : ''}${data.bias.toFixed(1)}%`}
                subValue={data.bias > 0 ? "Under Plan" : "Over Plan"}
                trend={Math.abs(data.bias) < 5 ? 'neutral' : 'down'}
                icon={Scale}
                color="purple"
            />
            <KPICard
                title="Under-plan Rate"
                value={`${data.under_plan_rate.toFixed(1)}%`}
                subValue="Volume Impact"
                trend="neutral"
                icon={PackageMinus}
                color="orange"
            />
            <KPICard
                title="Over-plan Rate"
                value={`${(data.over_plan_rate || 0).toFixed(1)}%`}
                subValue="Inventory Risk"
                trend="neutral"
                icon={PackagePlus}
                color="red"
            />
        </div>
    );
}
