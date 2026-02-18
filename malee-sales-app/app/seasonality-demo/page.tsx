'use client';

import { PageHeader } from "@/components/ui/page-header";
import { HeatmapCalendar } from "@/components/analytics/seasonality/heatmap-calendar";
import { RadialSeasonalityChart } from "@/components/analytics/seasonality/radial-chart";
import { YearOverYearBarChart } from "@/components/analytics/seasonality/yoy-bar-chart";

export default function SeasonalityDemoPage() {
    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Seasonality Visualization Prototypes"
                description="Compare different ways to visualize seasonal trends and monthly performance."
            />

            <div className="grid grid-cols-1 gap-6">
                {/* 1. Heatmap - Full Width */}
                <HeatmapCalendar />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 2. Radial Chart */}
                    <RadialSeasonalityChart />

                    {/* 3. YoY Bar Chart */}
                    <YearOverYearBarChart />
                </div>
            </div>
        </div>
    );
}
