'use client';

import { MainLayout } from '@/components/layout/main-layout';

import { UploadPanel } from '@/components/upload/upload-panel';
import { OCRUploadPanel } from '@/components/upload/ocr-upload-panel';
import { DataPreview } from '@/components/upload/data-preview';
import { ColumnMapping, MODEL_COLUMNS } from '@/components/upload/column-mapping';
import { ForecastConfig } from '@/components/upload/forecast-config';
import { RunResults } from '@/components/upload/run-results';
import { ParsedData } from '@/lib/file-utils';
import { createRun, getDatasetSample, getRunForecast, uploadRunInput, type DatasetSample } from '@/lib/api-client';
import { aggregateByMonth, aggregateForecastByMonth, toCsv } from '@/lib/forecast-utils';
import { useEffect, useState } from 'react';
import { Check, Download, Database, Minus, RotateCcw, CheckCircle2, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';

type Step = 'upload' | 'preview' | 'mapping' | 'configure' | 'results';
type UploadMode = 'excel' | 'ocr' | 'dataset';

export default function NewPredictionPage() {
    const [currentStep, setCurrentStep] = useState<Step>('upload');
    const [uploadMode, setUploadMode] = useState<UploadMode>('excel');
    const [uploadedData, setUploadedData] = useState<ParsedData | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [uploadResult, setUploadResult] = useState<any>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isDatasetMode, setIsDatasetMode] = useState(false);
    const [datasetSample, setDatasetSample] = useState<DatasetSample | null>(null);
    const [datasetError, setDatasetError] = useState<string | null>(null);

    // The built-in dataset gets the same Preview as a file: its real first rows, from the API.
    useEffect(() => {
        if (uploadMode !== 'dataset' || datasetSample) return;
        let live = true;
        getDatasetSample()
            .then(s => { if (live) { setDatasetSample(s); setDatasetError(null); } })
            .catch(e => { if (live) setDatasetError(e instanceof Error ? e.message : String(e)); });
        return () => { live = false; };
    }, [uploadMode, datasetSample]);

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
    const steps: { key: Step; label: string; hint: string }[] = [
        { key: 'upload', label: 'Source', hint: 'Where the history comes from' },
        { key: 'preview', label: 'Preview', hint: 'Rows, blanks, history length' },
        { key: 'mapping', label: 'Map columns', hint: 'Match your names to ours' },
        { key: 'configure', label: 'Configure', hint: 'Horizon and model' },
        { key: 'results', label: 'Results', hint: 'The Run, saved to Runs' },
    ];
    // a source that is chosen but not yet confirmed shows its preview on the Source step
    const previewing = Boolean(uploadedData) || (uploadMode === 'dataset' && Boolean(datasetSample));
    const effectiveStep: Step = currentStep === 'upload' && previewing ? 'preview' : currentStep;
    const currentIdx = steps.findIndex(s => s.key === effectiveStep);
    // the built-in dataset already carries the model's own column names, so there is nothing to map
    const skipsMapping = isDatasetMode || (currentStep === 'upload' && uploadMode === 'dataset');

    const sources: { key: UploadMode; label: string }[] = [
        { key: 'excel', label: 'File' },
        { key: 'ocr', label: 'Purchase order' },
        { key: 'dataset', label: 'Built-in dataset' },
    ];

    return (
        <MainLayout
            title="New Prediction"
            description="Turn a sales history into a forecast Run"
        >
            <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:gap-8">

                {/* The wizard rail: every step, the current one framed */}
                <ol className="flex shrink-0 gap-2 overflow-x-auto lg:w-60 lg:flex-col lg:gap-0 lg:overflow-visible">
                    {steps.map((s, idx) => {
                        const isSkipped = s.key === 'mapping' && skipsMapping;
                        const isActive = idx === currentIdx && !isSkipped;
                        const isDone = idx < currentIdx && !isSkipped;
                        return (
                            <li key={s.key} className="flex shrink-0 flex-col">
                                <div className={`flex items-start gap-3 rounded-xl px-3.5 py-3 ${isActive ? 'border border-blue-200 bg-white' : ''}`}>
                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                        isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                        {isSkipped ? <Minus className="h-3.5 w-3.5" /> : isDone ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                                    </span>
                                    <span className="min-w-0">
                                        <span className={`block text-sm font-semibold ${isActive || isDone ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
                                        <span className={`hidden text-xs lg:block ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {isSkipped ? 'Not needed, names already match' : s.hint}
                                        </span>
                                    </span>
                                </div>
                                {idx < steps.length - 1 && <span className="ml-[26px] hidden h-3.5 w-0.5 bg-slate-200 lg:block" />}
                            </li>
                        );
                    })}
                </ol>

                {/* The form */}
                <div className="min-w-0 flex-1">
                    {currentStep === 'upload' && (
                        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="border-b border-slate-100 px-6 py-5">
                                <h2 className="text-xl font-bold tracking-tight text-slate-900">Source</h2>
                                <p className="mt-0.5 text-sm text-slate-500">Choose where the sales history comes from.</p>
                            </div>

                            <div className="flex flex-col gap-5 px-6 py-5">
                                {!uploadedData && (
                                    <div role="tablist" aria-label="Source" className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                                        {sources.map(s => (
                                            <button
                                                key={s.key}
                                                type="button"
                                                role="tab"
                                                aria-selected={uploadMode === s.key}
                                                onClick={() => setUploadMode(s.key)}
                                                className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                                                    uploadMode === s.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {uploadedData ? (
                                    <InlinePreview />
                                ) : uploadMode === 'excel' ? (
                                    <>
                                        <UploadPanel onDataParsed={handleDataParsed} />
                                        <ColumnGuide />
                                    </>
                                ) : uploadMode === 'ocr' ? (
                                    <OCRUploadPanel onDataParsed={handleDataParsed} />
                                ) : (
                                    <DatasetPreview />
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
                                {uploadedData ? (
                                    <button
                                        type="button"
                                        onClick={() => { setUploadedData(null); setFileName(''); setUploadResult(null); setIsDatasetMode(false); }}
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Choose another source
                                    </button>
                                ) : <span />}
                                {uploadMode === 'dataset' && !uploadedData ? (
                                    <button
                                        type="button"
                                        onClick={handleUseDataset}
                                        disabled={!datasetSample}
                                        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                                    >
                                        Continue to configure
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep('mapping')}
                                        disabled={!uploadedData || uploadedData.summary.emptyCells > 0}
                                        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                                    >
                                        Continue to map columns
                                    </button>
                                )}
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
                        <RunResults
                            data={resultData}
                            onRestart={() => {
                                setResultData(null); setUploadedData(null); setMappedData(null); setFileName('');
                                setUploadResult(null); setIsDatasetMode(false); setDatasetSample(null); setUploadMode('excel'); setCurrentStep('upload');
                            }}
                        />
                    )}
                </div>
            </div>
        </MainLayout>
    );

    /** The column list with an example each, from the mapping step's own definition. */
    function ColumnGuide() {
        const required = MODEL_COLUMNS.filter(c => c.required);
        const optional = MODEL_COLUMNS.filter(c => !c.required);
        return (
            <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Columns we look for</h3>
                    <a href="/templates/sales_history_template.csv" download className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900">
                        <Download className="h-3.5 w-3.5" />
                        Download the CSV template
                    </a>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200 text-xs">
                    <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
                        {required.map(c => (
                            <div key={c.key} className="flex items-baseline justify-between gap-2 bg-white px-3 py-2">
                                <span className="font-semibold text-slate-800">{c.label}</span>
                                <span className="truncate text-slate-500">{c.example}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
                        Optional, default to no promotion: {optional.map(c => c.label).join(', ')}. Names can differ; you match them on the next step.
                    </div>
                </div>
            </div>
        );
    }

    /** The first rows of the uploaded file with the validation verdict on top. */
    function InlinePreview() {
        const d = uploadedData!;
        const valid = d.summary.emptyCells === 0;
        const errors = d.summary.emptyCells > 0 ? [`Found ${d.summary.emptyCells} empty cells`] : [];
        const warnings = d.summary.rowCount < 12 ? ['Data history < 12 months'] : [];
        return (
            <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className={`flex items-center gap-3 border-b px-4 py-3 ${valid ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'}`}>
                    {valid ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />}
                    <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold ${valid ? 'text-emerald-800' : 'text-amber-800'}`}>{valid ? 'All checks passed' : 'Attention needed'}</p>
                        <p className="text-[11px] text-slate-500">
                            {d.summary.rowCount.toLocaleString()} rows, {d.summary.colCount} columns
                            {fileName && <span className="ml-1 text-slate-400">— {fileName}</span>}
                        </p>
                        {errors.map((e, i) => <div key={i} className="mt-1 flex items-center gap-1 text-[11px] text-rose-600"><XCircle className="h-3 w-3" /> {e}</div>)}
                        {warnings.map((w, i) => <div key={i} className="mt-1 flex items-center gap-1 text-[11px] text-amber-600"><AlertCircle className="h-3 w-3" /> {w}</div>)}
                    </div>
                </div>
                <RowTable headers={d.headers} rows={d.rows} total={d.summary.rowCount} />
            </div>
        );
    }

    /** The built-in dataset previewed the way a file is: its real first rows, straight from the API. */
    function DatasetPreview() {
        if (datasetError) {
            return (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    <div>
                        <p className="font-semibold text-rose-800">The dataset could not be read</p>
                        <p className="text-rose-700">{datasetError}</p>
                    </div>
                </div>
            );
        }
        if (!datasetSample) {
            return <div className="rounded-xl border border-slate-200 px-4 py-10 text-center text-sm text-slate-400">Reading the dataset…</div>;
        }
        const d = datasetSample;
        return (
            <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-3">
                    <Database className="h-4 w-4 shrink-0 text-emerald-700" />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-emerald-800">The history the dashboards already show</p>
                        <p className="text-[11px] text-slate-500">
                            {d.summary.rowCount.toLocaleString()} rows, {d.summary.colCount} columns, {d.months.count} months to {d.months.to}
                            <span className="ml-1 text-slate-400">— already in the model&apos;s own column names</span>
                        </p>
                    </div>
                </div>
                <RowTable headers={d.headers} rows={d.rows} total={d.summary.rowCount} />
            </div>
        );
    }
}

/** The first rows of a source, scrolling sideways when it is wide. */
function RowTable({ headers, rows, total }: { headers: string[]; rows: Record<string, any>[]; total: number }) {
    const shown = rows.slice(0, 5);
    return (
        <div className="overflow-auto">
            <table className="w-full text-xs">
                <thead className="sticky top-0 border-b border-slate-200 bg-slate-50">
                    <tr>
                        <th className="w-8 px-3 py-2 text-center font-semibold text-slate-400">#</th>
                        {headers.map((h, i) => <th key={i} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-600">{h}</th>)}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {shown.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                            <td className="px-3 py-1.5 text-center font-mono text-slate-400">{i + 1}</td>
                            {headers.map((h, j) => (
                                <td key={j} className="whitespace-nowrap px-3 py-1.5 text-slate-700">
                                    {row[h]?.toString() || <span className="italic text-rose-400">null</span>}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-center text-[10px] text-slate-400">
                Showing first {shown.length} of {total.toLocaleString()} rows
            </div>
        </div>
    );
}
