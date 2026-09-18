'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, AlertCircle, Loader2 } from 'lucide-react';
import { ParsedData, parseFile } from '@/lib/file-utils';

interface UploadPanelProps {
    onDataParsed: (data: ParsedData, fileName: string, uploadResult?: any) => void;
}

/** One horizontal row: icon, what to drop, a button. Sits inside the Source card. */
export function UploadPanel({ onDataParsed }: UploadPanelProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;
        const file = acceptedFiles[0];
        setIsProcessing(true);
        setError(null);
        try {
            const data = await parseFile(file);
            onDataParsed(data, file.name);
        } catch (err: any) {
            setError(err.detail || err.message || 'The file could not be read');
            console.error('Upload error:', err);
        } finally {
            setIsProcessing(false);
        }
    }, [onDataParsed]);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
        },
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024,
        disabled: isProcessing,
        noClick: true,
        onDropRejected: (rejections) => setError(rejections[0]?.errors[0]?.message ?? 'That file type is not supported'),
    });

    return (
        <div>
            <div
                {...getRootProps()}
                className={`flex flex-col items-center gap-4 rounded-xl border-2 border-dashed px-5 py-6 text-center transition-colors sm:flex-row sm:text-left ${
                    isDragActive ? 'border-blue-500 bg-blue-50'
                    : error ? 'border-rose-300 bg-rose-50/40'
                    : 'border-slate-300 bg-slate-50/60 hover:border-blue-400 hover:bg-blue-50/40'
                } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
            >
                <input {...getInputProps()} />
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${isDragActive ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                    {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-7 w-7" strokeWidth={1.75} />}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-slate-900">
                        {isProcessing ? 'Reading the file…' : isDragActive ? 'Drop it to start' : 'Drop a CSV or Excel file, or choose one'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">Up to 10 MB. One row per customer, product and month.</p>
                </div>
                <button
                    type="button"
                    onClick={open}
                    disabled={isProcessing}
                    className="shrink-0 rounded-lg border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
                >
                    Choose a file
                </button>
            </div>

            {error && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    <div className="text-sm">
                        <p className="font-semibold text-rose-800">The file was not accepted</p>
                        <p className="text-rose-700">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
