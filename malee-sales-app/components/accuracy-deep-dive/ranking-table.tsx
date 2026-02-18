'use client';

import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, AlertCircle, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils'; // Assuming cn utility exists, usually does in shadcn projects

interface RankingTableProps {
    type: 'under' | 'over';
    onToggle: (type: 'under' | 'over') => void;
    data?: any[];
    loading?: boolean;
}

export function RankingTable({ type, onToggle, data = [], loading }: RankingTableProps) {
    const isUnder = type === 'under';
    const title = isUnder ? 'Top Under-plan Items' : 'Top Over-plan Items';
    const description = isUnder ? '(Actual > Planned)' : '(Actual < Planned)';

    // Theme Colors
    const borderColor = isUnder ? 'border-red-100' : 'border-blue-100';

    // Local State for Filters
    const [sortBy, setSortBy] = useState<'impact' | 'percent'>('impact');
    const [promoFilter, setPromoFilter] = useState<'all' | 'promo' | 'non-promo'>('all');
    const [minErrorVol, setMinErrorVol] = useState<number>(0);
    const [topN, setTopN] = useState<number>(20);

    const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

    // Formatting Helper
    const formatMonth = (dateStr: string) => {
        if (!dateStr || dateStr === 'Invalid Date') return '-';
        const parts = dateStr.split('-');
        if (parts.length >= 2) {
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]);
            if (!isNaN(year) && !isNaN(month)) {
                const date = new Date(year, month - 1);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }
            }
        }
        return dateStr;
    };

    // Frequency Map
    const frequencyMap = useMemo(() => {
        const map = new Map<string, number>();
        data.forEach(item => {
            const key = `${item.customer}-${item.sku}`;
            map.set(key, (map.get(key) || 0) + 1);
        });
        return map;
    }, [data]);

    // Data Processing
    const processedData = useMemo(() => {
        if (!data) return [];

        let filtered = data.filter(item => {
            if (Math.abs(item.error) < minErrorVol) return false;
            if (promoFilter === 'promo' && !item.has_promotion) return false;
            if (promoFilter === 'non-promo' && item.has_promotion) return false;
            return true;
        });

        const totalErrorVol = filtered.reduce((sum, item) => sum + Math.abs(item.error), 0);

        filtered.sort((a, b) => {
            if (sortBy === 'impact') {
                return Math.abs(b.error) - Math.abs(a.error);
            } else {
                const aPct = a.planned > 0 ? (a.error / a.planned) : 0;
                const bPct = b.planned > 0 ? (b.error / b.planned) : 0;
                return Math.abs(bPct) - Math.abs(aPct);
            }
        });

        const sliced = filtered.slice(0, topN);

        // Max Error for Intensity Scaling
        const maxError = sliced.length > 0 ? Math.abs(sliced[0].error) : 0;

        return sliced.map(item => ({
            ...item,
            errorPct: item.planned > 0 ? (item.error / item.planned) * 100 : 0,
            share: totalErrorVol > 0 ? (Math.abs(item.error) / totalErrorVol) * 100 : 0,
            frequency: frequencyMap.get(`${item.customer}-${item.sku}`) || 1,
            intensity: maxError > 0 ? Math.abs(item.error) / maxError : 0
        }));
    }, [data, minErrorVol, promoFilter, sortBy, topN, frequencyMap]);

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex items-center justify-center p-12">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                    <p className="text-sm text-slate-500 font-medium">Loading Rankings...</p>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex items-center justify-center p-12">
                <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="w-8 h-8 text-slate-300" />
                    <p className="text-sm text-slate-500 font-medium">No ranking data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-xl border ${borderColor} shadow-sm h-full flex flex-col overflow-hidden`}>
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-baseline gap-2">
                            <h3 className={`text-base font-bold ${isUnder ? 'text-red-600' : 'text-blue-600'}`}>
                                {title}
                            </h3>
                            <span className="text-slate-500 text-sm">{description}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Showing top <span className="font-medium text-slate-700">{processedData.length}</span> items
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${isUnder ? 'bg-white text-red-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                onClick={() => onToggle('under')}
                            >
                                Under-plan
                            </button>
                            <button
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${!isUnder ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                onClick={() => onToggle('over')}
                            >
                                Over-plan
                            </button>
                        </div>
                        <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
                            <Download className="h-3.5 w-3.5" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div className="flex flex-wrap items-center gap-3 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 px-2">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-medium text-slate-600">Filters</span>
                    </div>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>

                    {/* Promo Filter */}
                    <select
                        className="h-8 text-xs border-slate-200 rounded-md bg-white text-slate-600 focus:ring-2 focus:ring-slate-100 focus:border-slate-300 cursor-pointer hover:border-slate-300 transition-colors shadow-sm"
                        value={promoFilter}
                        onChange={(e) => setPromoFilter(e.target.value as any)}
                    >
                        <option value="all">All Promotions</option>
                        <option value="promo">Promo Only</option>
                        <option value="non-promo">Non-Promo Only</option>
                    </select>

                    {/* Min Error Vol Input */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 h-8 shadow-sm group focus-within:ring-2 focus-within:ring-slate-100 focus-within:border-slate-300 transition-all">
                        <span className="text-[10px] uppercase font-medium text-slate-400 tracking-wider">Min Vol</span>
                        <input
                            type="number"
                            className="w-16 text-xs border-none p-0 focus:ring-0 text-slate-700 font-medium tabular-nums"
                            placeholder="0"
                            value={minErrorVol}
                            onChange={(e) => setMinErrorVol(Number(e.target.value))}
                        />
                    </div>

                    <div className="flex-1"></div>

                    {/* Sort By */}
                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-100 rounded-md p-0.5 border border-slate-200">
                            <button
                                onClick={() => setSortBy('impact')}
                                className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${sortBy === 'impact' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Vol Impact
                            </button>
                            <button
                                onClick={() => setSortBy('percent')}
                                className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${sortBy === 'percent' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Error %
                            </button>
                        </div>
                    </div>

                    {/* Top N */}
                    <select
                        className="h-8 text-xs border-slate-200 rounded-md bg-white text-slate-600 focus:ring-2 focus:ring-slate-100 shadow-sm cursor-pointer w-24"
                        value={topN}
                        onChange={(e) => setTopN(Number(e.target.value))}
                    >
                        <option value={10}>Top 10</option>
                        <option value={20}>Top 20</option>
                        <option value={50}>Top 50</option>
                        <option value={100}>Top 100</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-auto px-5 pb-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                <Table className="border border-slate-100 rounded-lg overflow-hidden">
                    <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-sm border-b border-slate-100">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="w-[80px] text-xs font-semibold text-slate-500 pl-4">Month</TableHead>
                            <TableHead className="w-[120px] text-xs font-semibold text-slate-500">Customer</TableHead>
                            <TableHead className="w-[160px] text-xs font-semibold text-slate-500">SKU</TableHead>
                            <TableHead className="text-right w-[90px] text-xs font-semibold text-slate-500">Planned</TableHead>
                            <TableHead className="text-right w-[90px] text-xs font-semibold text-slate-500">Actual</TableHead>
                            <TableHead className="text-right w-[100px] text-xs font-semibold text-slate-500 bg-slate-100/50">
                                <div className="flex items-center justify-end gap-1">
                                    Error (Vol)
                                    {sortBy === 'impact' && <ArrowDown className="w-3 h-3 text-slate-400" />}
                                </div>
                            </TableHead>
                            <TableHead className="text-right w-[100px] text-xs font-semibold text-slate-500">
                                <div className="flex items-center justify-end gap-1">
                                    Share %
                                </div>
                            </TableHead>
                            <TableHead className="text-right w-[80px] text-xs font-semibold text-slate-500">
                                <div className="flex items-center justify-end gap-1">
                                    Err %
                                    {sortBy === 'percent' && <ArrowDown className="w-3 h-3 text-slate-400" />}
                                </div>
                            </TableHead>
                            <TableHead className="text-center w-[60px] text-xs font-semibold text-slate-500">Freq</TableHead>
                            <TableHead className="text-center w-[70px] text-xs font-semibold text-slate-500 pr-4 rounded-tr-lg">Promo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processedData.map((item, index) => (
                            <TableRow key={index} className="group hover:bg-slate-50 transition-colors border-slate-100">
                                <TableCell className="text-slate-600 text-xs py-3 tabular-nums font-medium pl-4">
                                    {formatMonth(item.date)}
                                </TableCell>
                                <TableCell className="text-xs py-3 text-slate-600 truncate max-w-[120px]" title={item.customer}>
                                    {item.customer}
                                </TableCell>
                                <TableCell className="text-xs font-medium py-3 text-slate-900 truncate max-w-[160px]" title={item.sku}>
                                    {item.sku}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-slate-500 text-xs py-3">
                                    {formatNumber(item.planned)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-slate-900 font-medium text-xs py-3">
                                    {formatNumber(item.actual)}
                                </TableCell>

                                {/* Error Vol Column with Intensity Background */}
                                <TableCell className="text-right py-3 bg-slate-50/50 group-hover:bg-slate-100/50 border-x border-dashed border-slate-200/50">
                                    <span className={`tabular-nums font-semibold text-xs ${item.error > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {item.error > 0 ? '+' : ''}{formatNumber(item.error)}
                                    </span>
                                </TableCell>

                                {/* Share Column with Mini Bar */}
                                <TableCell className="text-right py-3">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="tabular-nums text-xs text-slate-500">{item.share.toFixed(1)}%</span>
                                        <div className="h-1 bg-slate-100 rounded-full w-16 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${isUnder ? 'bg-orange-400' : 'bg-blue-400'}`}
                                                style={{ width: `${Math.min(item.share, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </TableCell>

                                <TableCell className={`text-right tabular-nums text-xs py-3 ${Math.abs(item.errorPct) > 20 ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                                    {Math.abs(item.errorPct).toFixed(1)}%
                                </TableCell>

                                <TableCell className="text-center py-3">
                                    {item.frequency > 1 ? (
                                        <Badge variant="outline" className={`text-[10px] h-5 px-1.5 border-slate-200 font-medium ${item.frequency >= 3 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600'}`}>
                                            {item.frequency}x
                                        </Badge>
                                    ) : (
                                        <span className="text-slate-300 text-[10px]">-</span>
                                    )}
                                </TableCell>

                                <TableCell className="text-center py-3 pr-4">
                                    {item.has_promotion ? (
                                        <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 bg-purple-100 text-purple-700 font-medium border border-purple-200 hover:bg-purple-200">
                                            Promo
                                        </Badge>
                                    ) : (
                                        <span className="text-slate-300 text-xs">-</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
