'use client';

import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface EmailKPICardProps {
    icon: LucideIcon;
    value: string;
    label: string;
    change: string;
    isPositive: boolean;
}

export function EmailKPICard({ icon: Icon, value, label, change, isPositive }: EmailKPICardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200"
        >
            <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-50 flex-shrink-0">
                    <Icon className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-500 font-medium mb-1 truncate">{label}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-xl font-bold text-slate-900 leading-tight">{value}</div>
                        <div className={`flex items-center gap-0.5 text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isPositive ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                )}
                            </svg>
                            {change}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
