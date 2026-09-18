'use client';

import { useState, useEffect, useRef } from 'react';
import { getAIModel, setAIModel, type AIModelOption } from '@/lib/api-client';
import { ChevronDown, Cpu, Check, Loader2, Zap, Sparkles, FlaskConical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Tier look: icon + colour by label; ids and text come from the backend (Gemini or Bedrock).
const TIER_META: Record<string, { icon: LucideIcon; color: string }> = {
    Fast: { icon: Zap, color: 'text-amber-600 bg-amber-50' },
    Balanced: { icon: Sparkles, color: 'text-blue-600 bg-blue-50' },
    Advanced: { icon: FlaskConical, color: 'text-violet-600 bg-violet-50' },
};
const FALLBACK = { label: 'AI Model', desc: '', icon: Cpu, color: 'text-slate-600 bg-slate-50' };
function metaFor(option?: AIModelOption) {
    if (!option) return FALLBACK;
    const tier = TIER_META[option.label];
    return { label: option.label, desc: option.description, icon: tier?.icon ?? Cpu, color: tier?.color ?? FALLBACK.color };
}

export function ModelSelector() {
    const [current, setCurrent] = useState<string>('');
    const [available, setAvailable] = useState<AIModelOption[]>([]);
    const [open, setOpen] = useState(false);
    const [switching, setSwitching] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        getAIModel()
            .then(data => {
                setCurrent(data.current);
                setAvailable(data.available);
            })
            .catch(() => {});
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = async (model: string) => {
        if (model === current || switching) return;
        setSwitching(true);
        try {
            const data = await setAIModel(model);
            setCurrent(data.current);
        } catch (err) {
            console.error('Failed to switch model:', err);
        } finally {
            setSwitching(false);
            setOpen(false);
        }
    };

    const meta = metaFor(available.find((m) => m.id === current));
    const CurrentIcon = meta.icon;

    if (!current) return null;

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-colors duration-200 cursor-pointer"
            >
                <CurrentIcon className={`w-3.5 h-3.5 ${meta.color.split(' ')[0]}`} />
                <span className="font-medium text-slate-700">{meta.label}</span>
                {switching ? (
                    <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
                ) : (
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                )}
            </button>

            {open && (
                <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">AI Model</p>
                    </div>
                    {available.map((option) => {
                        const model = option.id;
                        const m = metaFor(option);
                        const Icon = m.icon;
                        const isActive = model === current;
                        return (
                            <button
                                key={model}
                                onClick={() => handleSelect(model)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors duration-150 cursor-pointer ${
                                    isActive ? 'bg-slate-50' : ''
                                }`}
                            >
                                <div className={`w-7 h-7 rounded-lg ${m.color} flex items-center justify-center shrink-0`}>
                                    <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-slate-800">{m.label}</span>
                                        {isActive && <Check className="w-3 h-3 text-emerald-500" />}
                                    </div>
                                    {m.desc && <p className="text-[10px] text-slate-500">{m.desc}</p>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
