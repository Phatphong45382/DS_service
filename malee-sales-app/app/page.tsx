import { MainLayout } from "@/components/layout/main-layout";
import { SalesOverview } from "@/components/dashboard/sales-overview";

export default function Home() {
  return (
    <MainLayout title="Home">
      <div className="space-y-6">
        <SalesOverview />
      </div>
    </MainLayout>
  );
}
