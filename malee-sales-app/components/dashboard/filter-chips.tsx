'use client';

import React from 'react';
import { usePlanning } from '@/lib/planning-context';
import { X, RotateCcw, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { generateYearMonth } from '@/lib/planning-data';

export function FilterChips() {
    const { filters, updateFilters, setFilters } = usePlanning();

    const activeFilters: { label: string; value: string; key: string }[] = [];

    // Check for active filters (excluding defaults)
    if (filters.mechgroup && filters.mechgroup !== 'all') activeFilters.push({ label: 'Promo Type', value: filters.mechgroup, key: 'mechgroup' });
    if (filters.product_group !== 'all') activeFilters.push({ label: 'Product', value: filters.product_group, key: 'product_group' });
    if (filters.flavor !== 'all') activeFilters.push({ label: 'Flavor', value: filters.flavor, key: 'flavor' });
    if (filters.customer && filters.customer !== 'all') activeFilters.push({ label: 'Customer', value: filters.customer, key: 'customer' });
    if (filters.site && filters.site !== 'all') activeFilters.push({ label: 'Ship-to', value: filters.site, key: 'site' });
    if (filters.has_promotion !== 'all') activeFilters.push({ label: 'Promo', value: filters.has_promotion === 1 ? 'Yes' : 'No', key: 'has_promotion' });

    if (activeFilters.length === 0) return null;

    const handleRemove = (key: string) => {
        updateFilters({ [key]: 'all' });
    };

    const handleClearAll = () => {
        setFilters({
            product_group: 'all',
            flavor: 'all',
            size: 'all',
            customer: 'all',
            site: 'all',
            mechgroup: 'all',
            has_promotion: 'all',
            date_range: filters.date_range, // Keep date range
        });
    };

    return (
        <div className="flex flex-wrap items-center gap-3 py-1.5 px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <div className="flex items-center gap-2 text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Applied Filters:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {activeFilters.map((filter) => (
                    <Badge
                        key={filter.key}
                        variant="secondary"
                        className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium text-[11px] shadow-sm"
                    >
                        <span className="opacity-60 font-bold uppercase text-[9px]">{filter.label}:</span>
                        <span className="text-slate-900">{filter.value}</span>
                        <button
                            onClick={() => handleRemove(filter.key)}
                            className="ml-0.5 p-0.5 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-rose-500"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </Badge>
                ))}
            </div>

            <div className="h-4 w-px bg-slate-200 mx-1"></div>

            <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="flex items-center gap-1.5 h-7 px-2 text-[10px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-lg uppercase tracking-wider"
            >
                <RotateCcw className="w-3 h-3" />
                Reset All
            </Button>
        </div>
    );
}
