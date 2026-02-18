'use client';

import { LucideIcon } from "lucide-react";

interface StepCardProps {
    number: number;
    icon: LucideIcon;
    title: string;
    description: string;
}

export function StepCard({
    number,
    icon: Icon,
    title,
    description,
}: StepCardProps) {
    return (
        <div className="relative">
            {/* Step number badge */}
            <div className="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                {number}
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-600 text-sm">{description}</p>
            </div>
        </div>
    );
}
