'use client';

import { useState, useRef, useCallback } from 'react';
import { MainLayout } from '@/components/layout/main-layout';

import { ModelSelector } from '@/components/ai/model-selector';
import { ocrPurchaseOrder } from '@/lib/api-client';
import {
    ScanLine, Upload, Loader2, FileImage, Trash2, Server,
    CheckCircle2, XCircle, Clock, Download, Copy, Eye
} from 'lucide-react';

interface DebugInfo {
    endpoint: string;
    model: string;
    filename: string;
    fileSize: string;
    mimeType: string;
    responseTime: number;
    status: 'idle' | 'loading' | 'success' | 'error';
    errorDetail?: string;
}

interface OCRResult {
    extracted: any;
    filename: string;
    file_size: number;
    mime_type: string;
}

export default function AIOcrPage() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<OCRResult | null>(null);
    const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8081';

    const handleFileSelect = useCallback((selectedFile: File) => {
        setFile(selectedFile);
        setResult(null);
        setDebugInfo(null);

        // Create preview URL
        const url = URL.createObjectURL(selectedFile);
        setPreview(url);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type.startsWith('image/')) {
            handleFileSelect(droppedFile);
        }
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    const clearAll = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setDebugInfo(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const runOCR = useCallback(async () => {
        if (!file || loading) return;

        setLoading(true);
        const startTime = Date.now();
        const debug: DebugInfo = {
            endpoint: `${apiBaseUrl}/api/v1/ai/ocr`,
            model: 'gemini-2.5-flash-lite (Vision)',
            filename: file.name,
            fileSize: `${(file.size / 1024).toFixed(1)} KB`,
            mimeType: file.type,
            responseTime: 0,
            status: 'loading',
        };
        setDebugInfo(debug);

        try {
            const data = await ocrPurchaseOrder(file);

            debug.responseTime = Date.now() - startTime;
            debug.status = 'success';
            setDebugInfo({ ...debug });
            setResult(data);
        } catch (err: any) {
            debug.responseTime = Date.now() - startTime;
            debug.status = 'error';
            debug.errorDetail = err.message;
            setDebugInfo({ ...debug });
        } finally {
            setLoading(false);
        }
    }, [file, loading, apiBaseUrl]);

    const copyJSON = () => {
        if (result?.extracted) {
            navigator.clipboard.writeText(JSON.stringify(result.extracted, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const downloadJSON = () => {
        if (result?.extracted) {
            const blob = new Blob([JSON.stringify(result.extracted, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ocr_${file?.name?.replace(/\.[^.]+$/, '') || 'result'}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const extracted = result?.extracted;
    const hasError = extracted?.error;
    const items = extracted?.items || [];

    return (
        <MainLayout
            title="AI OCR — Purchase Order Reader"
            description="อัปโหลดรูปภาพใบสั่งซื้อ (PO) แล้ว AI จะอ่านและดึงข้อมูลออกมาเป็นตาราง"
            action={<ModelSelector />}
        >
            <div className="space-y-6">
                {/* Sub-header badges */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium bg-violet-50 text-violet-700 border border-violet-200">
                        <ScanLine className="w-3.5 h-3.5" />
                        Gemini Vision OCR
                    </div>
                    {(file || result) && (
                        <button
                            onClick={clearAll}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear
                        </button>
                    )}
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Left: Upload + Preview */}
                    <div className="space-y-4">
                        {/* Upload Zone */}
                        {!file ? (
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-300 hover:border-violet-400 rounded-2xl p-12 text-center cursor-pointer transition-colors bg-white hover:bg-violet-50/30"
                            >
                                <div className="flex flex-col items-center gap-4">
                                    <div className="p-4 bg-violet-50 rounded-2xl">
                                        <Upload className="w-10 h-10 text-violet-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700">
                                            ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            PNG, JPEG, WebP, GIF (สูงสุด 10MB)
                                        </p>
                                    </div>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/gif"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleFileSelect(f);
                                    }}
                                />
                            </div>
                        ) : (
                            /* Image Preview */
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                                    <div className="flex items-center gap-2">
                                        <FileImage className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{file.name}</span>
                                        <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                    </div>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                                    >
                                        เปลี่ยนไฟล์
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/gif"
                                        className="hidden"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) handleFileSelect(f);
                                        }}
                                    />
                                </div>
                                {preview && (
                                    <div className="p-4 flex justify-center bg-slate-50/50">
                                        <img
                                            src={preview}
                                            alt="PO Preview"
                                            className="max-h-[500px] object-contain rounded-lg shadow-sm border border-slate-200"
                                        />
                                    </div>
                                )}
                                {/* OCR Button */}
                                <div className="px-4 py-3 border-t border-slate-100">
                                    <button
                                        onClick={runOCR}
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm shadow-sm"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                AI กำลังอ่านเอกสาร...
                                            </>
                                        ) : (
                                            <>
                                                <ScanLine className="w-4 h-4" />
                                                อ่านเอกสารด้วย AI
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Results */}
                    <div className="space-y-4">
                        {!result && !loading ? (
                            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <ScanLine className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-500">ยังไม่มีผลลัพธ์</p>
                                        <p className="text-xs text-slate-400 mt-1">อัปโหลดรูป PO แล้วกด "อ่านเอกสารด้วย AI"</p>
                                    </div>
                                </div>
                            </div>
                        ) : loading ? (
                            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                                <div className="flex flex-col items-center gap-4">
                                    <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                                    <p className="text-sm font-medium text-slate-600">Gemini Vision กำลังอ่านเอกสาร...</p>
                                </div>
                            </div>
                        ) : hasError ? (
                            <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center shadow-sm">
                                <XCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
                                <p className="text-sm font-medium text-rose-700">{extracted.error}</p>
                                {extracted.raw_text && (
                                    <pre className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-left text-slate-600 overflow-auto max-h-60">
                                        {extracted.raw_text}
                                    </pre>
                                )}
                            </div>
                        ) : (
                            /* Success Result */
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                {/* Result Header */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-emerald-50">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span className="text-sm font-bold text-emerald-800">ผลลัพธ์ OCR</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setViewMode(viewMode === 'table' ? 'json' : 'table')}
                                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                                        >
                                            <Eye className="w-3 h-3" />
                                            {viewMode === 'table' ? 'JSON' : 'Table'}
                                        </button>
                                        <button
                                            onClick={copyJSON}
                                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                                        >
                                            <Copy className="w-3 h-3" />
                                            {copied ? 'Copied!' : 'Copy'}
                                        </button>
                                        <button
                                            onClick={downloadJSON}
                                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                                        >
                                            <Download className="w-3 h-3" />
                                            JSON
                                        </button>
                                    </div>
                                </div>

                                {viewMode === 'table' ? (
                                    <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                                        {/* PO Header Info */}
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { label: 'PO Number', value: extracted?.po_number },
                                                { label: 'PO Date', value: extracted?.po_date },
                                                { label: 'Customer', value: extracted?.customer_name },
                                                { label: 'Delivery Date', value: extracted?.delivery_date },
                                            ].map((item, i) => (
                                                <div key={i} className="bg-slate-50 rounded-lg p-3">
                                                    <p className="text-[11px] text-slate-400 font-medium uppercase">{item.label}</p>
                                                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                                                        {item.value || <span className="text-slate-300">-</span>}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        {extracted?.customer_address && (
                                            <div className="bg-slate-50 rounded-lg p-3">
                                                <p className="text-[11px] text-slate-400 font-medium uppercase">Address</p>
                                                <p className="text-sm text-slate-700 mt-0.5">{extracted.customer_address}</p>
                                            </div>
                                        )}

                                        {/* Items Table */}
                                        {items.length > 0 && (
                                            <div>
                                                <p className="text-xs font-bold text-slate-600 mb-2 uppercase">
                                                    Items ({items.length})
                                                </p>
                                                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="bg-slate-50 text-slate-500">
                                                                <th className="px-3 py-2 text-left font-semibold">#</th>
                                                                <th className="px-3 py-2 text-left font-semibold">Product</th>
                                                                <th className="px-3 py-2 text-right font-semibold">Qty</th>
                                                                <th className="px-3 py-2 text-left font-semibold">Unit</th>
                                                                <th className="px-3 py-2 text-right font-semibold">Price</th>
                                                                <th className="px-3 py-2 text-right font-semibold">Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {items.map((item: any, idx: number) => (
                                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                                    <td className="px-3 py-2 text-slate-400">{item.line_no || idx + 1}</td>
                                                                    <td className="px-3 py-2">
                                                                        <div className="font-medium text-slate-800">{item.product_name || '-'}</div>
                                                                        {item.product_code && (
                                                                            <div className="text-[10px] text-slate-400">{item.product_code}</div>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right font-mono text-slate-700">
                                                                        {item.quantity?.toLocaleString() || '-'}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-slate-500">{item.unit || '-'}</td>
                                                                    <td className="px-3 py-2 text-right font-mono text-slate-700">
                                                                        {item.unit_price?.toLocaleString() || '-'}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">
                                                                        {item.total_price?.toLocaleString() || '-'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* Totals */}
                                        {(extracted?.subtotal || extracted?.grand_total) && (
                                            <div className="bg-blue-50 rounded-xl p-4 space-y-1.5">
                                                {extracted.subtotal != null && (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-500">Subtotal</span>
                                                        <span className="font-mono font-medium text-slate-700">{extracted.subtotal?.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {extracted.vat != null && (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-500">VAT</span>
                                                        <span className="font-mono font-medium text-slate-700">{extracted.vat?.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {extracted.grand_total != null && (
                                                    <div className="flex justify-between text-sm font-bold border-t border-blue-200 pt-1.5">
                                                        <span className="text-blue-800">Grand Total</span>
                                                        <span className="font-mono text-blue-800">{extracted.grand_total?.toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {extracted?.notes && (
                                            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                                                <p className="text-[11px] text-amber-600 font-medium uppercase">Notes</p>
                                                <p className="text-sm text-amber-800 mt-0.5">{extracted.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* JSON View */
                                    <div className="p-4">
                                        <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs overflow-auto max-h-[600px] font-mono leading-relaxed">
                                            {JSON.stringify(extracted, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Debug Panel (dev only) */}
                {process.env.NODE_ENV === 'development' && (
                <div className="bg-slate-900 text-slate-300 rounded-2xl overflow-hidden shadow-sm border border-slate-700">
                    <div className="flex items-center gap-2 px-5 py-2.5 border-b border-slate-700 bg-slate-800">
                        <Server className="w-4 h-4 text-slate-400" />
                        <h3 className="text-xs font-bold text-slate-200">OCR API Debug</h3>
                        {debugInfo && (
                            <span className={`ml-auto flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                debugInfo.status === 'success' ? 'bg-emerald-900/50 text-emerald-400' :
                                debugInfo.status === 'error' ? 'bg-rose-900/50 text-rose-400' :
                                debugInfo.status === 'loading' ? 'bg-blue-900/50 text-blue-400' :
                                'bg-slate-700 text-slate-400'
                            }`}>
                                {debugInfo.status === 'success' && <CheckCircle2 className="w-3 h-3" />}
                                {debugInfo.status === 'error' && <XCircle className="w-3 h-3" />}
                                {debugInfo.status === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
                                {debugInfo.status === 'idle' && <Clock className="w-3 h-3" />}
                                {debugInfo.status.toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="px-5 py-3 font-mono text-[11px]">
                        {!debugInfo ? (
                            <p className="text-slate-500 italic">อัปโหลดรูป PO เพื่อดูสถานะ API</p>
                        ) : (
                            <div className="flex flex-wrap gap-x-6 gap-y-1">
                                <span><span className="text-slate-500">Endpoint:</span> <span className="text-cyan-400">{debugInfo.endpoint}</span></span>
                                <span><span className="text-slate-500">Model:</span> <span className="text-yellow-400">{debugInfo.model}</span></span>
                                <span><span className="text-slate-500">File:</span> <span className="text-slate-300">{debugInfo.filename}</span></span>
                                <span><span className="text-slate-500">Size:</span> <span className="text-slate-300">{debugInfo.fileSize}</span></span>
                                <span><span className="text-slate-500">Type:</span> <span className="text-slate-300">{debugInfo.mimeType}</span></span>
                                <span><span className="text-slate-500">Time:</span> <span className={`font-semibold ${debugInfo.responseTime < 5000 ? 'text-emerald-400' : debugInfo.responseTime < 10000 ? 'text-yellow-400' : 'text-rose-400'}`}>{debugInfo.status === 'loading' ? '...' : `${(debugInfo.responseTime / 1000).toFixed(2)}s`}</span></span>
                                {debugInfo.status === 'success' && <span className="text-emerald-400">Gemini Vision Response (not hardcoded)</span>}
                                {debugInfo.errorDetail && <span className="text-rose-400">Error: {debugInfo.errorDetail}</span>}
                            </div>
                        )}
                    </div>
                </div>
                )}
            </div>
        </MainLayout>
    );
}
