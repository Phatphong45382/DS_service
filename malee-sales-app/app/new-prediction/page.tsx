'use client';

import { MainLayout } from '@/components/layout/main-layout';

import { UploadPanel } from '@/components/upload/upload-panel';
import { OCRUploadPanel } from '@/components/upload/ocr-upload-panel';
import { DataPreview } from '@/components/upload/data-preview';
import { ColumnMapping, MODEL_COLUMNS } from '@/components/upload/column-mapping';
import { ForecastConfig } from '@/components/upload/forecast-config';
import { RunResults } from '@/components/upload/run-results';
import { ParsedData } from '@/lib/file-utils';
import { createRun, getRunForecast, uploadRunInput } from '@/lib/api-client';
import { aggregateByMonth, aggregateForecastByMonth, toCsv } from '@/lib/forecast-utils';
import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Download, ScanLine, Database, RotateCcw, CheckCircle2, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';

type Step = 'upload' | 'preview' | 'mapping' | 'configure' | 'results';
type UploadMode = 'excel' | 'ocr';

export default function NewPredictionPage() {
    const [currentStep, setCurrentStep] = useState<Step>('upload');
    const [uploadMode, setUploadMode] = useState<UploadMode>('excel');
    const [uploadedData, setUploadedData] = useState<ParsedData | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [uploadResult, setUploadResult] = useState<any>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isDatasetMode, setIsDatasetMode] = useState(false);

    const handleDataParsed = (data: ParsedData, name: string, result?: any) => {
        setUploadedData(data);
        setFileName(name);
        setUploadResult(result);
        setIsDatasetMode(false);
        // Stay on upload step — show inline preview
    };

    const handleUseDataset = () => {
        setUploadedData(null);
        setMappedData(null);
        setFileName('sales.parquet');
        setUploadResult(null);
        setIsDatasetMode(true);
        setCurrentStep('configure');
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

    const handleRunForecast = async (config: { horizon: number; model: string }) => {
        setIsRunning(true);
        try {
            let uploadId: string | undefined;
            if (!isDatasetMode) {
                const source = mappedData ?? uploadedData;
                if (!source) throw new Error('No data to run on');
                const file = new File([toCsv(source.rows)], fileName || 'history.csv', { type: 'text/csv' });
                uploadId = (await uploadRunInput(file)).upload_id;
            }
            const run = await createRun({
                horizon: config.horizon,
                upload_id: uploadId,
                notes: `New Prediction on ${fileName || 'sales dataset'}`,
            });
            const detail = run.status === 'success' ? await getRunForecast(run.run_id) : null;
            const rows = detail
                ? [
                    ...aggregateByMonth(detail.history, 'actual_units').map(({ month, value }) => ({ date: month, sales: value, forecast: null })),
                    ...aggregateForecastByMonth(detail.forecast).map(({ month, forecast }) => ({ date: month, sales: null, forecast })),
                ]
                : [];
            setResultData({ run, rows, filename: run.data_source_name });
            setCurrentStep('results');
        } catch (error) {
            console.error('Failed to run forecast:', error);
            alert("Forecast failed: " + (error instanceof Error ? error.message : "Unknown error"));
        } finally {
            setIsRunning(false);
        }
    };
    const stepperItems = [
        { key: 'upload', label: 'Upload' },
        { key: 'preview', label: 'Preview' },
        { key: 'mapping', label: 'Map columns' },
        { key: 'configure', label: 'Configure' },
        { key: 'results', label: 'Results' },
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
            <div className="space-y-6 max-w-4xl mx-auto pt-0">

                {/* Steps: a line of names, the current one in blue, finished ones ticked */}
                <ol className="flex items-center gap-3 overflow-x-auto whitespace-nowrap text-sm">
                    {stepperItems.map((step, idx, arr) => {
                        const isActive = effectiveStep === step.key;
                        const isCompleted = currentIdx > idx;
                        return (
                            <li key={step.key} className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-1.5 ${
                                    isActive ? 'font-semibold text-blue-700' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                                }`}>
                                    {isCompleted
                                        ? <Check className="h-3.5 w-3.5 text-emerald-600" />
                                        : <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-blue-600' : 'bg-slate-300'}`} />}
                                    {step.label}
                                </span>
                                {idx < arr.length - 1 && <span className={`h-px w-6 ${isCompleted ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
                            </li>
                        );
                    })}
                </ol>

                {/* Content Area */}
                <div className="min-h-[500px]">
                    {currentStep === 'upload' && !uploadedData && (
                        <div className="space-y-8">
                            {uploadMode === 'ocr' ? (
                                <div className="space-y-3">
                                    <button
                                        type="button"
                                        onClick={() => setUploadMode('excel')}
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Back to file upload
                                    </button>
                                    <OCRUploadPanel onDataParsed={handleDataParsed} />
                                </div>
                            ) : (
                                <UploadPanel onDataParsed={handleDataParsed} />
                            )}

                            {/* The two other ways in, as sentences rather than a second set of tabs */}
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
                                <span className="text-slate-400">No file to hand?</span>
                                {uploadMode !== 'ocr' && (
                                    <button type="button" onClick={() => setUploadMode('ocr')} className="inline-flex items-center gap-1.5 font-medium text-violet-700 hover:text-violet-900">
                                        <ScanLine className="h-4 w-4" />
                                        Scan a purchase order with AI OCR
                                    </button>
                                )}
                                <button type="button" onClick={handleUseDataset} className="inline-flex items-center gap-1.5 font-medium text-blue-700 hover:text-blue-900">
                                    <Database className="h-4 w-4" />
                                    Run on the built-in sales dataset
                                </button>
                            </div>

                            {/* What a good file contains: the real column list, from the mapping step */}
                            <div className="border-t border-slate-200 pt-6">
                                <h3 className="text-sm font-semibold text-slate-900">Columns we look for</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Names can differ; you match them on the next step. Optional columns default to no promotion.
                                </p>
                                <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                                    <div>
                                        <dt className="text-xs font-medium text-slate-500">Required</dt>
                                        <dd className="mt-1.5 flex flex-wrap gap-1.5">
                                            {MODEL_COLUMNS.filter(c => c.required).map(c => (
                                                <span key={c.key} title={c.description} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{c.label}</span>
                                            ))}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-medium text-slate-500">Optional</dt>
                                        <dd className="mt-1.5 flex flex-wrap gap-1.5">
                                            {MODEL_COLUMNS.filter(c => !c.required).map(c => (
                                                <span key={c.key} title={c.description} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500">{c.label}</span>
                                            ))}
                                        </dd>
                                    </div>
                                </dl>
                                <a
                                    href="/templates/sales_history_template.csv"
                                    download
                                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-900"
                                >
                                    <Download className="h-4 w-4" />
                                    Download the CSV template
                                </a>
                            </div>
                        </div>
                    )}

                    {currentStep === 'upload' && uploadedData && (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
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
                                                                {isDatasetMode && <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-700 font-semibold">Sales dataset</span>}
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
                                                    onClick={() => { setUploadedData(null); setFileName(''); setUploadResult(null); setIsDatasetMode(false); }}
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
                                                    Continue to map columns
                                                    <ChevronRight className="w-3 h-3" />
                                                </button>
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
                            demoMode={false}
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
