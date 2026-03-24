'use client';

import { MainLayout } from '@/components/layout/main-layout';

import { UploadPanel } from '@/components/upload/upload-panel';
import { OCRUploadPanel } from '@/components/upload/ocr-upload-panel';
import { DataPreview } from '@/components/upload/data-preview';
import { ColumnMapping } from '@/components/upload/column-mapping';
import { ForecastConfig } from '@/components/upload/forecast-config';
import { RunResults } from '@/components/upload/run-results';
import { ParsedData } from '@/lib/file-utils';
import { useState } from 'react';
import { FileSpreadsheet, ScanLine, Check, Upload, Eye, Settings2, BarChart3, ChevronRight, Download, ArrowRight, Lightbulb, RotateCcw, CheckCircle2, AlertTriangle, XCircle, AlertCircle, Database } from 'lucide-react';

type Step = 'upload' | 'preview' | 'mapping' | 'configure' | 'results';
type UploadMode = 'excel' | 'ocr';

export default function NewPredictionPage() {
    const [currentStep, setCurrentStep] = useState<Step>('upload');
    const [uploadMode, setUploadMode] = useState<UploadMode>('excel');
    const [uploadedData, setUploadedData] = useState<ParsedData | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [uploadResult, setUploadResult] = useState<any>(null);
    const [isRunning, setIsRunning] = useState(false);

    const handleDataParsed = (data: ParsedData, name: string, result?: any) => {
        setUploadedData(data);
        setFileName(name);
        setUploadResult(result);
        // Stay on upload step — show inline preview
    };

    const [mappedData, setMappedData] = useState<ParsedData | null>(null);

    const handleConfirmPreview = () => {
        setCurrentStep('mapping');
    };

    const handleMappingConfirm = (mapped: ParsedData) => {
        setMappedData(mapped);
        setCurrentStep('configure');
    };

    const [resultData, setResultData] = useState<any>(null);

    const handleRunForecast = async () => {
        setIsRunning(true);
        try {
            const { runForecast, getForecastResults } = await import('@/lib/api-client');

            console.log("Starting forecast...");
            await runForecast();

            console.log("Waiting 25s for Dataiku processing...");
            const WAIT_SECONDS = 25;

            for (let i = 0; i < WAIT_SECONDS; i++) {
                if (i % 5 === 0) {
                    console.log(`... waiting ${i}/${WAIT_SECONDS}s`);
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log("Wait complete. Fetching results...");

            const data = await getForecastResults();
            setResultData(data);
            setCurrentStep('results');

        } catch (error) {
            console.error('Failed to run forecast:', error);
            alert("Forecast failed: " + (error instanceof Error ? error.message : "Unknown error"));
        } finally {
            setIsRunning(false);
        }
    };

    const stepperItems = [
        { key: 'upload', label: 'Upload', icon: Upload },
        { key: 'preview', label: 'Preview', icon: Eye },
        { key: 'mapping', label: 'Mapping', icon: Database },
        { key: 'configure', label: 'Configure', icon: Settings2 },
        { key: 'results', label: 'Results', icon: BarChart3 },
    ];
    const stepKeys = ['upload', 'preview', 'mapping', 'configure', 'results'];
    // When data is uploaded but still on upload step, treat as "preview" active
    const effectiveStep = (currentStep === 'upload' && uploadedData) ? 'preview' : currentStep;
    const currentIdx = stepKeys.indexOf(effectiveStep);

    return (
        <MainLayout
            title="New Prediction"
            description="Upload new sales data to generate updated forecasts"
        >
            <div className="space-y-6 max-w-6xl mx-auto pt-0">

                {/* Compact Inline Stepper */}
                <div className="flex items-center gap-1.5">
                    {stepperItems.map((step, idx, arr) => {
                        const isActive = effectiveStep === step.key;
                        const isCompleted = currentIdx > idx;
                        const Icon = step.icon;
                        return (
                            <div key={step.key} className="flex items-center gap-1.5">
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                    isActive ? 'bg-blue-600 text-white shadow-sm'
                                    : isCompleted ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-400'
                                }`}>
                                    {isCompleted ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                                    {step.label}
                                </div>
                                {idx < arr.length - 1 && (
                                    <ChevronRight className={`w-3 h-3 ${currentIdx > idx ? 'text-emerald-400' : 'text-slate-300'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="min-h-[500px]">
                    {currentStep === 'upload' && (
                        <div className="space-y-5">
                            {/* Upload Mode - Compact Pill Tabs */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setUploadMode('excel')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                        uploadMode === 'excel'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    Excel / CSV
                                </button>
                                <button
                                    onClick={() => setUploadMode('ocr')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                        uploadMode === 'ocr'
                                            ? 'bg-violet-600 text-white shadow-sm'
                                            : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <ScanLine className="w-4 h-4" />
                                    AI OCR
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                        uploadMode === 'ocr' ? 'bg-white/20 text-white' : 'bg-violet-100 text-violet-600'
                                    }`}>
                                        GenAI
                                    </span>
                                </button>
                            </div>

                            {/* 2-Column Layout */}
                            <div className="grid grid-cols-5 gap-5">
                                {/* Left — Upload or Inline Preview (3/5) */}
                                <div className="col-span-3">
                                    {uploadedData ? (
                                        /* Inline Preview */
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-full flex flex-col">
                                            {/* Validation banner */}
                                            {(() => {
                                                const valid = uploadedData.summary.emptyCells === 0;
                                                const errors = uploadedData.summary.emptyCells > 0 ? [`Found ${uploadedData.summary.emptyCells} empty cells`] : [];
                                                const warnings = uploadedData.summary.rowCount < 12 ? ['Data history < 12 months'] : [];
                                                return (
                                                    <div className={`px-4 py-3 flex items-center gap-3 border-b ${valid ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                                        {valid ? (
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                                        ) : (
                                                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-xs font-semibold ${valid ? 'text-emerald-800' : 'text-amber-800'}`}>
                                                                {valid ? 'All checks passed' : 'Attention needed'}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500">
                                                                {uploadedData.summary.rowCount.toLocaleString()} rows, {uploadedData.summary.colCount} columns
                                                                {fileName && <span className="ml-1 text-slate-400">— {fileName}</span>}
                                                            </p>
                                                            {errors.map((e, i) => (
                                                                <div key={i} className="flex items-center gap-1 mt-1 text-[11px] text-rose-600">
                                                                    <XCircle className="w-3 h-3" /> {e}
                                                                </div>
                                                            ))}
                                                            {warnings.map((w, i) => (
                                                                <div key={i} className="flex items-center gap-1 mt-1 text-[11px] text-amber-600">
                                                                    <AlertCircle className="w-3 h-3" /> {w}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Compact table */}
                                            <div className="flex-1 overflow-auto">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                                                        <tr>
                                                            <th className="px-3 py-2 text-center text-slate-400 font-semibold w-8">#</th>
                                                            {uploadedData.headers.map((h, i) => (
                                                                <th key={i} className="px-3 py-2 text-left text-slate-600 font-semibold whitespace-nowrap">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {uploadedData.rows.slice(0, 5).map((row, i) => (
                                                            <tr key={i} className="hover:bg-slate-50/50">
                                                                <td className="px-3 py-1.5 text-center text-slate-400 font-mono">{i + 1}</td>
                                                                {uploadedData.headers.map((h, j) => (
                                                                    <td key={j} className="px-3 py-1.5 text-slate-700 whitespace-nowrap">
                                                                        {row[h]?.toString() || <span className="text-rose-400 italic">null</span>}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                                                    Showing first 5 of {uploadedData.summary.rowCount.toLocaleString()} rows
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="px-4 py-3 border-t border-slate-200 flex items-center gap-2 bg-white">
                                                <button
                                                    onClick={() => { setUploadedData(null); setFileName(''); setUploadResult(null); }}
                                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                                >
                                                    <RotateCcw className="w-3 h-3" />
                                                    Re-upload
                                                </button>
                                                <button
                                                    onClick={() => setCurrentStep('mapping')}
                                                    disabled={uploadedData.summary.emptyCells > 0}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                                                        uploadedData.summary.emptyCells > 0
                                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                                    }`}
                                                >
                                                    Proceed to Mapping
                                                    <ChevronRight className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Upload Panel */
                                        uploadMode === 'excel' ? (
                                            <UploadPanel onDataParsed={handleDataParsed} />
                                        ) : (
                                            <OCRUploadPanel onDataParsed={handleDataParsed} />
                                        )
                                    )}
                                </div>

                                {/* Right — Info Cards (2/5) */}
                                <div className="col-span-2 space-y-4">
                                    {/* How it works */}
                                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">How it works</h3>
                                        <div className="space-y-2.5">
                                            {[
                                                { n: '1', text: 'Upload data or scan PO', active: true },
                                                { n: '2', text: 'Preview & validate', active: false },
                                                { n: '3', text: 'Configure parameters', active: false },
                                                { n: '4', text: 'View results', active: false },
                                            ].map((s) => (
                                                <div key={s.n} className="flex items-center gap-2.5">
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                                        s.active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                                                    }`}>{s.n}</div>
                                                    <span className={`text-xs ${s.active ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>{s.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Template Download */}
                                    <button className="w-full flex items-center gap-3 p-3.5 bg-blue-50 hover:bg-blue-100/70 rounded-xl border border-blue-100 transition-colors group">
                                        <div className="p-1.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                            <Download className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-xs font-semibold text-blue-800">Download Template</p>
                                            <p className="text-[10px] text-blue-500">CSV with required columns</p>
                                        </div>
                                        <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                                    </button>

                                    {/* Tips */}
                                    <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                                        <div className="flex items-center gap-2 mb-2.5">
                                            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                                            <h3 className="text-xs font-semibold text-amber-800">Quick Tips</h3>
                                        </div>
                                        <ul className="space-y-1.5 text-[11px] text-amber-700">
                                            <li className="flex items-start gap-1.5">
                                                <span className="mt-1 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                                                Use the template to ensure correct column format
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="mt-1 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                                                AI OCR works best with clear, high-res images
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="mt-1 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                                                More historical data = better forecast accuracy
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Supported formats */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {['CSV', 'XLS', 'XLSX', 'PNG', 'JPEG', 'PDF'].map((fmt) => (
                                            <span key={fmt} className="px-2 py-1 bg-slate-100 rounded-md text-[10px] font-medium text-slate-500">{fmt}</span>
                                        ))}
                                        <span className="px-2 py-1 bg-slate-50 rounded-md text-[10px] text-slate-400">max 10MB</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 'preview' && uploadedData && (
                        <DataPreview
                            data={uploadedData}
                            onConfirm={handleConfirmPreview}
                            onCancel={() => setCurrentStep('upload')}
                        />
                    )}

                    {currentStep === 'mapping' && uploadedData && (
                        <ColumnMapping
                            data={uploadedData}
                            fileName={fileName}
                            onConfirm={handleMappingConfirm}
                            onBack={() => setCurrentStep('upload')}
                        />
                    )}

                    {currentStep === 'configure' && (
                        <ForecastConfig
                            onRun={handleRunForecast}
                            isLoading={isRunning}
                            uploadResult={uploadResult}
                        />
                    )}

                    {currentStep === 'results' && (
                        <RunResults data={resultData} />
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
