'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileSpreadsheet, X, AlertCircle, CheckCircle2, Download, FileText, Loader2 } from 'lucide-react';
import { ParsedData, parseFile } from '@/lib/file-utils';

interface UploadPanelProps {
    onDataParsed: (data: ParsedData, fileName: string, uploadResult?: any) => void;
}

export function UploadPanel({ onDataParsed }: UploadPanelProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadStatus, setUploadStatus] = useState<string>('');
    const [progress, setProgress] = useState(0);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        setIsProcessing(true);
        setError(null);
        setUploadStatus('Uploading file...');
        setProgress(0);

        try {
            // Import API client
            const { uploadFileToDataiku, getJobStatus } = await import('@/lib/api-client');

            // Upload to Dataiku via backend
            const uploadResult = await uploadFileToDataiku(file);
            console.log('✓ Upload started, Job ID:', uploadResult.job_id);

            // If job_id is returned, poll for status
            if (uploadResult.job_id) {
                setUploadStatus('Processing data pipeline...');

                // Poll function
                const pollStatus = async () => {
                    try {
                        const status = await getJobStatus(uploadResult.job_id!);
                        setProgress(status.progress || 0);

                        if (status.status === 'completed') {
                            // Success
                            setUploadStatus('Finalizing...');
                            const data = await parseFile(file);
                            setIsProcessing(false);
                            onDataParsed(data, file.name, uploadResult);
                        } else if (status.status === 'failed') {
                            throw new Error(status.error || 'Pipeline processing failed');
                        } else {
                            // Continue polling
                            setTimeout(pollStatus, 3000);
                        }
                    } catch (err: any) {
                        const errorMessage = err.detail || err.message || 'Pipeline check failed';
                        setError(errorMessage);
                        setIsProcessing(false);
                    }
                };

                await pollStatus();
            } else {
                // Fallback for immediate success
                const data = await parseFile(file);
                setIsProcessing(false);
                onDataParsed(data, file.name, uploadResult);
            }
        } catch (err: any) {
            const errorMessage = err.detail || err.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์';
            setError(errorMessage);
            setIsProcessing(false);
            console.error('Upload error:', err);
        }
    }, [onDataParsed]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
        maxFiles: 1,
        disabled: isProcessing
    });

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <UploadCloud className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Upload New Data</h2>
                        <p className="text-sm text-slate-500">Import sales history to generate forecast</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">
                        <Download className="w-4 h-4" />
                        Template.csv
                    </button>
                </div>
            </div>

            <div className="p-8">
                <div
                    {...getRootProps()}
                    className={`
                        relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ease-in-out
                        ${isDragActive
                            ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50'
                        }
                        ${isProcessing ? 'opacity-50 pointer-events-none cursor-wait' : ''}
                        ${error ? 'border-rose-300 bg-rose-50/30' : ''}
                    `}
                >
                    <input {...getInputProps()} />

                    <div className={`
                        w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm transition-transform duration-300
                        ${isDragActive ? 'bg-blue-100 scale-110 rotate-3' : 'bg-slate-100'}
                        ${error ? 'bg-rose-100' : ''}
                    `}>
                        {isProcessing ? (
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        ) : error ? (
                            <AlertCircle className="w-8 h-8 text-rose-600" />
                        ) : (
                            <UploadCloud className={`w-8 h-8 ${isDragActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        )}
                    </div>

                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        {isProcessing ? (
                            <span className="flex flex-col items-center gap-2">
                                <span>{uploadStatus}</span>
                                {progress > 0 && (
                                    <span className="text-sm font-normal text-slate-500">
                                        {progress}% Completed
                                    </span>
                                )}
                            </span>
                        ) : (
                            isDragActive ? "Drop the file here" : "Drag & drop file here"
                        )}
                    </h3>

                    {isProcessing && progress > 0 && (
                        <div className="w-full max-w-xs mx-auto h-1.5 bg-slate-200 rounded-full mt-4 overflow-hidden">
                            <div
                                className="h-full bg-blue-500 transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}

                    {!isProcessing && (
                        <>
                            <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto">
                                Support CSV, Excel files. Max file size 10MB.<br />
                                Ensure columns match the standard template.
                            </p>

                            <div className="flex flex-col items-center gap-4">
                                <button
                                    className={`
                                        relative overflow-hidden px-8 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm
                                        ${isDragActive
                                            ? 'bg-blue-600 text-white shadow-blue-200'
                                            : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md'
                                        }
                                    `}
                                >
                                    Browse Files
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {error && (
                    <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-lg animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-rose-800">Upload Failed</h4>
                                <p className="text-sm text-rose-700 mt-1 whitespace-pre-line">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8 flex items-center justify-center gap-8 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Sales Data</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        <span>Inventory Logs</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Secure Transfer</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
