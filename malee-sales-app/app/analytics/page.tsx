'use client';

import { MainLayout } from "@/components/layout/main-layout";
import { PageHeader } from "@/components/ui/page-header";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";
import { RegionalSalesChart } from "@/components/dashboard/regional-sales-chart";
import { motion } from "framer-motion";

export default function AnalyticsPage() {
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

    return (
        <MainLayout>
            <motion.div
                className="space-y-8"
                variants={container}
                initial="hidden"
                animate="show"
            >
                <PageHeader
                    title="Analytics Dashboard"
                    description="Deep dive into sales trends and regional performance."
                />

                <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SalesTrendChart />
                    <RegionalSalesChart />
                </motion.div>

                {/* Placeholder for future advanced analytics */}
                <motion.div variants={item} className="p-8 bg-[#FFF5F0] rounded-[24px] border border-dashed border-[#FFCC80] text-center">
                    <p className="text-[#FF8A5B] font-medium">More analytics widgets coming soon...</p>
                </motion.div>
            </motion.div>
        </MainLayout>
    );
}
