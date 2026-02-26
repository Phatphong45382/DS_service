'use client';

import { Sparkles } from 'lucide-react';

interface Insight {
    emoji: string;
    text: string;
}

interface InterpretPanelProps {
    insights: Insight[];
}

export function InterpretPanel({ insights }: InterpretPanelProps) {
    return (
        <div className="border-t border-violet-100 bg-gradient-to-r from-violet-50/80 to-purple-50/60 px-4 py-2.5">
            <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="size-3 text-violet-500" />
                <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-widest">Insights</span>
            </div>
            <div className="flex gap-2">
                {insights.map((insight, i) => (
                    <div key={i} className="flex-1 flex items-start gap-1.5 bg-white/80 rounded-lg px-2.5 py-2 border border-violet-100/80">
                        <span className="text-sm shrink-0 mt-px">{insight.emoji}</span>
                        <span className="text-[11px] text-slate-600 leading-snug">{insight.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
