'use client';

import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface OutcomeCardProps {
    icon: LucideIcon;
    title: string;
    body: string;
    color: string;
}

export function OutcomeCard({
    icon: Icon,
    title,
    body,
    color,
}: OutcomeCardProps) {
    return (
        <Card className="h-full shadow-sm border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col h-full">
                <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mb-4`}>
                    <Icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{body}</p>
            </CardContent>
        </Card>
    );
}
