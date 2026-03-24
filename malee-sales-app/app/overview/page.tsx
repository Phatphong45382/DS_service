'use client';

import { useEffect } from "react";
import { usePlanning } from "@/lib/planning-context";
import { MainLayout } from "@/components/layout/main-layout";



import { OverviewKPICards } from "@/components/planning/overview-kpi-cards";
// import { TrendChart } from "@/components/planning/trend-chart";
import { InsightsSection } from "@/components/planning/insights-section";
import { TopItemsTable } from "@/components/planning/top-items-table";

import { FilterBar } from "@/components/dashboard/filter-bar";
import { FilterChips } from "@/components/dashboard/filter-chips";
import { FilterDrawer } from "@/components/dashboard/filter-drawer";
import TrendChart from "@/components/planning/trend-chart";

export default function OverviewPage() {
    const { setActivePage } = usePlanning();

    useEffect(() => {
        setActivePage('overview');
    }, [setActivePage]);
    return (
        <MainLayout
            title="Executive Summary"
            description="ภาพรวมยอดขายและแผนการผลิตที่เชื่อมต่อกับ Dataiku จริง"
        >
            <div className="space-y-6">

                {/* 0. Filter Section */}
                <div className="space-y-2">
                    <FilterBar />
                    <FilterChips />
                </div>

                {/* 1. KPI Cards Row */}
                <OverviewKPICards />

                {/* Trend Chart */}
                <TrendChart />

                {/* Insights Section */}
                <InsightsSection />

                {/* Top Items Table */}
                <TopItemsTable />

                {/* Advanced Filter Drawer (Managed by Context) */}
                <FilterDrawer />
            </div>
        </MainLayout>
    );
}
