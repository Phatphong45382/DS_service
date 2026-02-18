'use client';

import { LucideIcon } from "lucide-react";
// import { motion } from "framer-motion";

interface HorizontalKPICardProps {
    icon: LucideIcon;
    name: string;
    value: string;
    change: string;
    isPositive: boolean;
    iconBgColor?: string;
    changeLabel?: string;
}

export function HorizontalKPICard({
    icon: Icon,
    name,
    value,
    change,
    isPositive,
    iconBgColor = "bg-slate-900",
    changeLabel
}: HorizontalKPICardProps) {
    return (
        <div
            className="bg-white rounded-xl p-3 lg:p-2 xl:p-4 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200 min-w-[140px] lg:min-w-0"
        >
            {/* Header: Icon + Name */}
            <div className="flex items-center gap-2 mb-2 lg:mb-1 xl:mb-3">
                <div className={`${iconBgColor} rounded-full p-2 lg:p-1.5 xl:p-2 flex-shrink-0`}>
                    <Icon className="w-4 h-4 lg:w-3 lg:h-3 xl:w-4 xl:h-4 text-white" />
                </div>
                <span className="text-sm lg:text-xs xl:text-sm font-semibold text-slate-900 truncate">{name}</span>
            </div>

            {/* Value */}
            <div className="mb-1">
                <div className="text-2xl lg:text-lg xl:text-2xl font-bold text-slate-900">{value}</div>
            </div>

            {/* Change Percentage */}
            <div className="flex items-center gap-1">
                <span className="text-xs lg:text-[10px] xl:text-xs text-slate-500 whitespace-nowrap">{changeLabel || "Total Return"}</span>
                <div className={`flex items-center gap-0.5 text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {change}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isPositive ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        )}
                    </svg>
                </div>
            </div>
        </div>
    );
}
