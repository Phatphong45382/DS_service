'use client';

import { useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/main-layout';

import { ModelSelector } from '@/components/ai/model-selector';
import { generateReport, getDashboardData, getAnalyticsData } from '@/lib/api-client';
import {
    FileText, Send, Loader2, Mail, CheckCircle2, XCircle, Server,
    Clock, RefreshCw, Download
} from 'lucide-react';

type DataSource = 'dashboard' | 'analytics';

interface DebugInfo {
    endpoint: string;
    model: string;
    dataSource: string;
    emailTo: string;
    responseTime: number;
    emailSent: boolean;
    status: 'idle' | 'loading' | 'success' | 'error';
    errorDetail?: string;
}

export default function AIReportPage() {
    const [report, setReport] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [dataSource, setDataSource] = useState<DataSource>('dashboard');
    const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
    const [emailSent, setEmailSent] = useState(false);

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8081';

    const handleGenerate = useCallback(async (sendEmail: boolean) => {
        setLoading(true);
        setError(null);
        setEmailSent(false);
        const startTime = Date.now();

        const debug: DebugInfo = {
            endpoint: `${apiBaseUrl}/api/v1/ai/report`,
            model: 'gemini-2.5-flash-lite',
            dataSource,
            emailTo: sendEmail ? email : '(not sending)',
            responseTime: 0,
            emailSent: false,
            status: 'loading',
        };
        setDebugInfo(debug);

        try {
            let data: any;
            if (dataSource === 'analytics') {
                data = await getAnalyticsData({});
            } else {
                data = await getDashboardData({});
            }

            const result = await generateReport({
                kpi: data.kpi || {},
                top_products: data.top_products || [],
                by_customer: data.by_customer || [],
                monthly_ts: data.monthly_ts || [],
                email: sendEmail && email ? email : undefined,
            });

            debug.responseTime = Date.now() - startTime;
            debug.status = 'success';
            debug.emailSent = result.email_sent;
            setDebugInfo({ ...debug });

            setReport(result.report);
            setEmailSent(result.email_sent);
        } catch (err: any) {
            debug.responseTime = Date.now() - startTime;
            debug.status = 'error';
            debug.errorDetail = err.message;
            setDebugInfo({ ...debug });
            setError(err.message || 'ไม่สามารถสร้างรายงานได้');
        } finally {
            setLoading(false);
        }
    }, [dataSource, email, apiBaseUrl]);

    return (
        <MainLayout
            title="AI Report Generator"
            description="สร้างรายงานสรุปยอดขายด้วย AI แล้วส่งไปทาง Email"
            action={<ModelSelector />}
        >
            <div className="space-y-6">

                {/* Controls */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left: Data Source */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Data Source</label>
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
                                <button
                                    onClick={() => setDataSource('dashboard')}
                                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                        dataSource === 'dashboard'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    Dashboard Data
                                </button>
                                <button
                                    onClick={() => setDataSource('analytics')}
                                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                        dataSource === 'analytics'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    Analytics Data
                                </button>
                            </div>
                        </div>

                        {/* Right: Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                <Mail className="w-4 h-4 inline mr-1" />
                                Send to Email (optional)
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="example@gmail.com"
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 mt-6">
                        <button
                            onClick={() => handleGenerate(false)}
                            disabled={loading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium text-sm hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-md"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <FileText className="w-4 h-4" />
                            )}
                            Generate Report
                        </button>

                        <button
                            onClick={() => handleGenerate(true)}
                            disabled={loading || !email}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-medium text-sm hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all shadow-md"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            Generate & Send Email
                        </button>
                    </div>

                    {/* Email sent success */}
                    {emailSent && (
                        <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <span className="text-sm text-emerald-800 font-medium">
                                ส่ง Email สำเร็จไปที่ {email}
                            </span>
                        </div>
                    )}
                </div>

                {/* Report Result */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-base font-bold text-slate-900">Generated Report</h3>
                            <p className="text-xs text-slate-500">Powered by Gemini 2.5 Flash Lite</p>
                        </div>
                    </div>

                    <div className="px-6 py-5 min-h-[300px]">
                        {loading && (
                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                                <div className="text-center">
                                    <p className="text-sm font-medium text-slate-700">Gemini กำลังสร้างรายงาน...</p>
                                    <p className="text-xs text-slate-400 mt-1">กำลังวิเคราะห์ข้อมูลจาก {dataSource === 'dashboard' ? 'Dashboard' : 'Analytics'}</p>
                                </div>
                            </div>
                        )}

                        {error && !loading && (
                            <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-lg">
                                <XCircle className="w-5 h-5 text-rose-600" />
                                <div>
                                    <p className="text-sm font-medium text-rose-800">เกิดข้อผิดพลาด</p>
                                    <p className="text-xs text-rose-600 mt-0.5">{error}</p>
                                </div>
                            </div>
                        )}

                        {report && !loading && (
                            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                                {report}
                            </div>
                        )}

                        {!report && !loading && !error && (
                            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                                <div className="p-4 bg-slate-50 rounded-full">
                                    <FileText className="w-8 h-8 text-slate-300" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500">ยังไม่มีรายงาน</p>
                                    <p className="text-xs text-slate-400 mt-1">กดปุ่ม "Generate Report" เพื่อสร้างรายงาน</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Debug Panel (dev only) */}
                {process.env.NODE_ENV === 'development' && (
                <div className="bg-slate-900 text-slate-300 rounded-2xl overflow-hidden shadow-sm border border-slate-700">
                    <div className="flex items-center gap-2 px-5 py-2.5 border-b border-slate-700 bg-slate-800">
                        <Server className="w-4 h-4 text-slate-400" />
                        <h3 className="text-xs font-bold text-slate-200">Report API Debug</h3>
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
                                {debugInfo.status.toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="px-5 py-3 font-mono text-[11px]">
                        {!debugInfo ? (
                            <p className="text-slate-500 italic">กด Generate เพื่อดูสถานะ</p>
                        ) : (
                            <div className="space-y-1.5">
                                <div className="flex flex-wrap gap-x-6 gap-y-1">
                                    <span><span className="text-slate-500">Endpoint:</span> <span className="text-cyan-400">{debugInfo.endpoint}</span></span>
                                    <span><span className="text-slate-500">Model:</span> <span className="text-yellow-400">{debugInfo.model}</span></span>
                                    <span><span className="text-slate-500">Source:</span> <span className="text-green-400">{debugInfo.dataSource}</span></span>
                                    <span><span className="text-slate-500">Time:</span> <span className={`font-semibold ${debugInfo.responseTime < 5000 ? 'text-emerald-400' : 'text-yellow-400'}`}>{debugInfo.status === 'loading' ? '...' : `${(debugInfo.responseTime / 1000).toFixed(2)}s`}</span></span>
                                </div>
                                <div className="flex flex-wrap gap-x-6 gap-y-1">
                                    <span><span className="text-slate-500">Email To:</span> <span className="text-slate-300">{debugInfo.emailTo}</span></span>
                                    <span><span className="text-slate-500">Email Sent:</span> <span className={debugInfo.emailSent ? 'text-emerald-400' : 'text-slate-500'}>{debugInfo.emailSent ? 'YES' : 'NO'}</span></span>
                                    <span><span className="text-slate-500">SMTP:</span> <span className="text-slate-300">smtp.gmail.com:587</span></span>
                                </div>
                                {debugInfo.status === 'success' && (
                                    <div className="mt-2 p-2 bg-emerald-950/50 border border-emerald-800/50 rounded-lg flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-emerald-400">Report generated by Gemini AI{debugInfo.emailSent ? ' + Email sent via Gmail SMTP' : ''}</span>
                                    </div>
                                )}
                                {debugInfo.errorDetail && (
                                    <div className="mt-2 p-2 bg-rose-950/50 border border-rose-800/50 rounded-lg">
                                        <span className="text-rose-400">Error: {debugInfo.errorDetail}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                )}
            </div>
        </MainLayout>
    );
}
