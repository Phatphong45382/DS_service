'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, AlertCircle, Loader2 } from 'lucide-react';
import { ParsedData, parseFile } from '@/lib/file-utils';

interface UploadPanelProps {
    onDataParsed: (data: ParsedData, fileName: string, uploadResult?: any) => void;
}

/** The page's one big element: a dropzone tall enough to be the obvious target. */
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
                className={`relative flex min-h-[340px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition-colors ${
                    isDragActive ? 'border-blue-500 bg-blue-50'
                    : error ? 'border-rose-300 bg-rose-50/40'
                    : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/40'
                } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
            >
                <input {...getInputProps()} />
                {isProcessing ? (
                    <>
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                        <p className="mt-4 text-base font-semibold text-slate-800">Reading the file…</p>
                    </>
                ) : (
                    <>
                        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${isDragActive ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                            <UploadCloud className="h-8 w-8" strokeWidth={1.75} />
                        </div>
                        <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
                            {isDragActive ? 'Drop it to start' : 'Drop your sales history here'}
                        </h2>
                        <p className="mt-1.5 text-sm text-slate-500">
                            CSV or Excel, up to 10 MB. One row per customer, product and month.
                        </p>
                        <button
                            type="button"
                            onClick={open}
                            className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                            Choose a file
                        </button>
                    </>
                )}
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
