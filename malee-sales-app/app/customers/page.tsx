'use client';

import { MainLayout } from "@/components/layout/main-layout";
import { CustomerTable } from "@/components/dashboard/customer-table";
import { motion } from "framer-motion";
import { Users, UserPlus, Star } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function CustomersPage() {
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
                        <h1 className="text-3xl font-bold tracking-tight text-[#44403C] font-poppins">Customers</h1>
                        <p className="text-[#78716C] mt-2">View and manage customer relationships.</p>
                    </div>
                </div>

                {/* Customer Insights Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 bg-white rounded-[24px] border border-[#EBE5E0] shadow-sm flex items-center gap-4">
                        <div className="p-4 bg-[#ECFDF5] rounded-2xl text-[#10B981]">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-[#78716C]">Total Customers</p>
                            <p className="text-2xl font-bold text-[#44403C]">1,280</p>
                        </div>
                    </Card>
                    <Card className="p-6 bg-white rounded-[24px] border border-[#EBE5E0] shadow-sm flex items-center gap-4">
                        <div className="p-4 bg-[#FFF7ED] rounded-2xl text-[#F97316]">
                            <Star className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-[#78716C]">VIP Members</p>
                            <p className="text-2xl font-bold text-[#44403C]">145</p>
                        </div>
                    </Card>
                    <Card className="p-6 bg-white rounded-[24px] border border-[#EBE5E0] shadow-sm flex items-center gap-4">
                        <div className="p-4 bg-[#F0F9FF] rounded-2xl text-[#0EA5E9]">
                            <UserPlus className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-[#78716C]">New This Month</p>
                            <p className="text-2xl font-bold text-[#44403C]">+34</p>
                        </div>
                    </Card>
                </div>

                <CustomerTable />
            </motion.div>
        </MainLayout>
    );
}
