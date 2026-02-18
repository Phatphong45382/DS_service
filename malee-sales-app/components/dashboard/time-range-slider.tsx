"use client"

import * as React from "react"
import { format, addMonths, startOfMonth, differenceInMonths, parse } from "date-fns"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

interface TimeRangeSliderProps {
    start: string; // yyyy-MM
    end: string;   // yyyy-MM
    onChange: (range: { start: string, end: string }) => void;
    minDate?: string;
    maxDate?: string;
}

export function TimeRangeSlider({ start, end, onChange, minDate = "2023-01", maxDate }: TimeRangeSliderProps) {
    const min = parse(minDate, "yyyy-MM", new Date());
    const max = maxDate ? parse(maxDate, "yyyy-MM", new Date()) : new Date();

    const totalMonths = differenceInMonths(max, min);

    const startIndex = differenceInMonths(parse(start, "yyyy-MM", min), min);
    const endIndex = differenceInMonths(parse(end, "yyyy-MM", min), min);

    const handleValueChange = (values: number[]) => {
        if (values.length === 2) {
            const newStart = format(addMonths(min, values[0]), "yyyy-MM");
            const newEnd = format(addMonths(min, values[1]), "yyyy-MM");
            onChange({ start: newStart, end: newEnd });
        }
    };

    // Generate markers for years
    const markers = [];
    const totalYears = Math.ceil(totalMonths / 12);
    for (let i = 0; i <= totalYears; i++) {
        const date = addMonths(min, i * 12);
        if (date <= max) {
            markers.push({
                index: i * 12,
                label: format(date, "yyyy")
            });
        }
    }

    return (
        <div className="w-full px-2 py-1">
            <div className="relative group/slider flex items-center h-full">
                <SliderPrimitive.Root
                    className="relative flex w-full touch-none select-none items-center py-2"
                    value={[startIndex, endIndex]}
                    max={totalMonths}
                    step={1}
                    onValueChange={handleValueChange}
                >
                    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-slate-100/50">
                        <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-blue-500 to-teal-400" />
                    </SliderPrimitive.Track>

                    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-[2px] border-white bg-blue-500 shadow-sm transition-all hover:scale-110 focus:outline-none cursor-grab active:cursor-grabbing relative group/thumb1">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap opacity-0 group-hover/slider:opacity-100 group-hover/thumb1:opacity-100 transition-opacity pointer-events-none z-10">
                            {format(addMonths(min, startIndex), "MMM yy")}
                        </div>
                    </SliderPrimitive.Thumb>

                    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-[2px] border-white bg-teal-400 shadow-sm transition-all hover:scale-110 focus:outline-none cursor-grab active:cursor-grabbing relative group/thumb2">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap opacity-0 group-hover/slider:opacity-100 group-hover/thumb2:opacity-100 transition-opacity pointer-events-none z-10">
                            {format(addMonths(min, endIndex), "MMM yy")}
                        </div>
                    </SliderPrimitive.Thumb>
                </SliderPrimitive.Root>

                {/* Subtle Markers Inline or Just Below */}
                <div className="absolute bottom-[-14px] w-full flex justify-between px-0.5 pointer-events-none">
                    {markers.map((m) => (
                        <span key={m.index} className="text-[8px] font-bold text-slate-300">{m.label}</span>
                    ))}
                </div>
            </div>
        </div>
    )
}
