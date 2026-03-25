'use client';

import { useState, useMemo } from 'react';
import { ArrowRight, ChevronDown, Database, Keyboard, MinusCircle, CheckCircle2, AlertCircle, ChevronRight, RotateCcw, Wand2 } from 'lucide-react';
import { ParsedData } from '@/lib/file-utils';

// ── Required model columns ──

interface ModelColumn {
    key: string;
    label: string;
    description: string;
    required: boolean;
    defaultValue?: string;
    example?: string;
}

const MODEL_COLUMNS: ModelColumn[] = [
    { key: 'customer', label: 'Customer', description: 'ชื่อลูกค้า/ช่องทาง', required: true, example: 'FreshMart' },
    { key: 'destination', label: 'Destination', description: 'ปลายทาง/สาขา', required: true, example: 'DC Central 1' },
    { key: 'year', label: 'Year', description: 'ปี (พ.ศ. หรือ ค.ศ.)', required: true, example: '2025' },
    { key: 'month', label: 'Month', description: 'เดือน (1-12)', required: true, example: '1' },
    { key: 'product', label: 'Product', description: 'กลุ่มสินค้า', required: true, example: 'Chips' },
    { key: 'flavor', label: 'Flavor', description: 'รสชาติ', required: true, example: 'Original' },
    { key: 'size', label: 'Size', description: 'ขนาด', required: true, example: '150g' },
    { key: 'quantity', label: 'Quantity', description: 'จำนวนที่ขาย', required: true, example: '150' },
    { key: 'planed_sales_from_start', label: 'Planned Sales', description: 'ยอดขายเป้าหมาย', required: false, defaultValue: '0', example: '160000' },
    { key: 'has_promotion', label: 'Has Promotion', description: 'มี Promo หรือไม่ (0/1)', required: false, defaultValue: '0', example: '0' },
    { key: 'discount_pct', label: 'Discount %', description: '% ส่วนลด', required: false, defaultValue: '0', example: '10' },
    { key: 'promo_days', label: 'Promo Days', description: 'จำนวนวัน Promo', required: false, defaultValue: '0', example: '7' },
];

// ── Mapping types ──

type MappingSource = 'column' | 'manual' | 'none';

interface MappingEntry {
    source: MappingSource;
    columnName?: string;    // when source = 'column'
    manualValue?: string;   // when source = 'manual'
}

interface ColumnMappingProps {
    data: ParsedData;
    fileName: string;
    onConfirm: (mappedData: ParsedData) => void;
    onBack: () => void;
}

