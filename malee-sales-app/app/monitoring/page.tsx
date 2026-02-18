import { MainLayout } from "@/components/layout/main-layout";
import { PageHeader } from "@/components/ui/page-header";
import { HealthOverview } from "@/components/monitoring/health-overview";
import { ActualVsForecastChart } from "@/components/monitoring/actual-vs-forecast";
import { AlertsFeed } from "@/components/monitoring/alerts-feed";

export default function MonitoringPage() {
    return (
        <MainLayout>
            <div className="space-y-10">
                <PageHeader
                    title="Monitoring & Alerts"
                    description="Track forecast accuracy and investigate anomalies"
                />

                {/* Health Overview */}
                <HealthOverview />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[500px]">
                    {/* Left: Actual vs Forecast Chart (Cols 1-7) */}
                    <div className="lg:col-span-7 h-full">
                        <ActualVsForecastChart />
                    </div>

                    {/* Right: Alerts Feed (Cols 8-12) */}
                    <div className="lg:col-span-5 h-full">
                        {/* Note: AlertsFeed manages its own internal layout/height */}
                        <AlertsFeed />
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
