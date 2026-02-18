'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { usePlanning } from '@/lib/planning-context';
import { getDeepDiveAnalytics } from '@/lib/api-client';
import { motion } from 'framer-motion';
import { FilterBar } from '@/components/dashboard/filter-bar';
import { FilterDrawer } from '@/components/dashboard/filter-drawer';
import { AccuracyKPIs } from '@/components/accuracy-deep-dive/accuracy-kpis';
import { ErrorHeatmap } from '@/components/accuracy-deep-dive/error-heatmap';
import { RankingTable } from '@/components/accuracy-deep-dive/ranking-table';
import { BiasScatterPlot } from '@/components/accuracy-deep-dive/bias-scatter-plot';
import { ErrorDistribution } from '@/components/accuracy-deep-dive/error-distribution';
import { StabilityTrend } from '@/components/accuracy-deep-dive/stability-trend';
import { AccuracyTrendChart } from '@/components/accuracy-deep-dive/accuracy-trend-chart';
import { AccuracyDeviationChart } from '@/components/accuracy-deep-dive/accuracy-deviation-chart';

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export default function AccuracyDeepDivePage() {
    // Mock State for Ranking Table Toggle
    const [rankingType, setRankingType] = useState<'under' | 'over'>('under');

    // Data State
    const { filters, setActivePage } = usePlanning();
    const [loading, setLoading] = useState(false);
    const [kpiData, setKpiData] = useState<any>(null);
    const [trendData, setTrendData] = useState<any[]>([]);
    const [heatmapData, setHeatmapData] = useState<any>(null);
    const [rankingData, setRankingData] = useState<{ under: any[], over: any[] }>({ under: [], over: [] });
    const [kpiMeta, setKpiMeta] = useState<any>(null); // For refresher timestamp

    // Set Active Page for Filter Context
    useEffect(() => {
        setActivePage('analytics');
        return () => setActivePage('overview'); // Reset on leave
    }, [setActivePage]);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (!filters) return;
            setLoading(true);
            try {
                // Prepare params
                const params: any = {
                    year_from: parseInt(filters.date_range.start.split('-')[0]),
                    month_from: parseInt(filters.date_range.start.split('-')[1]),
                    year_to: parseInt(filters.date_range.end.split('-')[0]),
                    month_to: parseInt(filters.date_range.end.split('-')[1]),
                    breakdown: 'flavor' // Request flavor breakdown
                };

                // Array Filters
                // Handle Array or String Filters
                if (Array.isArray(filters.product_group)) { if (filters.product_group.length > 0) params.product_group = filters.product_group; }
                else if (filters.product_group && filters.product_group !== 'all') { params.product_group = [filters.product_group]; }

                if (Array.isArray(filters.flavor)) { if (filters.flavor.length > 0) params.flavor = filters.flavor; }
                else if (filters.flavor && filters.flavor !== 'all') { params.flavor = [filters.flavor]; }

                if (Array.isArray(filters.size)) { if (filters.size.length > 0) params.size = filters.size; }
                else if (filters.size && filters.size !== 'all') { params.size = [filters.size]; }

                if (Array.isArray(filters.customer)) { if (filters.customer.length > 0) params.customer = filters.customer; }
                else if (filters.customer && filters.customer !== 'all') { params.customer = [filters.customer]; }

                if (Array.isArray(filters.mechgroup)) { if (filters.mechgroup.length > 0) params.mechgroup = filters.mechgroup; }
                else if (filters.mechgroup && filters.mechgroup !== 'all') { params.mechgroup = [filters.mechgroup]; }

                // Legacy/Single Value Filters (Fallback)
                if (typeof filters.channel === 'string' && filters.channel !== 'all') params.channel = filters.channel;
                if (filters.has_promotion !== 'all' && filters.has_promotion !== undefined) params.has_promotion = filters.has_promotion;

                console.log("Fetching Deep Dive with Params:", params);

                // Call API
                const data = await getDeepDiveAnalytics(params);

                if (data) {
                    setKpiData(data.kpi);
                    setTrendData(data.sales_trend);
                    setHeatmapData({
                        customer: data.heatmap_customer || [],
                        product: data.heatmap_product || []
                    });
                    setRankingData({
                        under: data.ranking_under_plan || [],
                        over: data.ranking_over_plan || []
                    });
                    setKpiMeta(data.meta);
                } else {
                    console.error("API Response Failed:", data);
                }
            } catch (error) {
                console.error("Failed to fetch deep dive data", error);
            } finally {
                setLoading(false);
            }
        };

        // Debounce
        const timer = setTimeout(() => fetchData(), 500);
        return () => clearTimeout(timer);
    }, [filters]);


    const HeaderAction = (
        <div className="w-full flex justify-end gap-2">
            {/* Promo Filters would go here */}

            <FilterBar className="bg-transparent border-none shadow-none p-0 w-auto" />
        </div>
    );

    return (
        <MainLayout title="Forecast Accuracy Deep Dive" action={HeaderAction}>

            <motion.div
                className="min-h-screen flex flex-col gap-6 pb-6"
                variants={container}
                initial="hidden"
                animate="show"
            >

                {/* 1. Accuracy Overview (KPIs) */}
                <motion.div variants={item}>
                    <AccuracyKPIs data={kpiData} loading={loading} />
                </motion.div>

                {/* 2. Sales Trend & Deviation Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <motion.div variants={item} className="lg:col-span-2">
                        <AccuracyTrendChart data={trendData} loading={loading} />
                    </motion.div>
                    <motion.div variants={item} className="lg:col-span-1">
                        <AccuracyDeviationChart data={trendData} loading={loading} />
                    </motion.div>
                </div>

                {/* 3. Where We Miss (Heatmaps) - Flavor Focus */}
                <motion.div variants={item} className="h-auto">
                    <ErrorHeatmap
                        title={`WAPE by Flavor vs Month (${filters?.date_range?.end?.split('-')[0] || new Date().getFullYear()})`}
                        type="product"
                        data={(heatmapData?.product || []).filter((item: any) => {
                            const rowName = (item.row || '').toLowerCase();
                            return rowName.includes('coconut') ||
                                rowName.includes('orange') ||
                                rowName.includes('apple');
                        })}
                        loading={loading}
                    />
                </motion.div>

                {/* 3. Ranking Table (Action List) */}
                <motion.div variants={item} className="h-[500px]">
                    <RankingTable
                        type={rankingType}
                        onToggle={setRankingType}
                        data={rankingType === 'under' ? rankingData.under : rankingData.over}
                        loading={loading}
                    />
                </motion.div>

                {/* 4. How We Miss (Scatter & Distribution) */}
                <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[400px]">
                    <div className="min-h-0 h-full">
                        <BiasScatterPlot />
                    </div>
                    <div className="min-h-0 h-full">
                        <ErrorDistribution />
                    </div>
                </motion.div>

                {/* 5. Stability & Pattern */}
                <motion.div variants={item} className="h-[350px]">
                    <StabilityTrend />
                </motion.div>

            </motion.div>
            <FilterDrawer />
        </MainLayout>
    );
}