export function ColumnMapping({ data, fileName, onConfirm, onBack }: ColumnMappingProps) {
    // Initialize mappings with auto-match
    const [mappings, setMappings] = useState<Record<string, MappingEntry>>(() => {
        const initial: Record<string, MappingEntry> = {};
        for (const col of MODEL_COLUMNS) {
            // Try auto-match by exact name or close match
            const match = data.headers.find(h =>
                h.toLowerCase() === col.key.toLowerCase() ||
                h.toLowerCase().replace(/[\s_-]/g, '') === col.key.toLowerCase().replace(/[\s_-]/g, '')
            );
            if (match) {
                initial[col.key] = { source: 'column', columnName: match };
            } else {
                initial[col.key] = col.required ? { source: 'none' } : { source: 'none' };
            }
        }
        return initial;
    });

    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // Compute which source columns are already used
    const usedColumns = useMemo(() => {
        const used = new Set<string>();
        Object.values(mappings).forEach(m => {
            if (m.source === 'column' && m.columnName) used.add(m.columnName);
        });
        return used;
    }, [mappings]);

    // Validation
    const requiredMissing = MODEL_COLUMNS
        .filter(c => c.required)
        .filter(c => mappings[c.key].source === 'none');

    const mappedCount = Object.values(mappings).filter(m => m.source !== 'none').length;
    const isValid = requiredMissing.length === 0;

    // Get sample value from data for a column
    const getSampleValue = (columnName: string): string => {
        if (!data.rows.length) return '';
        const val = data.rows[0][columnName];
        return val?.toString() || '';
    };

    // Update a mapping
    const setMapping = (modelKey: string, entry: MappingEntry) => {
        setMappings(prev => ({ ...prev, [modelKey]: entry }));
        setOpenDropdown(null);
    };

    // Reset all mappings
    const resetMappings = () => {
        const initial: Record<string, MappingEntry> = {};
        for (const col of MODEL_COLUMNS) {
            initial[col.key] = { source: 'none' };
        }
        setMappings(initial);
    };

    // Auto map columns by matching names (case-insensitive, ignoring spaces/underscores/hyphens)
    const autoMap = () => {
        const normalize = (s: string) => s.toLowerCase().replace(/[\s_\-]/g, '');
        const used = new Set<string>();
        const result: Record<string, MappingEntry> = {};

        for (const col of MODEL_COLUMNS) {
            const colNorm = normalize(col.key);
            const labelNorm = normalize(col.label);
            const match = data.headers.find(h => {
                if (used.has(h)) return false;
                const hNorm = normalize(h);
                return hNorm === colNorm || hNorm === labelNorm;
            });
            if (match) {
                result[col.key] = { source: 'column', columnName: match };
                used.add(match);
            } else {
                result[col.key] = { source: 'none' };
            }
        }
        setMappings(result);
    };

    // Build mapped data and proceed
    const handleConfirm = () => {
        const mappedHeaders = MODEL_COLUMNS.map(c => c.key);
        const mappedRows = data.rows.map(row => {
            const newRow: Record<string, any> = {};
            for (const col of MODEL_COLUMNS) {
                const mapping = mappings[col.key];
                if (mapping.source === 'column' && mapping.columnName) {
                    newRow[col.key] = row[mapping.columnName] ?? col.defaultValue ?? '';
                } else if (mapping.source === 'manual') {
                    newRow[col.key] = mapping.manualValue ?? col.defaultValue ?? '';
                } else {
                    newRow[col.key] = col.defaultValue ?? '';
                }
            }
            return newRow;
        });

        const mappedData: ParsedData = {
            headers: mappedHeaders,
            rows: mappedRows,
            summary: {
                rowCount: mappedRows.length,
                colCount: mappedHeaders.length,
                emptyCells: 0,
            },
        };

        onConfirm(mappedData);
    };

    // Render the source label for a mapping
    const renderMappingLabel = (modelKey: string) => {
        const m = mappings[modelKey];
        if (m.source === 'column' && m.columnName) {
            return (
                <span className="flex items-center gap-1.5">
                    <Database className="w-3 h-3 text-blue-500" />
                    <span className="text-slate-700 font-medium">{m.columnName}</span>
                    <span className="text-[10px] text-slate-400 ml-1 truncate max-w-[80px]">
                        e.g. {getSampleValue(m.columnName)}
                    </span>
                </span>
            );
        }
        if (m.source === 'manual') {
            return (
                <span className="flex items-center gap-1.5">
                    <Keyboard className="w-3 h-3 text-violet-500" />
                    <span className="text-violet-700 font-medium">&quot;{m.manualValue}&quot;</span>
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1.5 text-slate-400">
                <MinusCircle className="w-3 h-3" />
                <span>Not mapped</span>
            </span>
        );
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-w-3xl mx-auto">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                        <Database className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Column Mapping</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            จับคู่คอลัมน์จาก <span className="font-medium text-slate-700">{fileName}</span> กับ features ที่โมเดลต้องการ
                        </p>
                    </div>
                </div>
            </div>

            {/* Status bar */}
            <div className={`px-6 py-2.5 flex items-center gap-2 text-xs border-b ${isValid ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                {isValid ? (
                    <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-medium">Ready — {mappedCount}/{MODEL_COLUMNS.length} columns mapped</span>
                    </>
                ) : (
                    <>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-amber-700 font-medium">
                            {requiredMissing.length} required column{requiredMissing.length > 1 ? 's' : ''} not mapped: {requiredMissing.map(c => c.label).join(', ')}
                        </span>
                    </>
                )}
                <button
                    onClick={autoMap}
                    className="ml-auto flex items-center gap-1 text-[11px] px-2.5 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium cursor-pointer"
                >
                    <Wand2 className="w-3 h-3" />
                    Auto Mapping
                </button>
                <button
                    onClick={resetMappings}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                </button>
            </div>

            {/* Mapping rows */}
            <div className="divide-y divide-slate-100">
                {MODEL_COLUMNS.map((col) => {
                    const mapping = mappings[col.key];
                    const isMapped = mapping.source !== 'none';
                    const isOpen = openDropdown === col.key;

                    return (
                        <div
                            key={col.key}
                            className={`px-6 py-3 flex items-center gap-3 transition-colors ${isMapped ? 'bg-white' : col.required ? 'bg-rose-50/30' : 'bg-slate-50/30'}`}
                        >
                            {/* Left: Model column */}
                            <div className="w-44 shrink-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-semibold text-slate-800">{col.label}</span>
                                    {col.required && (
                                        <span className="text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-full font-bold">REQUIRED</span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">{col.description}</p>
                            </div>

                            {/* Arrow */}
                            <ArrowRight className={`w-4 h-4 shrink-0 ${isMapped ? 'text-blue-400' : 'text-slate-300'}`} />

                            {/* Right: Dropdown selector */}
                            <div className="flex-1 relative">
                                <button
                                    onClick={() => setOpenDropdown(isOpen ? null : col.key)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all cursor-pointer ${
                                        isMapped
                                            ? 'border-blue-200 bg-blue-50/50 hover:border-blue-300'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                                >
                                    {renderMappingLabel(col.key)}
                                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown menu */}
                                {isOpen && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={() => setOpenDropdown(null)} />
                                        <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1 max-h-64 overflow-y-auto">
                                            {/* Not mapped option */}
                                            <button
                                                onClick={() => setMapping(col.key, { source: 'none' })}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                                            >
                                                <MinusCircle className="w-3.5 h-3.5 text-slate-400" />
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500">Not mapped</span>
                                                    {col.defaultValue !== undefined && (
                                                        <span className="text-[10px] text-slate-400 ml-1.5">default: {col.defaultValue}</span>
                                                    )}
                                                </div>
                                            </button>

                                            {/* Divider */}
                                            <div className="px-3 py-1.5 text-[10px] font-bold text-blue-500 uppercase tracking-wider border-t border-slate-100 mt-1">
                                                From Data ({data.headers.length} columns)
                                            </div>

                                            {/* Data columns */}
                                            {data.headers.map((h) => {
                                                const isUsed = usedColumns.has(h) && mapping.columnName !== h;
                                                return (
                                                    <button
                                                        key={h}
                                                        onClick={() => setMapping(col.key, { source: 'column', columnName: h })}
                                                        disabled={isUsed}
                                                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                                                            isUsed
                                                                ? 'opacity-40 cursor-not-allowed'
                                                                : mapping.columnName === h
                                                                ? 'bg-blue-50'
                                                                : 'hover:bg-slate-50 cursor-pointer'
                                                        }`}
                                                    >
                                                        <Database className={`w-3.5 h-3.5 ${mapping.columnName === h ? 'text-blue-600' : 'text-slate-400'}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <span className={`text-xs font-medium ${mapping.columnName === h ? 'text-blue-700' : 'text-slate-700'}`}>
                                                                {h}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 ml-2 truncate">
                                                                e.g. {getSampleValue(h)}
                                                            </span>
                                                        </div>
                                                        {mapping.columnName === h && (
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                        )}
                                                        {isUsed && (
                                                            <span className="text-[9px] text-slate-400 shrink-0">in use</span>
                                                        )}
                                                    </button>
                                                );
                                            })}

                                            {/* Manual input option */}
                                            <div className="px-3 py-1.5 text-[10px] font-bold text-violet-500 uppercase tracking-wider border-t border-slate-100 mt-1">
                                                Manual Input
                                            </div>
                                            <div className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <Keyboard className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                                                    <input
                                                        id={`manual-${col.key}`}
                                                        type="text"
                                                        placeholder={col.example ? `e.g. ${col.example}` : 'Type a value...'}
                                                        defaultValue={mapping.source === 'manual' ? mapping.manualValue : ''}
                                                        className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                const val = (e.target as HTMLInputElement).value.trim();
                                                                if (val) setMapping(col.key, { source: 'manual', manualValue: val });
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const input = document.getElementById(`manual-${col.key}`) as HTMLInputElement;
                                                            const val = input?.value?.trim();
                                                            if (val) setMapping(col.key, { source: 'manual', manualValue: val });
                                                        }}
                                                        className="text-[10px] px-2 py-1.5 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 cursor-pointer"
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-1 pl-5">
                                                    ค่านี้จะใช้เหมือนกันทุกแถว — กด Enter หรือ Apply
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-colors cursor-pointer"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Back
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={!isValid}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                        isValid
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm cursor-pointer'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    Proceed to Configure
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
