'use client';

import { KPICard } from "./kpi-card";
import { RevenueChart } from "./revenue-chart";
import { CategoryChart } from "./category-chart";
import { TopProducts } from "./top-products";
import { kpiMetrics, salesData, topProducts, formatValue } from "@/lib/data";
import { DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";

const icons = [DollarSign, ShoppingCart, Users, TrendingUp];

import { TimeRangeSlider } from "./time-range-slider";
import { usePlanning } from "@/lib/planning-context";
import { useSearch } from "@/lib/search-context";

import { Download } from "lucide-react";

import { motion } from "framer-motion";

export function SalesOverview() {
    const { searchQuery } = useSearch();
    const { filters, updateFilters } = usePlanning();

    const filteredProducts = topProducts.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleExport = () => {
        const headers = ["Product Name", "Sales", "Revenue", "Change"];
        const csvContent = [
            headers.join(","),
            ...filteredProducts.map(p =>
                `${p.name},${p.sales},${p.revenue},${p.change}%`
            )
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "malee_sales_data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            className="space-y-8"
            variants={container}
            initial="hidden"
            animate="show"
        >
            <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[#44403C] font-poppins">Dashboard Overview</h2>
                    <p className="text-[#78716C] mt-2">Track performance and sales metrics</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-[#EBE5E0] rounded-xl text-sm font-semibold text-[#44403C] hover:bg-[#F5EFE9] hover:text-[#FF8A5B] transition-colors shadow-sm"
                        suppressHydrationWarning
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <div className="w-[300px]">
                        <TimeRangeSlider
                            start={filters.date_range.start}
                            end={filters.date_range.end}
                            onChange={(range: { start: string, end: string }) => updateFilters({ date_range: range })}
                        />
                    </div>
                </div>
            </motion.div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiMetrics.map((kpi, index) => {
                    const Icon = icons[index];
                    return (
                        <KPICard
                            key={kpi.label}
                            label={kpi.label}
                            value={formatValue(kpi.value, kpi.format)}
                            trend={kpi.trend}
                            icon={<Icon className="w-5 h-5" />}
                        />
                    );
                })}
            </div>

            {/* Charts Section */}
            <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RevenueChart data={salesData} />
                </div>
                <div>
                    <CategoryChart />
                </div>
            </motion.div>

            {/* Top Products */}
            <motion.div variants={item}>
                <TopProducts products={filteredProducts} />
            </motion.div>
        </motion.div>
    );
}
