'use client';

import { Bell, Search } from 'lucide-react';
import { GlobalFilters } from '@/components/planning/global-filters';

export function Header() {
    return (
        <header className="bg-white border-b border-slate-200">
            {/* Top Section Removed as per request */}

            {/* Filters Row */}

            {/* Filters Row */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                <GlobalFilters />
            </div>
        </header>
    );
}
