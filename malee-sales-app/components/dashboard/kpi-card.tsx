'use client';

import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

interface KPICardProps {
    label: string;
    value: string;
    trend: number;
    icon?: React.ReactNode;
}

export function KPICard({ label, value, trend, icon }: KPICardProps) {
    const isPositive = trend >= 0;

    // Parse numeric value from string (e.g., "฿12,450,000" -> 12450000)
    const numericValue = parseFloat(value.replace(/[^0-9.-]+/g, ""));
    const isCurrency = value.includes("฿");
    const isPercentage = value.includes("%");

    const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
    const displayValue = useTransform(spring, (current) => {
        if (isCurrency) {
            return new Intl.NumberFormat('th-TH', {
                style: 'currency',
                currency: 'THB',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(current);
        }
        if (isPercentage) {
            return `${current.toFixed(1)}%`;
        }
        return new Intl.NumberFormat('th-TH').format(Math.round(current));
    });

    useEffect(() => {
        spring.set(numericValue);
    }, [numericValue, spring]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="bg-warm-bg-card rounded-[var(--radius-card)] p-6 border border-warm-border shadow-warm-sm hover:shadow-warm-md transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                        <p className="text-sm font-semibold text-warm-text-secondary font-poppins">{label}</p>
                        <motion.p className="text-3xl font-bold tracking-tight text-warm-text-primary font-poppins">
                            {displayValue}
                        </motion.p>
                    </div>
                    {icon && (
                        <div className="p-3 rounded-2xl bg-warm-bg-subtle text-warm-accent border border-warm-bg-hover">
                            {icon}
                        </div>
                    )}
                </div>

                <div className="mt-4 flex items-center gap-3">
                    <div className={cn(
                        "flex items-center px-2 py-1 rounded-lg text-xs font-bold",
                        isPositive
                            ? "bg-[#ECFDF5] text-[#10B981]"
                            : "bg-[#FEF2F2] text-[#EF4444]"
                    )}>
                        {isPositive ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                        {Math.abs(trend)}%
                    </div>
                    <span className="text-xs font-medium text-warm-text-muted">
                        from last month
                    </span>
                </div>
            </Card>
        </motion.div>
    );
}
