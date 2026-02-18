'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon, Check } from "lucide-react";

interface RequirementCardProps {
    icon: LucideIcon;
    title: string;
    body: string;
    examples: string[];
    required: boolean;
    color: string;
}

export function RequirementCard({
    icon: Icon,
    title,
    body,
    examples,
    required,
    color,
}: RequirementCardProps) {
    return (
        <Card className="h-full shadow-sm border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    {required ? (
                        <Badge className="bg-red-50 text-red-700 border-red-200">
                            Required
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-200">
                            Optional
                        </Badge>
                    )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-600 text-sm mb-4 flex-1">{body}</p>

                <div className="space-y-1 text-xs text-slate-500">
                    <p className="font-semibold text-slate-600 mb-2">Example columns:</p>
                    {examples.map((example, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <span className="text-slate-300">•</span>
                            <code className="bg-slate-50 px-2 py-1 rounded text-slate-700">{example}</code>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
