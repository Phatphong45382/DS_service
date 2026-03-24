'use client';

import { useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { PageHeader } from '@/components/ui/page-header';
import { ModelSelector } from '@/components/ai/model-selector';
import { getAIInsights, getDashboardData, getAnalyticsData } from '@/lib/api-client';
import { Sparkles, RefreshCw, Loader2, Brain, TrendingUp, BarChart3, Users, Package, CheckCircle2, XCircle, Clock, Server, Cpu } from 'lucide-react';

type DataSource = 'dashboard' | 'analytics';

interface DebugInfo {
    backendUrl: string;
    aiEndpoint: string;
    model: string;
    dataSource: string;
    kpiKeys: string[];
    topProductsCount: number;
    customersCount: number;
    monthlyTsCount: number;
    responseTime: number;
    status: 'idle' | 'loading' | 'success' | 'error';
    errorDetail?: string;
}

export default function AIInsightsPage() {
    const [insight, setInsight] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dataSource, setDataSource] = useState<DataSource>('dashboard');
    const [lastGenerated, setLastGenerated] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8081';

    const generateInsight = useCallback(async () => {
        setLoading(true);
        setError(null);
        const startTime = Date.now();

        const debug: DebugInfo = {
            backendUrl: apiBaseUrl,
            aiEndpoint: `${apiBaseUrl}/api/v1/ai/insights`,
            model: 'gemini-2.5-flash-lite',
            dataSource,
            kpiKeys: [],
            topProductsCount: 0,
            customersCount: 0,
            monthlyTsCount: 0,
            responseTime: 0,
            status: 'loading',
        };
        setDebugInfo(debug);

        try {
            // Fetch data from the selected source
            let data: any;
            if (dataSource === 'analytics') {
                data = await getAnalyticsData({});
            } else {
                data = await getDashboardData({});
            }

            const kpi = data.kpi || {};
            const top_products = data.top_products || [];
            const by_customer = data.by_customer || [];
            const monthly_ts = data.monthly_ts || [];

            debug.kpiKeys = Object.keys(kpi);
            debug.topProductsCount = top_products.length;
            debug.customersCount = by_customer.length;
            debug.monthlyTsCount = monthly_ts.length;

            // Send to AI endpoint
            const result = await getAIInsights({
                kpi,
                top_products,
                by_customer,
                monthly_ts,
            });

            debug.responseTime = Date.now() - startTime;
            debug.status = 'success';
            setDebugInfo({ ...debug });

            setInsight(result.insight);
            setLastGenerated(new Date().toLocaleTimeString('th-TH'));
        } catch (err: any) {
            console.error('AI Insight error:', err);
            debug.responseTime = Date.now() - startTime;
            debug.status = 'error';
            debug.errorDetail = err.message;
            setDebugInfo({ ...debug });
            setError(err.message || 'ไม่สามารถสร้าง insight ได้');
        } finally {
            setLoading(false);
        }
    }, [dataSource, apiBaseUrl]);

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex items-start justify-between">
                    <PageHeader
                        title="AI Insights"
                        description="วิเคราะห์ข้อมูลยอดขายอัตโนมัติด้วย Gemini AI"
                    />
                    <ModelSelector />
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-4">
                    {/* Data Source Selector */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
                        <button
                            onClick={() => setDataSource('dashboard')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                dataSource === 'dashboard'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            Dashboard Data
                        </button>
                        <button
                            onClick={() => setDataSource('analytics')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                dataSource === 'analytics'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            Analytics Data
                        </button>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={generateInsight}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium text-sm hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4" />
                        )}
                        {loading ? 'กำลังวิเคราะห์...' : 'Generate AI Insight'}
                    </button>

                    {lastGenerated && (
                        <span className="text-xs text-slate-400">
                            อัปเดตล่าสุด: {lastGenerated}
                        </span>
                    )}
                </div>

                {/* Result Area */}
                <div className="grid grid-cols-1 gap-6">
                    {/* AI Insight Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Brain className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-base font-bold text-slate-900">AI Analysis Result</h3>
                                <p className="text-xs text-slate-500">Powered by Gemini 2.5 Flash Lite</p>
                            </div>
                            <span className="text-[11px] font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                Gemini Flash
                            </span>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-5 min-h-[200px]">
                            {loading && (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-slate-700">Gemini กำลังวิเคราะห์ข้อมูล...</p>
                                        <p className="text-xs text-slate-400 mt-1">กำลังดึงข้อมูลจาก {dataSource === 'dashboard' ? 'Dashboard' : 'Analytics'} และส่งให้ AI</p>
                                    </div>
                                </div>
                            )}

                            {error && !loading && (
                                <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-lg">
                                    <div className="p-1.5 bg-rose-100 rounded-full">
                                        <RefreshCw className="w-4 h-4 text-rose-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-rose-800">เกิดข้อผิดพลาด</p>
                                        <p className="text-xs text-rose-600 mt-0.5">{error}</p>
                                    </div>
                                </div>
                            )}

                            {insight && !loading && (
                                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                                    {insight}
                                </div>
                            )}

                            {!insight && !loading && !error && (
                                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                                    <div className="p-4 bg-slate-50 rounded-full">
                                        <Sparkles className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">ยังไม่มีข้อมูล</p>
                                        <p className="text-xs text-slate-400 mt-1">กดปุ่ม "Generate AI Insight" เพื่อเริ่มวิเคราะห์</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Debug / Status Panel */}
                    <div className="bg-slate-900 text-slate-300 rounded-2xl overflow-hidden shadow-sm border border-slate-700">
                        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-700 bg-slate-800">
                            <Server className="w-4 h-4 text-slate-400" />
                            <h3 className="text-sm font-bold text-slate-200">API Status & Debug Info</h3>
                            {debugInfo && (
                                <span className={`ml-auto flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
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
                        <div className="px-5 py-4 font-mono text-xs space-y-2">
                            {!debugInfo ? (
                                <p className="text-slate-500 italic">กด "Generate AI Insight" เพื่อดูสถานะ</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
                                        <div className="flex gap-2">
                                            <span className="text-slate-500 min-w-[140px]">Backend URL:</span>
                                            <span className="text-cyan-400">{debugInfo.backendUrl}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-slate-500 min-w-[140px]">AI Endpoint:</span>
                                            <span className="text-cyan-400">{debugInfo.aiEndpoint}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-slate-500 min-w-[140px]">LLM Model:</span>
                                            <span className="text-yellow-400 font-semibold">{debugInfo.model}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-slate-500 min-w-[140px]">Data Source:</span>
                                            <span className="text-green-400">{debugInfo.dataSource}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-slate-500 min-w-[140px]">Response Time:</span>
                                            <span className={`font-semibold ${debugInfo.responseTime < 3000 ? 'text-emerald-400' : debugInfo.responseTime < 8000 ? 'text-yellow-400' : 'text-rose-400'}`}>
                                                {debugInfo.status === 'loading' ? '...' : `${(debugInfo.responseTime / 1000).toFixed(2)}s`}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-slate-500 min-w-[140px]">KPI Fields:</span>
                                            <span className="text-slate-300">{debugInfo.kpiKeys.length > 0 ? debugInfo.kpiKeys.join(', ') : '-'}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-slate-500 min-w-[140px]">Top Products:</span>
                                            <span className="text-slate-300">{debugInfo.topProductsCount} items</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-slate-500 min-w-[140px]">Customers:</span>
                                            <span className="text-slate-300">{debugInfo.customersCount} items</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-slate-500 min-w-[140px]">Monthly TS:</span>
                                            <span className="text-slate-300">{debugInfo.monthlyTsCount} points</span>
                                        </div>
                                    </div>
                                    {debugInfo.errorDetail && (
                                        <div className="mt-3 p-3 bg-rose-950/50 border border-rose-800/50 rounded-lg">
                                            <span className="text-rose-400">Error: {debugInfo.errorDetail}</span>
                                        </div>
                                    )}
                                    {debugInfo.status === 'success' && (
                                        <div className="mt-3 p-3 bg-emerald-950/50 border border-emerald-800/50 rounded-lg flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                            <span className="text-emerald-400">ข้อมูลถูกส่งไปที่ Gemini API จริง ไม่ได้ hardcode — คำตอบมาจาก LLM</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Feature Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-emerald-50 rounded-lg">
                                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-900">Trend Analysis</h4>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                วิเคราะห์แนวโน้มยอดขาย MoM growth และเปรียบเทียบกับค่าเฉลี่ย
                            </p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <Package className="w-4 h-4 text-blue-600" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-900">Product Insights</h4>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                สรุปสินค้าขายดี และแนะนำกลยุทธ์เพิ่มยอดขาย
                            </p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-violet-50 rounded-lg">
                                    <Users className="w-4 h-4 text-violet-600" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-900">Customer Analysis</h4>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                วิเคราะห์ลูกค้ารายใหญ่ พร้อมคำแนะนำเชิงกลยุทธ์
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
