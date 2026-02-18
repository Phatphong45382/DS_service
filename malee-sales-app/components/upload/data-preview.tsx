'use client';

import { ParsedData } from '@/lib/file-utils';
import { CheckCircle2, AlertTriangle, XCircle, ChevronRight, ChevronDown, Table as TableIcon, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface DataPreviewProps {
    data: ParsedData;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DataPreview({ data, onConfirm, onCancel }: DataPreviewProps) {
    const [showErrors, setShowErrors] = useState(true);

    // Simple validation logic (Mock)
    const validationResults = {
        valid: data.summary.emptyCells === 0,
        errors: data.summary.emptyCells > 0 ? [`Found ${data.summary.emptyCells} empty cells`] : [],
        warnings: data.summary.rowCount < 12 ? ['Data history is less than 12 months'] : []
    };

    const hasIssues = validationResults.errors.length > 0 || validationResults.warnings.length > 0;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <TableIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Data Validation & Preview</h2>
                        <p className="text-sm text-slate-500">
                            Scanning {data.summary.rowCount.toLocaleString()} rows and {data.summary.colCount} columns
                        </p>
                    </div>
                </div>
            </div>

            {/* Validation Status Banner */}
            <div className={`px-6 py-4 border-b border-slate-100 flex items-start gap-4 transition-colors ${validationResults.valid ? 'bg-emerald-50/50' : 'bg-amber-50/50'
                }`}>
                <div className={`mt-0.5 p-1 rounded-full ${validationResults.valid ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    {validationResults.valid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                    )}
                </div>

                <div className="flex-1">
                    <h3 className={`font-bold text-sm ${validationResults.valid ? 'text-emerald-800' : 'text-amber-800'}`}>
                        {validationResults.valid ? 'All checks passed' : 'Attention Needed'}
                    </h3>

                    {!validationResults.valid && (
                        <div className="mt-2 space-y-2">
                            {validationResults.errors.map((err, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 px-3 py-1.5 rounded border border-rose-100 w-fit">
                                    <XCircle className="w-4 h-4" />
                                    <span>{err}</span>
                                </div>
                            ))}
                            {validationResults.warnings.map((warn, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded border border-amber-100 w-fit">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>{warn}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {validationResults.valid && (
                        <p className="text-sm text-emerald-600 mt-1">Data format matches requirements. You can proceed to configuration.</p>
                    )}
                </div>
            </div>

            {/* Preview Table */}
            <div className="border-t border-slate-100">
                <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Data Preview (First 5 Rows)</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-slate-500 w-16 text-center text-xs uppercase tracking-wider">#</th>
                                {data.headers.map((header, i) => (
                                    <th key={i} className="px-6 py-3 font-semibold text-slate-700 whitespace-nowrap text-xs uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {data.rows.slice(0, 5).map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-3 text-slate-400 font-mono text-xs text-center group-hover:text-slate-600">{i + 1}</td>
                                    {data.headers.map((header, j) => (
                                        <td key={j} className="px-6 py-3 text-slate-700 whitespace-nowrap">
                                            {row[header]?.toString() || <span className="text-rose-400 italic text-xs bg-rose-50 px-1.5 py-0.5 rounded">null</span>}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-center text-slate-500">
                    Showing first 5 rows of {data.summary.rowCount.toLocaleString()} records
                </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 z-10">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors text-sm"
                >
                    Back to Upload
                </button>
                <button
                    onClick={onConfirm}
                    className={`
                        px-4 py-2 rounded-lg font-medium transition-all shadow-sm text-sm flex items-center gap-2
                        ${!validationResults.valid && validationResults.errors.length > 0
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                        }
                    `}
                    disabled={!validationResults.valid && validationResults.errors.length > 0}
                >
                    Proceed to Configuration
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
