'use client';

import { useEffect, useState, useMemo } from "react";

import { MainLayout } from "@/components/layout/main-layout";
import { HorizontalKPICard } from "@/components/analytics/horizontal-kpi-card";
import { VisitorsChart } from "@/components/analytics/visitors-chart";
import { BrowserStats } from "@/components/analytics/browser-stats";
import { MiniMetricCard } from "@/components/analytics/mini-metric-card";
import { SeasonalHeatmap } from "@/components/analytics/seasonal-heatmap";
import { ActualVsPlanChart } from "@/components/analytics/actual-vs-plan-chart";
import { PromotionImpactChart } from "@/components/analytics/promotion-impact-chart";
import { FilterBar } from '@/components/dashboard/filter-bar';
import { FilterDrawer } from '@/components/dashboard/filter-drawer';
import { Package, Target, Activity, TrendingUp, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
// import { motion } from "framer-motion"; // Disabled for stability
import { usePlanning } from "@/lib/planning-context";
import { getAnalyticsData } from "@/lib/api-client";

const formatQty = (val: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'decimal',
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(val);
};

const formatPercent = (val: number) => {
    return `${val.toFixed(1)}%`;
};

// Mock data for mini charts
const generateMockData = (points: number, min: number, max: number) => {
    return Array.from({ length: points }, () => ({
        value: Math.floor(Math.random() * (max - min + 1)) + min
    }));
};

export default function AnalyticsDashboardPage() {
    const { fullSummary, isLoading, setActivePage, filters, setFilters } = usePlanning();

    // Drill Down State
    const [drillLevel, setDrillLevel] = useState(0); // 0: All, 1: Group, 2: Flavor
    const [chartData, setChartData] = useState<any>(null); // To hold breakdown data
    const [chartLoading, setChartLoading] = useState(false);
    const [title, setTitle] = useState("Actual Sales Overview");

    // Reset chart when global data changes if at top level
    useEffect(() => {
        if (drillLevel === 0 && (chartData !== null || title !== "Actual Sales Overview")) {
            setChartData(null);
            setTitle("Actual Sales Overview");
        }
    }, [drillLevel, chartData, title]); // Removed fullSummary dependency as it's not needed for resetting logic

    const [initialBreakdown, setInitialBreakdown] = useState<any[]>([]);

    // Fetch initial breakdown for Pie Chart (Level 0)
    useEffect(() => {
        const fetchInitialBreakdown = async () => {
            if (drillLevel === 0) {
                try {
                    const params = getQueryParams(filters);
                    const data = await getAnalyticsData(params, 'product_group');
                    const response = data as any;
                    if (response.breakdown_ts) {
                        setInitialBreakdown(response.breakdown_ts);
                    }
                } catch (error) {
                    console.error("Failed to fetch initial breakdown", error);
                }
            }
        };
        fetchInitialBreakdown();
    }, [filters, drillLevel]); // Re-fetch when filters change or back to level 0

    useEffect(() => {
        if (fullSummary?.kpi?.mom_growth !== undefined) {
            // setActivePage only needs to be set once on mount effectively
        }
        // Use a ref or simple check to avoid loop
        setActivePage('analytics');
    }, []); // Empty dependency array to run only once on mount

    // ... (rest of code)

    const kpi = useMemo(() => fullSummary?.kpi || {
        total_actual: 0,
        total_planned: 0,
        wape: 0,
        bias: 0,
        under_plan_volume: 0,
        under_plan_rate: 0,
        mom_growth: 0,
        total_active_items: 0,
        avg_promo_days: 0,
        target_achievement_rate: 0,
        avg_discount_pct: 0,
        avg_discount_pct_change: 0,
        avg_promo_days_change: 0
    }, [fullSummary?.kpi]);

    const getQueryParams = (currentFilters: any) => {
        return {
            year_from: parseInt(currentFilters.date_range.start.split('-')[0]),
            month_from: parseInt(currentFilters.date_range.start.split('-')[1]),
            year_to: parseInt(currentFilters.date_range.end.split('-')[0]),
            month_to: parseInt(currentFilters.date_range.end.split('-')[1]),
            ...currentFilters
        };
    };

    const handleDrillDown = async (key: string) => {
        setChartLoading(true);
        try {
            if (drillLevel === 0) {
                // Moving to Level 1: By Product Group
                const params = getQueryParams(filters);
                const data = await getAnalyticsData(params, 'product_group');
                const response = data as any;
                if (response.breakdown_ts) {
                    setChartData(response.breakdown_ts);
                    setDrillLevel(1);
                    setTitle("Actual Sales by Product Group");
                }
            } else if (drillLevel === 1) {
                // Moving to Level 2: By Flavor (Global - no filtering by Group)
                const params = getQueryParams(filters); // Keep existing filters (Date, Customer etc)
                const data = await getAnalyticsData(params, 'flavor');
                const response = data as any;
                if (response.breakdown_ts) {
                    setChartData(response.breakdown_ts);
                    setDrillLevel(2);
                    setTitle("Actual Sales by Flavor");
                }
            } else if (drillLevel === 2) {
                // Moving to Level 3: By Size (Global - no filtering by Flavor)
                const params = getQueryParams(filters); // Keep existing filters
                const data = await getAnalyticsData(params, 'size');
                const response = data as any;
                if (response.breakdown_ts) {
                    setChartData(response.breakdown_ts);
                    setDrillLevel(3);
                    setTitle("Actual Sales by Size");
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setChartLoading(false);
        }
    };

    const handleBack = async () => {
        if (drillLevel === 1) {
            setDrillLevel(0);
            setChartData(null);
        } else if (drillLevel === 2) {
            // Go back to Level 1: By Product Group
            setChartLoading(true);
            try {
                const params = getQueryParams(filters);
                const data = await getAnalyticsData(params, 'product_group');
                const response = data as any;
                if (response.breakdown_ts) {
                    setChartData(response.breakdown_ts);
                    setDrillLevel(1);
                    setTitle("Actual Sales by Product Group");
                }
            } finally {
                setChartLoading(false);
            }
        } else if (drillLevel === 3) {
            // Go back to Level 2: By Flavor
            setChartLoading(true);
            try {
                const params = getQueryParams(filters);
                const data = await getAnalyticsData(params, 'flavor');
                const response = data as any;
                if (response.breakdown_ts) {
                    setChartData(response.breakdown_ts);
                    setDrillLevel(2);
                    setTitle("Actual Sales by Flavor");
                }
            } finally {
                setChartLoading(false);
            }
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    const HeaderAction = (
        <div className="w-full flex justify-end">
            <FilterBar className="bg-transparent border-none shadow-none p-0 w-auto" />
        </div>
    );

    return (
        <MainLayout title="Analytics Dashboard" action={HeaderAction}>
            {/* Premium Layout - Allows minimal scroll for better aesthetics */}
            <div className="min-h-screen flex flex-col gap-4 pb-6">

                {/* Forecast KPI Cards - Horizontal Scrollable Layout */}
                <div className="flex-shrink-0">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h2 className="text-base font-semibold text-slate-900">Performance Overview</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Key Performance Indicators</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-2 xl:gap-4">
                            <HorizontalKPICard
                                icon={Package}
                                name="Total Actual"
                                value={formatQty(kpi.total_actual)}
                                change={`${kpi.mom_growth > 0 ? '+' : ''}${kpi.mom_growth.toFixed(1)}%`}
                                isPositive={kpi.mom_growth >= 0}
                                iconBgColor="bg-blue-600"
                                changeLabel="vs Last Month"
                            />
                            <HorizontalKPICard
                                icon={Target}
                                name="Growth"
                                value={`${(kpi.mom_growth || 0).toFixed(1)}%`}
                                change={`${(kpi.target_achievement_rate || 0) > 0 ? '+' : ''}${(kpi.target_achievement_rate || 0).toFixed(1)}%`}
                                isPositive={(kpi.target_achievement_rate || 0) >= 0}
                                iconBgColor="bg-purple-600"
                                changeLabel="Target Achievement"
                            />
                            <HorizontalKPICard
                                icon={Activity}
                                name="Discount AVG"
                                value={`${((kpi.avg_discount_pct || 0) * 100).toFixed(1)}%`}
                                change={`${(kpi.avg_discount_pct_change || 0) > 0 ? '+' : ''}${(kpi.avg_discount_pct_change || 0).toFixed(1)}%`}
                                isPositive={(kpi.avg_discount_pct_change || 0) >= 0}
                                iconBgColor="bg-green-600"
                                changeLabel="Avg. Rate"
                            />
                            <HorizontalKPICard
                                icon={TrendingUp}
                                name="Promotion Days"
                                value={`${(kpi.avg_promo_days || 0).toFixed(0)} Days`}
                                change={`${(kpi.avg_promo_days_change || 0) > 0 ? '+' : ''}${(kpi.avg_promo_days_change || 0).toFixed(1)} Days`}
                                isPositive={(kpi.avg_promo_days_change || 0) >= 0}
                                iconBgColor="bg-orange-600"
                                changeLabel="Avg. Days"
                            />
                            <HorizontalKPICard
                                icon={ArrowDownCircle}
                                name="Total Sku"
                                value={`${kpi.total_active_items || 0}`}
                                change="0" // No historical data for SKU count yet
                                isPositive={true}
                                iconBgColor="bg-teal-600"
                                changeLabel="Active Items"
                            />
                        </div>
                    </div>
                </div>

                {/* Visitors Overview & Browser Stats - Premium */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[380px]">
                    <div className="lg:col-span-2 min-h-0 h-full">
                        <VisitorsChart
                            data={fullSummary?.monthly_ts}
                            breakdownData={chartData}
                            level={drillLevel}
                            title={title}
                            onDrillDown={handleDrillDown}
                            onBack={handleBack}
                            isLoading={chartLoading}
                        />
                    </div>
                    <div className="min-h-0 h-full">
                        <BrowserStats
                            data={drillLevel === 0 ? initialBreakdown : chartData}
                            level={drillLevel}
                            onDrillDown={(key) => {
                                if (drillLevel < 3) handleDrillDown(key);
                            }}
                            isLoading={chartLoading && drillLevel > 0}
                        />
                    </div>
                </div>

                {/* Seasonal Heatmap (Full Width) */}
                <div className="grid grid-cols-1 gap-4 h-full">
                    <div className="min-h-0 h-full">
                        <SeasonalHeatmap globalFilters={filters} />
                    </div>
                </div>

                {/* Bottom Section - 50/50 Split */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[350px]">
                    {/* Left Column: Actual vs Plan */}
                    <div className="min-h-0 h-full">
                        <ActualVsPlanChart globalFilters={filters} />
                    </div>

                    {/* Right Column: Promotion Impact */}
                    <div className="min-h-0 h-full">
                        <PromotionImpactChart globalFilters={filters} />
                    </div>
                </div>
            </div>
            <FilterDrawer />
        </MainLayout >
    );
}
