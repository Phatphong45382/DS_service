'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { PageHeader } from '@/components/ui/page-header';
import { UploadPanel } from '@/components/upload/upload-panel';
import { DataPreview } from '@/components/upload/data-preview';
import { ForecastConfig } from '@/components/upload/forecast-config';
import { RunResults } from '@/components/upload/run-results';
import { ParsedData } from '@/lib/file-utils';
import { useState } from 'react';
import { ChevronRight, Home } from 'lucide-react';

type Step = 'upload' | 'preview' | 'configure' | 'results';

export default function NewPredictionPage() {
    const [currentStep, setCurrentStep] = useState<Step>('upload');
    const [uploadedData, setUploadedData] = useState<ParsedData | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [uploadResult, setUploadResult] = useState<any>(null);
    const [isRunning, setIsRunning] = useState(false);

    const handleDataParsed = (data: ParsedData, name: string, result?: any) => {
        setUploadedData(data);
        setFileName(name);
        setUploadResult(result);
        setCurrentStep('preview');
    };

    const handleConfirmPreview = () => {
        setCurrentStep('configure');
    };

    const [resultData, setResultData] = useState<any>(null);

    const handleRunForecast = async () => {
        setIsRunning(true);
        try {
            const { runForecast, getForecastResults } = await import('@/lib/api-client');

            // 1. Trigger Forecast
            console.log("🚀 Starting forecast...");
            await runForecast();

            // 2. Fixed Wait (25 seconds)
            console.log("⏳ Waiting 25s for Dataiku processing...");
            const WAIT_SECONDS = 25;

            for (let i = 0; i < WAIT_SECONDS; i++) {
                // Output log every 5 seconds
                if (i % 5 === 0) {
                    console.log(`... waiting ${i}/${WAIT_SECONDS}s`);
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log("✅ Wait complete. Fetching results...");

            // 3. Fetch Results
            const data = await getForecastResults();
            setResultData(data);

            // 4. Move to next step
            setCurrentStep('results');

        } catch (error) {
            console.error('❌ Failed to run forecast:', error);
            alert("Forecast failed: " + (error instanceof Error ? error.message : "Unknown error"));
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <MainLayout
            title="New Prediction"
            description="Upload new sales data to generate updated forecasts"
        >
            <div className="space-y-10 max-w-6xl mx-auto pt-0">

                {/* Progress Stepper */}
                <div className="flex items-center justify-between px-10 py-4 bg-white rounded-xl border border-gray-100 shadow-sm mb-8 relative">
                    {['Upload Data', 'Validate & Preview', 'Configure Run', 'Results'].map((step, idx) => {
                        const stepKey = ['upload', 'preview', 'configure', 'results'][idx] as Step;
                        const isActive = currentStep === stepKey;
                        const isCompleted = ['upload', 'preview', 'configure', 'results'].indexOf(currentStep) > idx;

                        return (
                            <div key={idx} className="flex flex-col items-center gap-2 relative z-10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110' :
                                    isCompleted ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                    {isCompleted ? '✓' : idx + 1}
                                </div>
                                <span className={`text-xs font-medium ${isActive ? 'text-blue-700' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                                    {step}
                                </span>
                            </div>
                        );
                    })}
                    {/* Progress Bar Background */}
                    <div className="absolute top-8 left-[10%] w-[80%] h-0.5 bg-gray-100 -z-0 hidden md:block">
                        <div
                            className="h-full bg-green-500 transition-all duration-500"
                            style={{ width: `${['upload', 'preview', 'configure', 'results'].indexOf(currentStep) * 33}%` }}
                        ></div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="min-h-[500px]">
                    {currentStep === 'upload' && (
                        <UploadPanel onDataParsed={handleDataParsed} />
                    )}

                    {currentStep === 'preview' && uploadedData && (
                        <DataPreview
                            data={uploadedData}
                            onConfirm={handleConfirmPreview}
                            onCancel={() => setCurrentStep('upload')}
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
