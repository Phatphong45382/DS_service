'use client';

import React, { useState, useEffect } from 'react';
import { usePlanning } from '@/lib/planning-context';
import { TimeRangeSlider } from './time-range-slider';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Settings2, Download, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { parse, isValid, format } from "date-fns";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function FilterBar({ className }: { className?: string }) {
    const { filters, updateFilters, setIsDrawerOpen, filterOptions, dashboardData } = usePlanning();
    const [isMounted, setIsMounted] = React.useState(false);

    // Local state for inputs to allow typing freely
    const [startInput, setStartInput] = useState(filters.date_range.start);
    const [endInput, setEndInput] = useState(filters.date_range.end);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    // Sync local inputs when global filters change (e.g. from slider)
    useEffect(() => {
        setStartInput(filters.date_range.start);
        setEndInput(filters.date_range.end);
    }, [filters.date_range]);

    const handleExport = () => {
        if (!dashboardData || dashboardData.length === 0) {
            console.warn("No data to export");
            return;
        }

        // 1. Define Headers
        const headers = ['Year-Month', 'Sales Quantity'];

        // 2. Convert to CSV rows
        const csvRows = [
            headers.join(','),
            ...dashboardData.map(row => {
                return `${row.year_month},${row.sales_qty}`;
            })
        ];

        // 3. Join with newlines
        const csvString = csvRows.join('\n');

        // 4. Create Blob
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

        // 5. Create Link and Trigger Download
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `Sales_Forecast_Data_${filters.date_range.start}_to_${filters.date_range.end}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const validateAndSetDate = (value: string, type: 'start' | 'end') => {
        // Try parsing different formats
        let parsedDate: Date | null = null;
        const now = new Date();

        // 1. "YYYY-MM" (Standard)
        if (/^\d{4}-\d{2}$/.test(value)) {
            parsedDate = parse(value, 'yyyy-MM', now);
        }
        // 2. "YY-MM" or "YY MM" (Short Year)
        else if (/^\d{2}[-\s]\d{2}$/.test(value)) {
            parsedDate = parse(value.replace(' ', '-'), 'yy-MM', now);
        }
        // 3. "MM/YYYY"
        else if (/^\d{2}\/\d{4}$/.test(value)) {
            parsedDate = parse(value, 'MM/yyyy', now);
        }

        if (parsedDate && isValid(parsedDate)) {
            const formatted = format(parsedDate, 'yyyy-MM');
            const newRange = { ...filters.date_range, [type]: formatted };

            // Basic validation: Start <= End
            if (type === 'start' && newRange.end < formatted) return; // or swap? keep simple for now
            if (type === 'end' && newRange.start > formatted) return;

            updateFilters({ date_range: newRange });
        } else {
            // Revert to valid global state if invalid
            if (type === 'start') setStartInput(filters.date_range.start);
            if (type === 'end') setEndInput(filters.date_range.end);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: 'start' | 'end') => {
        if (e.key === 'Enter') {
            validateAndSetDate(e.currentTarget.value, type);
            e.currentTarget.blur();
        }
    };

    if (!isMounted) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/50 backdrop-blur-md border border-slate-200 rounded-2xl shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Skeleton */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Period</span>
                        <div className="w-[300px] h-10 bg-slate-100 rounded-xl animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "flex items-center gap-2 bg-transparent border-none shadow-none p-0 pb-2.5 w-full overflow-visible",
            className
        )}>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">

                {/* Date Range Picker */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <Popover>
                        <PopoverTrigger asChild>
                            <div
                                className="flex items-center gap-1.5 h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all select-none"
                            >
                                <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
                                <span className="text-xs">{filters.date_range.start}</span>
                                <ArrowRight className="h-3 w-3 text-slate-400" />
                                <span className="text-xs">{filters.date_range.end}</span>
                            </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-4 bg-white rounded-xl shadow-xl border border-slate-100" align="start">
                            <div className="flex flex-col gap-4">
                                <div className="space-y-1.5">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From</span>
                                    <div className="relative">
                                        <Input
                                            value={startInput}
                                            onChange={(e) => setStartInput(e.target.value)}
                                            onBlur={(e) => validateAndSetDate(e.target.value, 'start')}
                                            onKeyDown={(e) => handleKeyDown(e, 'start')}
                                            className="pl-9 h-10 font-bold text-slate-700 border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                                            placeholder="YYYY-MM"
                                        />
                                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To</span>
                                    <div className="relative">
                                        <Input
                                            value={endInput}
                                            onChange={(e) => setEndInput(e.target.value)}
                                            onBlur={(e) => validateAndSetDate(e.target.value, 'end')}
                                            onKeyDown={(e) => handleKeyDown(e, 'end')}
                                            className="pl-9 h-10 font-bold text-slate-700 border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                                            placeholder="YYYY-MM"
                                        />
                                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Inline Slider - Hide on small screens */}
                <div className="hidden xl:block w-[140px] px-0.5 opacity-80 hover:opacity-100 transition-opacity">
                    <TimeRangeSlider
                        start={filters.date_range.start}
                        end={filters.date_range.end}
                        onChange={(range: { start: string, end: string }) => updateFilters({ date_range: range })}
                    />
                </div>

                {/* Divider */}
                <div className="h-5 w-px bg-slate-200 mx-0 hidden lg:block"></div>

                {/* Filter Dropdowns */}
                <div className="flex items-center gap-1.5">

                    {/* Product Filter */}
                    <div className="w-[150px]">
                        <Select
                            value={filters.product_group}
                            onValueChange={(val) => updateFilters({ product_group: val })}
                        >
                            <SelectTrigger className="h-9 border-slate-200 text-xs font-medium shadow-sm hover:border-blue-300 transition-colors">
                                <SelectValue placeholder="All Products" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Products</SelectItem>
                                {filterOptions?.product_groups.map(g => (
                                    <SelectItem key={g} value={g}>{g}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Flavor Filter */}
                    <div className="w-[130px]">
                        <Select
                            value={filters.flavor}
                            onValueChange={(val) => updateFilters({ flavor: val })}
                        >
                            <SelectTrigger className="h-9 border-slate-200 text-xs font-medium shadow-sm hover:border-blue-300 transition-colors">
                                <SelectValue placeholder="All Flavors" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Flavors</SelectItem>
                                {filterOptions?.flavors.map(f => (
                                    <SelectItem key={f} value={f}>{f}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Advanced Filter Trigger */}
                    <Button
                        variant="ghost"
                        onClick={() => setIsDrawerOpen(true)}
                        className="flex items-center gap-1 h-9 px-2.5 rounded-lg text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm border border-transparent hover:border-blue-100 transition-all font-medium text-xs whitespace-nowrap"
                    >
                        <Settings2 className="w-3.5 h-3.5" />
                        More
                    </Button>
                </div>
            </div>
        </div>
    );
}
