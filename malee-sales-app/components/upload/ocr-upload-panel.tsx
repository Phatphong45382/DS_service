'use client';

import { useState, useRef, useCallback } from 'react';
import { ScanLine, Upload, Loader2, FileImage, Trash2, CheckCircle2, XCircle, Pencil, ChevronDown, Zap, Brain, Sparkles } from 'lucide-react';
import { ocrPurchaseOrder } from '@/lib/api-client';
import { ParsedData } from '@/lib/file-utils';

interface OCRUploadPanelProps {
    onDataParsed: (data: ParsedData, fileName: string) => void;
}

interface EditableItem {
    line_no: number;
    product_code: string;
    product_name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
}

interface EditableHeader {
    po_number: string;
    po_date: string;
    customer_name: string;
    delivery_date: string;
    customer_address: string;
}

const OCR_MODELS = [
    { id: 'gemini-2.5-flash-lite', name: 'Flash Lite', desc: 'Fast & free quota', icon: Zap },
    { id: 'gemini-2.5-flash', name: 'Flash', desc: 'Balanced performance', icon: Brain },
    { id: 'gemini-3-flash-preview', name: '3 Flash Preview', desc: 'Latest preview model', icon: Sparkles },
];

export function OCRUploadPanel({ onDataParsed }: OCRUploadPanelProps) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ocrResult, setOcrResult] = useState<any>(null);
    const [responseTime, setResponseTime] = useState<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedModel, setSelectedModel] = useState(OCR_MODELS[0].id);
    const [showModelPicker, setShowModelPicker] = useState(false);
    const [modelUsed, setModelUsed] = useState<string>('');

    // Editable state
    const [editableHeader, setEditableHeader] = useState<EditableHeader | null>(null);
    const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
    const [editedCells, setEditedCells] = useState<Set<string>>(new Set());

    const handleFileSelect = useCallback((selectedFile: File) => {
        setFile(selectedFile);
        setOcrResult(null);
        setEditableHeader(null);
        setEditableItems([]);
        setEditedCells(new Set());
        setError(null);
        const url = URL.createObjectURL(selectedFile);
        setPreview(url);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.type.startsWith('image/') || droppedFile.type === 'application/pdf')) {
            handleFileSelect(droppedFile);
        }
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    const clearAll = () => {
        setFile(null);
        setPreview(null);
        setOcrResult(null);
        setEditableHeader(null);
        setEditableItems([]);
        setEditedCells(new Set());
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const runOCR = useCallback(async () => {
        if (!file || loading) return;
        setLoading(true);
        setError(null);
        const startTime = Date.now();

        try {
            const data = await ocrPurchaseOrder(file, undefined, selectedModel);
            setResponseTime(Date.now() - startTime);
            setModelUsed(data.model_used || selectedModel);
            const extracted = data.extracted;

            if (extracted?.error) {
                setError(extracted.error);
                return;
            }

            setOcrResult(extracted);

            // Initialize editable state from OCR result
            setEditableHeader({
                po_number: extracted.po_number || '',
                po_date: extracted.po_date || '',
                customer_name: extracted.customer_name || '',
                delivery_date: extracted.delivery_date || '',
                customer_address: extracted.customer_address || '',
            });

            const items = (extracted.items || []).map((item: any, idx: number) => ({
                line_no: item.line_no || idx + 1,
                product_code: item.product_code || '',
                product_name: item.product_name || '',
                quantity: item.quantity || 0,
                unit: item.unit || '',
                unit_price: item.unit_price || 0,
                total_price: item.total_price || 0,
            }));
            setEditableItems(items);
            setEditedCells(new Set());
        } catch (err: any) {
            setResponseTime(Date.now() - startTime);
            setError(err.message || 'OCR failed');
        } finally {
            setLoading(false);
        }
    }, [file, loading]);

    // Header field edit
    const updateHeader = (field: keyof EditableHeader, value: string) => {
        if (!editableHeader) return;
        setEditableHeader({ ...editableHeader, [field]: value });
        setEditedCells(prev => new Set(prev).add(`header_${field}`));
    };

    // Item field edit with auto-recalculate
    const updateItem = (idx: number, field: keyof EditableItem, value: string) => {
        setEditableItems(prev => {
            const updated = [...prev];
            const item = { ...updated[idx] };

            if (field === 'quantity' || field === 'unit_price' || field === 'total_price') {
                (item as any)[field] = parseFloat(value) || 0;
            } else {
                (item as any)[field] = value;
            }

            // Auto-recalculate total_price when qty or price changes
            if (field === 'quantity' || field === 'unit_price') {
                item.total_price = item.quantity * item.unit_price;
                setEditedCells(prev => new Set(prev).add(`item_${idx}_total_price`));
            }

            updated[idx] = item;
            return updated;
        });
        setEditedCells(prev => new Set(prev).add(`item_${idx}_${field}`));
    };

    // Computed totals
    const computedSubtotal = editableItems.reduce((sum, item) => sum + item.total_price, 0);
    const computedVat = Math.round(computedSubtotal * 0.07);
    const computedGrandTotal = computedSubtotal + computedVat;

    // Convert edited data to ParsedData
    const handleConfirmOCR = () => {
        if (!editableItems.length) return;

        const headers = ['line_no', 'product_code', 'product_name', 'quantity', 'unit', 'unit_price', 'total_price'];
        const rows = editableItems.map(item => ({ ...item }));

        let emptyCells = 0;
        rows.forEach((row: any) => {
            Object.values(row).forEach(val => {
                if (val === null || val === undefined || val === '') emptyCells++;
            });
        });

        const parsedData: ParsedData = {
            headers,
            rows,
            summary: {
                rowCount: rows.length,
                colCount: headers.length,
                emptyCells,
            },
        };

        const sourceInfo = `OCR_${editableHeader?.po_number || 'PO'}_${editableHeader?.customer_name || 'unknown'}`;
        onDataParsed(parsedData, `${sourceInfo}.json`);
    };

    const isEdited = (key: string) => editedCells.has(key);

    // Editable cell styling
    const editCellClass = (key: string, base: string = '') =>
        `${base} relative group ${isEdited(key) ? 'bg-amber-50 ring-1 ring-amber-300' : 'hover:bg-blue-50/50'}`;

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-full flex flex-col">
            {/* Compact content area */}
            <div className="p-4 flex-1 flex flex-col">
                {/* Step 1: Upload */}
                {!file ? (
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 hover:border-violet-400 rounded-lg flex-1 flex items-center justify-center text-center cursor-pointer transition-colors hover:bg-violet-50/30"
                    >
                        <div className="flex flex-col items-center gap-2 py-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-violet-100">
                                <Upload className="w-6 h-6 text-violet-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-800">
                                    ลากไฟล์มาวาง หรือคลิกเพื่อเลือก
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">PNG, JPEG, WebP, PDF — max 10MB</p>
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileSelect(f);
                            }}
                        />
                    </div>
                ) : !ocrResult ? (
                    /* Step 2: Preview + Run OCR */
                    <div className="space-y-4">
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                                <div className="flex items-center gap-2">
                                    <FileImage className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-700 truncate max-w-[250px]">{file.name}</span>
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
                                    accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleFileSelect(f);
                                    }}
                                />
                            </div>
                            {preview && file.type.startsWith('image/') && (
                                <div className="p-4 flex justify-center bg-slate-50/50">
                                    <img
                                        src={preview}
                                        alt="PO Preview"
                                        className="max-h-[350px] object-contain rounded-lg shadow-sm border border-slate-200"
                                    />
                                </div>
                            )}
                            {file.type === 'application/pdf' && (
                                <div className="p-8 text-center bg-slate-50/50">
                                    <div className="p-3 bg-rose-50 rounded-xl inline-block mb-3">
                                        <FileImage className="w-8 h-8 text-rose-400" />
                                    </div>
                                    <p className="text-sm text-slate-600 font-medium">{file.name}</p>
                                    <p className="text-xs text-slate-400 mt-1">PDF Preview ไม่สามารถแสดงได้ — กด OCR เพื่ออ่านข้อมูล</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={runOCR}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-sm shadow-sm"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    AI กำลังอ่านเอกสาร...
                                </>
                            ) : (
                                <>
                                    <ScanLine className="w-4 h-4" />
                                    อ่านเอกสารด้วย AI ({OCR_MODELS.find(m => m.id === selectedModel)?.name || 'Gemini'})
                                </>
                            )}
                        </button>

                        {error && (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <XCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                                    <div>
                                        <h4 className="text-sm font-semibold text-rose-800">OCR Error</h4>
                                        <p className="text-sm text-rose-700 mt-1">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Step 3: Editable OCR Results */
                    <div className="space-y-4">
                        {/* Success Banner */}
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-emerald-800">
                                    AI อ่านเอกสารสำเร็จ — {editableItems.length} รายการ
                                </p>
                                <p className="text-xs text-emerald-600 mt-0.5">
                                    ใช้เวลา {(responseTime / 1000).toFixed(2)}s | {OCR_MODELS.find(m => m.id === modelUsed)?.name || modelUsed}
                                </p>
                            </div>
                        </div>

                        {/* Edit hint */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <Pencil className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <p className="text-xs text-amber-700">
                                <span className="font-semibold">คลิกที่ค่าเพื่อแก้ไข</span> — ถ้า AI อ่านผิด สามารถแก้ได้ก่อนกด confirm | เซลล์ที่แก้แล้วจะเป็น
                                <span className="inline-block w-3 h-3 bg-amber-100 ring-1 ring-amber-300 rounded-sm mx-1 align-middle" />
                                สีเหลือง
                            </p>
                        </div>

                        {/* Editable PO Header */}
                        {editableHeader && (
                            <div className="grid grid-cols-2 gap-3">
                                {([
                                    { key: 'po_number' as const, label: 'PO Number' },
                                    { key: 'po_date' as const, label: 'PO Date' },
                                    { key: 'customer_name' as const, label: 'Customer' },
                                    { key: 'delivery_date' as const, label: 'Delivery Date' },
                                ]).map((field) => (
                                    <div
                                        key={field.key}
                                        className={`rounded-lg p-3 transition-all ${
                                            isEdited(`header_${field.key}`)
                                                ? 'bg-amber-50 ring-1 ring-amber-300'
                                                : 'bg-slate-50'
                                        }`}
                                    >
                                        <p className="text-[11px] text-slate-400 font-medium uppercase flex items-center gap-1">
                                            {field.label}
                                            {isEdited(`header_${field.key}`) && (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-amber-200 text-amber-700 rounded-full font-bold">EDITED</span>
                                            )}
                                        </p>
                                        <input
                                            type="text"
                                            value={editableHeader[field.key]}
                                            onChange={(e) => updateHeader(field.key, e.target.value)}
                                            className="w-full text-sm font-semibold text-slate-800 mt-0.5 bg-transparent border-none outline-none focus:ring-0 p-0 cursor-text hover:text-blue-700 focus:text-blue-700"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Editable Address */}
                        {editableHeader && editableHeader.customer_address && (
                            <div className={`rounded-lg p-3 transition-all ${
                                isEdited('header_customer_address') ? 'bg-amber-50 ring-1 ring-amber-300' : 'bg-slate-50'
                            }`}>
                                <p className="text-[11px] text-slate-400 font-medium uppercase flex items-center gap-1">
                                    Address
                                    {isEdited('header_customer_address') && (
                                        <span className="text-[9px] px-1.5 py-0.5 bg-amber-200 text-amber-700 rounded-full font-bold">EDITED</span>
                                    )}
                                </p>
                                <input
                                    type="text"
                                    value={editableHeader.customer_address}
                                    onChange={(e) => updateHeader('customer_address', e.target.value)}
                                    className="w-full text-sm text-slate-700 mt-0.5 bg-transparent border-none outline-none focus:ring-0 p-0 cursor-text hover:text-blue-700 focus:text-blue-700"
                                />
                            </div>
                        )}

                        {/* Editable Items Table */}
                        {editableItems.length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-slate-600 mb-2 uppercase">
                                    Items ({editableItems.length})
                                </p>
                                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500">
                                                <th className="px-3 py-2 text-left font-semibold w-8">#</th>
                                                <th className="px-3 py-2 text-left font-semibold w-20">Code</th>
                                                <th className="px-3 py-2 text-left font-semibold">Product</th>
                                                <th className="px-3 py-2 text-right font-semibold w-20">Qty</th>
                                                <th className="px-3 py-2 text-left font-semibold w-16">Unit</th>
                                                <th className="px-3 py-2 text-right font-semibold w-24">Price</th>
                                                <th className="px-3 py-2 text-right font-semibold w-28">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {editableItems.map((item, idx) => (
                                                <tr key={idx}>
                                                    {/* Line No - read only */}
                                                    <td className="px-3 py-1.5 text-slate-400">{item.line_no}</td>

                                                    {/* Product Code */}
                                                    <td className={editCellClass(`item_${idx}_product_code`, 'px-1 py-1')}>
                                                        <input
                                                            type="text"
                                                            value={item.product_code}
                                                            onChange={(e) => updateItem(idx, 'product_code', e.target.value)}
                                                            className="w-full bg-transparent border-none outline-none p-1 text-xs text-slate-600 rounded hover:bg-blue-50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-300"
                                                        />
                                                    </td>

                                                    {/* Product Name */}
                                                    <td className={editCellClass(`item_${idx}_product_name`, 'px-1 py-1')}>
                                                        <input
                                                            type="text"
                                                            value={item.product_name}
                                                            onChange={(e) => updateItem(idx, 'product_name', e.target.value)}
                                                            className="w-full bg-transparent border-none outline-none p-1 text-xs font-medium text-slate-800 rounded hover:bg-blue-50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-300"
                                                        />
                                                    </td>

                                                    {/* Quantity */}
                                                    <td className={editCellClass(`item_${idx}_quantity`, 'px-1 py-1')}>
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                                            className="w-full bg-transparent border-none outline-none p-1 text-xs text-right font-mono text-slate-700 rounded hover:bg-blue-50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-300"
                                                        />
                                                    </td>

                                                    {/* Unit */}
                                                    <td className={editCellClass(`item_${idx}_unit`, 'px-1 py-1')}>
                                                        <input
                                                            type="text"
                                                            value={item.unit}
                                                            onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                                                            className="w-full bg-transparent border-none outline-none p-1 text-xs text-slate-500 rounded hover:bg-blue-50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-300"
                                                        />
                                                    </td>

                                                    {/* Unit Price */}
                                                    <td className={editCellClass(`item_${idx}_unit_price`, 'px-1 py-1')}>
                                                        <input
                                                            type="number"
                                                            value={item.unit_price}
                                                            onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                                                            className="w-full bg-transparent border-none outline-none p-1 text-xs text-right font-mono text-slate-700 rounded hover:bg-blue-50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-300"
                                                        />
                                                    </td>

                                                    {/* Total Price (auto-calculated) */}
                                                    <td className={`px-3 py-1.5 text-right font-mono font-semibold transition-all ${
                                                        isEdited(`item_${idx}_total_price`)
                                                            ? 'text-amber-700 bg-amber-50'
                                                            : 'text-slate-800'
                                                    }`}>
                                                        {item.total_price.toLocaleString()}
                                                        {isEdited(`item_${idx}_total_price`) && (
                                                            <span className="text-[9px] ml-1 text-amber-500">auto</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Auto-calculated Totals */}
                        <div className="bg-blue-50 rounded-xl p-4 space-y-1.5 border border-blue-200">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Subtotal</span>
                                <span className="font-mono font-medium text-slate-700">{computedSubtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">VAT 7%</span>
                                <span className="font-mono font-medium text-slate-700">{computedVat.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold border-t border-blue-200 pt-1.5">
                                <span className="text-blue-800">Grand Total</span>
                                <span className="font-mono text-blue-800">{computedGrandTotal.toLocaleString()} บาท</span>
                            </div>
                            {editedCells.size > 0 && (
                                <p className="text-[10px] text-amber-600 pt-1">
                                    * Subtotal/VAT/Grand Total คำนวณใหม่อัตโนมัติจากค่าที่แก้ไข
                                </p>
                            )}
                        </div>

                        {/* Edit counter */}
                        {editedCells.size > 0 && (
                            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                <Pencil className="w-3 h-3" />
                                <span>แก้ไขแล้ว {editedCells.size} จุด</span>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={clearAll}
                                className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium"
                            >
                                อ่านใหม่
                            </button>
                            <button
                                onClick={handleConfirmOCR}
                                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm"
                            >
                                ใช้ข้อมูลนี้ → Preview
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer with model selector + clear */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <p className="text-xs text-slate-400">AI จะอ่านข้อมูลจากรูป/PDF อัตโนมัติ</p>
                <div className="flex items-center gap-2">
                    {/* Model Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowModelPicker(!showModelPicker)}
                            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium text-violet-700 bg-violet-100 hover:bg-violet-200 border border-violet-200 transition-colors"
                        >
                            {(() => { const m = OCR_MODELS.find(m => m.id === selectedModel); const Icon = m?.icon || Zap; return <Icon className="w-3 h-3" />; })()}
                            {OCR_MODELS.find(m => m.id === selectedModel)?.name || 'Flash Lite'}
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        {showModelPicker && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowModelPicker(false)} />
                                <div className="absolute right-0 bottom-full mb-1 z-50 w-60 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5">
                                    <div className="px-3 py-1 text-[10px] font-bold text-violet-600 uppercase tracking-wider">
                                        Gemini Model
                                    </div>
                                    {OCR_MODELS.map((m) => {
                                        const Icon = m.icon;
                                        const isSelected = selectedModel === m.id;
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors ${isSelected ? 'bg-violet-50' : ''}`}
                                            >
                                                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-violet-600' : 'text-slate-400'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-xs font-medium ${isSelected ? 'text-violet-700' : 'text-slate-700'}`}>{m.name}</span>
                                                        {isSelected && <span className="text-violet-600 text-[10px]">&#10003;</span>}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">{m.desc}</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {(file || ocrResult) && (
                        <button
                            onClick={clearAll}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors"
                        >
                            <Trash2 className="w-3 h-3" />
                            Clear
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
