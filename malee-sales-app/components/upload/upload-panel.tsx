'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, AlertCircle, Download, Loader2 } from 'lucide-react';
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
            const { uploadFileToDataiku, getJobStatus } = await import('@/lib/api-client');

            const uploadResult = await uploadFileToDataiku(file);
            console.log('✓ Upload started, Job ID:', uploadResult.job_id);

            if (uploadResult.job_id) {
                setUploadStatus('Processing data pipeline...');

                const pollStatus = async () => {
                    try {
                        const status = await getJobStatus(uploadResult.job_id!);
                        setProgress(status.progress || 0);

                        if (status.status === 'completed') {
                            setUploadStatus('Finalizing...');
                            const data = await parseFile(file);
                            setIsProcessing(false);
                            onDataParsed(data, file.name, uploadResult);
                        } else if (status.status === 'failed') {
                            throw new Error(status.error || 'Pipeline processing failed');
                        } else {
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
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-full flex flex-col">
            {/* Compact dropzone */}
            <div
                {...getRootProps()}
                className={`
                    relative border-2 border-dashed rounded-lg m-4 flex-1 flex items-center justify-center text-center cursor-pointer transition-all
                    ${isDragActive
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/30'
                    }
                    ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
                    ${error ? 'border-rose-300 bg-rose-50/30' : ''}
                `}
            >
                <input {...getInputProps()} />

                {isProcessing ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <div>
                            <p className="text-sm font-medium text-slate-700">{uploadStatus}</p>
                            {progress > 0 && (
                                <div className="w-48 mx-auto h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 py-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            isDragActive ? 'bg-blue-100' : 'bg-slate-100'
                        }`}>
                            <UploadCloud className={`w-6 h-6 ${isDragActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-800">
                                {isDragActive ? 'Drop file here' : 'Drag & drop or click to browse'}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">CSV, Excel — max 10MB</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="mx-4 mb-4 p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-xs font-semibold text-rose-800">Upload Failed</p>
                        <p className="text-xs text-rose-700 mt-0.5">{error}</p>
                    </div>
                </div>
            )}

        </div>
    );
}
