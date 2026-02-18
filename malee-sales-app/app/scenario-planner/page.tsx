import { MainLayout } from "@/components/layout/main-layout";
import { PageHeader } from "@/components/ui/page-header";
import { ScenarioControls } from "@/components/planning/scenario-controls";
// import { ScenarioChart } from "@/components/planning/scenario-chart";
import { ProductionTable } from "@/components/planning/production-table";
import ScenarioChart from "@/components/planning/scenario-chart";

export default function ScenarioPlannerPage() {
    return (
        <MainLayout
            title="Scenario Planner"
            description="Simulate sales scenarios and optimize production plans"
        >
            <div className="space-y-10">

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    {/* Left Panel: Controls (20%) */}
                    <div className="lg:col-span-1 sticky top-8">
                        <ScenarioControls />
                    </div>

                    {/* Right Panel: Visualization & Results (80%) */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* Chart Section */}
                        <div className="h-[500px]">
                            <ScenarioChart />
                        </div>

                        {/* Table Section */}
                        <ProductionTable />
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
