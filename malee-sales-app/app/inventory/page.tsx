'use client';

import { MainLayout } from "@/components/layout/main-layout";
import { InventoryTable } from "@/components/dashboard/inventory-table";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

export default function InventoryPage() {
    return (
        <MainLayout>
            <motion.div
                className="space-y-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-[#44403C] font-poppins">Inventory Management</h1>
                        <p className="text-[#78716C] mt-2">Track stock levels and manage product catalog.</p>
                    </div>
                </div>

                {/* Low Stock Alert */}
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[20px] p-4 flex items-start gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                        <AlertCircle className="w-5 h-5 text-[#EF4444]" />
                    </div>
                    <div>
                        <h4 className="font-bold text-[#991B1B]">Low Stock Alert</h4>
                        <p className="text-sm text-[#B91C1C] mt-1">Found 2 items with low stock and 1 item out of stock. Please restock soon.</p>
                    </div>
                </div>

                <InventoryTable />
            </motion.div>
        </MainLayout>
    );
}
