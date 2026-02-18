'use client';

import React from 'react';
import { usePlanning } from '@/lib/planning-context';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
    SheetDescription
} from '@/components/ui/sheet';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Filter, RotateCcw, CheckCircle2 } from 'lucide-react';

export function FilterDrawer() {
    const {
        isDrawerOpen,
        setIsDrawerOpen,
        pendingFilters,
        updatePendingFilters,
        applyFilters,
        setPendingFilters,
        filters,
        filterOptions
    } = usePlanning();

    const handleApply = () => {
        applyFilters(pendingFilters);
    };

    const handleReset = () => {
        const reset: typeof pendingFilters = {
            ...filters,
            customer: 'all',
            site: 'all',
            mechgroup: 'all',
            has_promotion: 'all',
            size: 'all',
            product_group: 'all',
            flavor: 'all',
        };
        setPendingFilters(reset);
    };

    return (
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetContent className="w-[400px] sm:w-[450px] bg-white border-l border-slate-200 p-0 overflow-hidden flex flex-col shadow-2xl">
                <SheetHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <Filter className="w-5 h-5 text-white" />
                        </div>
                        <SheetTitle className="text-xl font-bold text-slate-900 font-display tracking-tight">Advanced Filters</SheetTitle>
                    </div>
                    <SheetDescription className="text-sm text-slate-500 font-medium">
                        Refine your dashboard view with specific criteria
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Organizational Group */}
                    <div className="space-y-5">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Organizational</h3>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700 ml-1">Customer</Label>
                            <Select
                                value={pendingFilters.customer}
                                onValueChange={(val) => updatePendingFilters({ customer: val })}
                            >
                                <SelectTrigger className="h-11 border-slate-200 rounded-xl focus:ring-blue-500 shadow-sm">
                                    <SelectValue placeholder="All Customers" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
                                    <SelectItem value="all">All Customers</SelectItem>
                                    {filterOptions?.customers.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700 ml-1">Promotion Type (Mech Group)</Label>
                            <Select
                                value={pendingFilters.mechgroup}
                                onValueChange={(val) => updatePendingFilters({ mechgroup: val })}
                            >
                                <SelectTrigger className="h-11 border-slate-200 rounded-xl focus:ring-blue-500 shadow-sm">
                                    <SelectValue placeholder="All Promotion Types" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
                                    <SelectItem value="all">All Promotion Types</SelectItem>
                                    {filterOptions?.mechgroups.map(m => (
                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100"></div>

                    {/* Product & Sales Group */}
                    <div className="space-y-5">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Product & Sales</h3>


                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700 ml-1">Promotion Status</Label>
                            <Select
                                value={String(pendingFilters.has_promotion)}
                                onValueChange={(val) => updatePendingFilters({ has_promotion: val === 'all' ? 'all' : parseInt(val) })}
                            >
                                <SelectTrigger className="h-11 border-slate-200 rounded-xl focus:ring-blue-500 shadow-sm">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
                                    <SelectItem value="all">All (Promo + Normal)</SelectItem>
                                    <SelectItem value="1">With Promotion only</SelectItem>
                                    <SelectItem value="0">No Promotion only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700 ml-1">Product Size</Label>
                            <Select
                                value={String(pendingFilters.size)}
                                onValueChange={(val) => updatePendingFilters({ size: val })}
                            >
                                <SelectTrigger className="h-11 border-slate-200 rounded-xl focus:ring-blue-500 shadow-sm">
                                    <SelectValue placeholder="All Sizes" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
                                    <SelectItem value="all">All Sizes</SelectItem>
                                    {filterOptions?.sizes.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <SheetFooter className="p-6 border-t border-slate-100 bg-slate-50/50 gap-3">
                    <Button
                        variant="ghost"
                        onClick={handleReset}
                        className="flex-1 h-12 rounded-xl text-slate-600 font-bold hover:bg-slate-200 transition-all gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </Button>
                    <Button
                        onClick={handleApply}
                        className="flex-[2] h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-900/10 transition-all font-bold gap-2"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Apply Filters
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
