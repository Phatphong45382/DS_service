'use client';

import { usePlanning } from '@/lib/planning-context';
import { ChevronDown } from 'lucide-react';

export function GlobalFilters() {
    const { filters, updateFilters } = usePlanning();

    const flavors = ['ทั้งหมด', 'Orange', 'Apple', 'Grape', 'Mango', 'Lychee', 'Mixed Berry'];
    const sizes = ['ทั้งหมด', '200ml', '400ml', '1000ml'];
    const channels = ['ทั้งหมด', 'Retail', 'Wholesale', 'Online', 'Export'];

    return (
        <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-slate-700">รสชาติ:</span>
            <select
                value={filters.flavor}
                onChange={(e) => updateFilters({ flavor: e.target.value })}
                className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-slate-300 transition-colors"
            >
                {flavors.map((f) => (
                    <option key={f} value={f}>{f}</option>
                ))}
            </select>

            <span className="text-sm font-medium text-slate-700">ขนาด:</span>
            <select
                value={filters.size}
                onChange={(e) => updateFilters({ size: e.target.value })}
                className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-slate-300 transition-colors"
            >
                {sizes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>

            <span className="text-sm font-medium text-slate-700">ช่องทาง:</span>
            <select
                value={filters.channel}
                onChange={(e) => updateFilters({ channel: e.target.value })}
                className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-slate-300 transition-colors"
            >
                {channels.map((c) => (
                    <option key={c} value={c}>{c}</option>
                ))}
            </select>

            <div className="ml-auto flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium">ช่วงเวลา:</span>
                <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg">
                    {filters.date_range?.start || '?? เดือนย้อนหลัง'} - {filters.date_range?.end || 'ถึงปัจจุบัน'}
                </span>
            </div>
        </div>
    );
}
