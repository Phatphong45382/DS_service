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
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Customers</h1>
                        <p className="text-slate-500 mt-2">View and manage customer relationships.</p>
                    </div>
                </div>

                {/* Customer Insights Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-500">Total Customers</p>
                            <p className="text-2xl font-bold text-slate-900">1,280</p>
                        </div>
                    </Card>
                    <Card className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-4 bg-amber-50 rounded-2xl text-amber-600">
                            <Star className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-500">VIP Members</p>
                            <p className="text-2xl font-bold text-slate-900">145</p>
                        </div>
                    </Card>
                    <Card className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-4 bg-sky-50 rounded-2xl text-sky-600">
                            <UserPlus className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-500">New This Month</p>
                            <p className="text-2xl font-bold text-slate-900">+34</p>
                        </div>
                    </Card>
                </div>

                <CustomerTable />
            </motion.div>
        </MainLayout>
    );
}
