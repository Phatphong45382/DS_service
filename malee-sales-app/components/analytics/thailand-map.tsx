'use client';

import { useState } from 'react';

interface ProvinceData {
    name: string;
    value: number;
    percentage: number;
    color: string;
}

const provinceData: ProvinceData[] = [
    { name: 'กรุงเทพมหานคร', value: 5420, percentage: 35, color: '#4f46e5' },
    { name: 'เชียงใหม่', value: 4030, percentage: 26, color: '#6366f1' },
    { name: 'ภูเก็ต', value: 2790, percentage: 18, color: '#818cf8' },
    { name: 'ขอนแก่น', value: 2170, percentage: 14, color: '#a5b4fc' },
    { name: 'สงขลา', value: 1550, percentage: 10, color: '#c7d2fe' },
    { name: 'นครราชสีมา', value: 1240, percentage: 8, color: '#ddd6fe' },
];

export function ThailandDistributionMap() {
    const [selectedPeriod, setSelectedPeriod] = useState('Last 7 Days');

    return (
        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">Top Provinces</h3>
                    <p className="text-sm text-slate-500 mt-0.5">Product distribution by province</p>
                </div>
                <select
                    className="text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                    <option>Last 90 Days</option>
                    <option>This Year</option>
                </select>
            </div>

            {/* Content Grid */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
                {/* Map Section */}
                <div className="relative bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-xl p-4 flex items-center justify-center border border-slate-200 h-[220px]">
                    <svg viewBox="0 0 300 400" className="w-full h-full max-w-[180px] max-h-[300px]">
                        {/* Thailand map outline - more realistic shape */}
                        <path
                            d="M150,30 L165,45 L175,65 L180,85 L178,105 L170,125 L165,145 L160,165 L155,185 L150,205 L148,225 L150,245 L155,265 L160,285 L158,305 L155,325 L150,345 L145,365 L140,345 L138,325 L140,305 L145,285 L148,265 L145,245 L140,225 L135,205 L130,185 L125,165 L122,145 L125,125 L130,105 L135,85 L140,65 L145,45 Z"
                            fill="#6366f1"
                            fillOpacity="0.15"
                            stroke="#4f46e5"
                            strokeWidth="2"
                            className="drop-shadow-md"
                        />

                        {/* Province markers with labels */}
                        {/* Bangkok */}
                        <circle cx="150" cy="200" r="8" fill="#4f46e5" opacity="0.9" className="drop-shadow-lg" />
                        <text x="150" y="205" textAnchor="middle" className="fill-white text-[10px] font-bold">BKK</text>

                        {/* Chiang Mai */}
                        <circle cx="130" cy="80" r="7" fill="#6366f1" opacity="0.8" className="drop-shadow-md" />
                        <text x="130" y="84" textAnchor="middle" className="fill-white text-[8px] font-bold">CNX</text>

                        {/* Phuket */}
                        <circle cx="125" cy="320" r="6" fill="#818cf8" opacity="0.7" className="drop-shadow-md" />
                        <text x="125" y="324" textAnchor="middle" className="fill-white text-[8px] font-bold">HKT</text>

                        {/* Khon Kaen */}
                        <circle cx="165" cy="150" r="5" fill="#a5b4fc" opacity="0.7" />

                        {/* Songkhla */}
                        <circle cx="145" cy="360" r="5" fill="#c7d2fe" opacity="0.7" />

                        {/* Nakhon Ratchasima */}
                        <circle cx="155" cy="180" r="4" fill="#ddd6fe" opacity="0.6" />
                    </svg>

                    {/* Zoom controls */}
                    <div className="absolute bottom-3 left-3 flex flex-col gap-1">
                        <button className="w-7 h-7 bg-white border border-slate-300 rounded shadow-sm hover:bg-slate-50 hover:shadow-md transition-all flex items-center justify-center text-slate-700 font-bold text-sm">
                            +
                        </button>
                        <button className="w-7 h-7 bg-white border border-slate-300 rounded shadow-sm hover:bg-slate-50 hover:shadow-md transition-all flex items-center justify-center text-slate-700 font-bold text-sm">
                            −
                        </button>
                    </div>
                </div>

                {/* Province List with Bars */}
                <div className="flex flex-col justify-center space-y-3">
                    {provinceData.map((province, index) => (
                        <div key={index} className="flex items-center gap-3">
                            {/* Province name */}
                            <div className="w-32 flex-shrink-0">
                                <span className="text-sm text-slate-700 font-medium truncate">{province.name}</span>
                            </div>

                            {/* Progress bar */}
                            <div className="flex-1 relative">
                                <div className="w-full bg-slate-100 rounded-full h-5 overflow-hidden">
                                    <div
                                        className="h-full rounded-full flex items-center justify-center transition-all duration-700 ease-out"
                                        style={{
                                            width: `${province.percentage}%`,
                                            backgroundColor: province.color
                                        }}
                                    >
                                        <span className="text-[10px] font-bold text-white px-2">
                                            {province.percentage}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
