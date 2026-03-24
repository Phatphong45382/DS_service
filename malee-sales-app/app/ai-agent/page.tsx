'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/main-layout';

import { ModelSelector } from '@/components/ai/model-selector';
import { runAgent, getAgentPrompt, setAgentPrompt } from '@/lib/api-client';
import {
    Send, Loader2, Bot, User, Trash2,
    Sparkles, ArrowDown, CheckCircle2, XCircle,
    Database, Mail, FileText, BarChart3, Search, Users,
    ChevronDown, ChevronRight, Clock, Zap,
    Server, Settings2, Save, RotateCcw, Check, Copy,
    type LucideIcon
} from 'lucide-react';

// ─── Types ───

interface AgentStep {
    step: number;
    type: string;
    thought?: string;
    tool?: string;
    params?: any;
    result?: any;
    status?: string;
    answer?: string;
    error?: string;
}

interface AgentMessage {
    id: string;
    role: 'user' | 'agent';
    content: string;
    timestamp: Date;
    steps?: AgentStep[];
    totalSteps?: number;
    isLoading?: boolean;
}

interface DebugInfo {
    endpoint: string;
    model: string;
    messageCount: number;
    responseTime: number;
    totalSteps: number;
    status: 'idle' | 'loading' | 'success' | 'error';
    errorDetail?: string;
}

// ─── Tool icon mapping ───

const TOOL_ICONS: Record<string, LucideIcon> = {
    query_sales_data: Database,
    analyze_data: BarChart3,
    generate_report: FileText,
    send_email: Mail,
    get_product_list: Search,
    get_customer_list: Users,
};

const TOOL_LABELS: Record<string, string> = {
    query_sales_data: 'ดึงข้อมูลยอดขาย',
    analyze_data: 'วิเคราะห์ข้อมูล',
    generate_report: 'สร้างรายงาน',
    send_email: 'ส่งอีเมล',
    get_product_list: 'ดูรายการสินค้า',
    get_customer_list: 'ดูรายการลูกค้า',
};

// ─── Quick Commands ───

const QUICK_COMMANDS: { text: string; icon: LucideIcon }[] = [
    { text: 'วิเคราะห์ยอดขายภาพรวมให้หน่อย', icon: BarChart3 },
    { text: 'สินค้าขายดีที่สุด 5 อันดับแรกคืออะไร', icon: Search },
    { text: 'ลูกค้ารายใหญ่มีใครบ้าง', icon: Users },
    { text: 'สร้างรายงานสรุปยอดขายแบบ brief', icon: FileText },
];

// ─── Step Component ───

function AgentStepView({ step }: { step: AgentStep }) {
    const [expanded, setExpanded] = useState(false);
    const ToolIcon = step.tool ? (TOOL_ICONS[step.tool] || Zap) : Zap;
    const toolLabel = step.tool ? (TOOL_LABELS[step.tool] || step.tool) : step.type;

    if (step.type === 'done' || step.type === 'direct_answer') return null;

    const isSuccess = step.status === 'success';
    const isError = step.type === 'error' || step.status === 'error';

    return (
        <div className="ml-3 mb-1.5">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-left w-full group cursor-pointer"
            >
                {isError ? (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                )}

                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                    isError ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-indigo-700'
                }`}>
                    <ToolIcon className="w-3.5 h-3.5" />
                    <span>{toolLabel}</span>
                </div>

                {step.thought && (
                    <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {step.thought}
                    </span>
                )}

                {(step.result || step.error) && (
                    expanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
            </button>

            {expanded && (
                <div className="mt-1.5 ml-6 p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] font-mono text-slate-600 max-h-48 overflow-auto">
                    {step.thought && (
                        <div className="mb-2">
                            <span className="text-slate-400">Thought: </span>
                            <span className="text-slate-700">{step.thought}</span>
                        </div>
                    )}
                    {step.params && Object.keys(step.params).length > 0 && (
                        <div className="mb-2">
                            <span className="text-slate-400">Params: </span>
                            <span className="text-amber-700">{JSON.stringify(step.params)}</span>
                        </div>
                    )}
                    {step.result && (
                        <div>
                            <span className="text-slate-400">Result: </span>
                            <pre className="whitespace-pre-wrap text-emerald-700 mt-1">
                                {JSON.stringify(step.result, null, 2).substring(0, 500)}
                                {JSON.stringify(step.result, null, 2).length > 500 ? '\n... (truncated)' : ''}
                            </pre>
                        </div>
                    )}
                    {step.error && (
                        <div className="text-rose-600">Error: {step.error}</div>
                    )}
                </div>
            )}
        </div>
    );
}


// ─── Main Page ───

export default function AIAgentPage() {
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState('');
    const [promptDraft, setPromptDraft] = useState('');
    const [promptSaving, setPromptSaving] = useState(false);
    const [promptSaved, setPromptSaved] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8081';

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Show/hide scroll-to-bottom button
    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;
        const onScroll = () => {
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
            setShowScrollBtn(!isNearBottom && messages.length > 2);
        };
        container.addEventListener('scroll', onScroll);
        return () => container.removeEventListener('scroll', onScroll);
    }, [messages.length]);

    // Load agent system prompt on mount
    useEffect(() => {
        getAgentPrompt()
            .then(res => {
                setSystemPrompt(res.prompt);
                setPromptDraft(res.prompt);
            })
            .catch(err => console.error('Failed to load agent prompt:', err));
    }, []);

    // Save prompt handler
    const handleSavePrompt = async () => {
        if (!promptDraft.trim() || promptDraft === systemPrompt) return;
        setPromptSaving(true);
        try {
            const res = await setAgentPrompt(promptDraft.trim());
            setSystemPrompt(res.prompt);
            setPromptDraft(res.prompt);
            setPromptSaved(true);
            setTimeout(() => setPromptSaved(false), 2000);
        } catch (err) {
            console.error('Failed to save prompt:', err);
        } finally {
            setPromptSaving(false);
        }
    };

    // Reset prompt draft
    const handleResetPrompt = () => {
        setPromptDraft(systemPrompt);
    };

    // Auto-resize textarea
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    };

    const sendMessage = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || loading) return;

        const userMsg: AgentMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: messageText,
            timestamp: new Date(),
        };

        const loadingMsg: AgentMessage = {
            id: (Date.now() + 1).toString(),
            role: 'agent',
            content: '',
            timestamp: new Date(),
            isLoading: true,
        };

        setMessages(prev => [...prev, userMsg, loadingMsg]);
        setInput('');
        if (inputRef.current) inputRef.current.style.height = 'auto';
        setLoading(true);

        const startTime = Date.now();
        const debug: DebugInfo = {
            endpoint: `${apiBaseUrl}/api/v1/ai/agent`,
            model: 'gemini-2.5-flash-lite',
            messageCount: messages.length + 1,
            responseTime: 0,
            totalSteps: 0,
            status: 'loading',
        };
        setDebugInfo(debug);

        try {
            const result = await runAgent(messageText);

            const agentMsg: AgentMessage = {
                id: (Date.now() + 2).toString(),
                role: 'agent',
                content: result.answer,
                timestamp: new Date(),
                steps: result.steps,
                totalSteps: result.total_steps,
            };

            debug.responseTime = Date.now() - startTime;
            debug.status = 'success';
            debug.totalSteps = result.total_steps;
            setDebugInfo({ ...debug });

            setMessages(prev => [
                ...prev.filter(m => m.id !== loadingMsg.id),
                agentMsg,
            ]);
        } catch (err: any) {
            debug.responseTime = Date.now() - startTime;
            debug.status = 'error';
            debug.errorDetail = err.message;
            setDebugInfo({ ...debug });

            const errorMsg: AgentMessage = {
                id: (Date.now() + 2).toString(),
                role: 'agent',
                content: `เกิดข้อผิดพลาด: ${err.message}`,
                timestamp: new Date(),
            };
            setMessages(prev => [
                ...prev.filter(m => m.id !== loadingMsg.id),
                errorMsg,
            ]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = () => {
        setMessages([]);
        setDebugInfo(null);
    };

    const copyMessage = (id: string, content: string) => {
        navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // ── Rich Markdown Renderer ──

    const renderInline = (text: string, keyPrefix: string = '') => {
        const tokens = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
        return tokens.map((tok, i) => {
            if (tok.startsWith('**') && tok.endsWith('**'))
                return <strong key={`${keyPrefix}-${i}`} className="font-semibold text-slate-900">{tok.slice(2, -2)}</strong>;
            if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 2)
                return <em key={`${keyPrefix}-${i}`} className="italic text-slate-600">{tok.slice(1, -1)}</em>;
            if (tok.startsWith('`') && tok.endsWith('`'))
                return <code key={`${keyPrefix}-${i}`} className="px-1.5 py-0.5 bg-slate-100 text-indigo-700 rounded text-[12px] font-mono">{tok.slice(1, -1)}</code>;
            return <span key={`${keyPrefix}-${i}`}>{tok}</span>;
        });
    };

    const getIndent = (line: string): number => {
        const match = line.match(/^(\s*)/);
        if (!match) return 0;
        const raw = match[1].replace(/\t/g, '    ').length;
        return Math.floor(raw / 2);
    };

    const formatContent = (content: string) => {
        const lines = content.split('\n');
        const elements: React.ReactNode[] = [];
        let lastNumberedIndent = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (trimmed === '') {
                elements.push(<div key={i} className="h-2" />);
                continue;
            }

            const indent = getIndent(line);
            const marginLeft = indent * 16;

            if (trimmed.startsWith('### ')) {
                lastNumberedIndent = -1;
                elements.push(
                    <div key={i} className="mt-5 mb-3" style={{ marginLeft }}>
                        <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-200">
                            {renderInline(trimmed.slice(4), `h3-${i}`)}
                        </h3>
                    </div>
                );
                continue;
            }
            if (trimmed.startsWith('## ')) {
                lastNumberedIndent = -1;
                elements.push(
                    <div key={i} className="mt-5 mb-3" style={{ marginLeft }}>
                        <h2 className="text-[17px] font-bold text-slate-900 pb-2 border-b border-slate-200">
                            {renderInline(trimmed.slice(3), `h2-${i}`)}
                        </h2>
                    </div>
                );
                continue;
            }
            if (trimmed.startsWith('# ')) {
                lastNumberedIndent = -1;
                elements.push(
                    <div key={i} className="mt-5 mb-3" style={{ marginLeft }}>
                        <h1 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-200">
                            {renderInline(trimmed.slice(2), `h1-${i}`)}
                        </h1>
                    </div>
                );
                continue;
            }

            const numMatch = trimmed.match(/^(\d+)[.)]\s*(.*)/);
            if (numMatch) {
                const isTopLevel = indent <= 1;
                lastNumberedIndent = indent;
                elements.push(
                    <div key={i} className={isTopLevel ? 'mt-4' : 'mt-1.5'} style={{ marginLeft, display: 'flex', gap: '10px' }}>
                        <span
                            className="shrink-0 font-bold"
                            style={{
                                minWidth: '1.5rem',
                                textAlign: 'right',
                                color: isTopLevel ? '#7c3aed' : '#94a3b8',
                                fontSize: isTopLevel ? '14px' : '13px',
                            }}
                        >
                            {numMatch[1]}.
                        </span>
                        <span style={{ fontSize: isTopLevel ? '14px' : '13px' }}
                            className={isTopLevel ? 'font-semibold text-slate-800' : 'text-slate-700'}
                        >
                            {renderInline(numMatch[2], `num-${i}`)}
                        </span>
                    </div>
                );
                continue;
            }

            const bulletMatch = trimmed.match(/^[-*•]\s+(.*)/);
            if (bulletMatch) {
                const effectiveML = marginLeft > 0 ? marginLeft : (lastNumberedIndent >= 0 ? 40 : 0);
                const depth = Math.min(Math.floor(effectiveML / 16), 3);
                const bulletStyles = [
                    { char: '\u2022', color: '#7c3aed', size: '14px' },
                    { char: '\u2022', color: '#94a3b8', size: '12px' },
                    { char: '\u25E6', color: '#94a3b8', size: '12px' },
                    { char: '\u25E6', color: '#cbd5e1', size: '11px' },
                ];
                const bs = bulletStyles[depth];
                elements.push(
                    <div key={i} style={{ marginLeft: effectiveML, display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <span className="shrink-0" style={{ color: bs.color, fontSize: bs.size, lineHeight: '1.6' }}>
                            {bs.char}
                        </span>
                        <span className="text-[13px] text-slate-700 leading-relaxed">
                            {renderInline(bulletMatch[1], `bul-${i}`)}
                        </span>
                    </div>
                );
                continue;
            }

            elements.push(
                <div key={i} className="text-[13px] text-slate-700 leading-relaxed" style={{ marginLeft, marginTop: indent > 0 ? '2px' : '6px' }}>
                    {renderInline(trimmed, `p-${i}`)}
                </div>
            );
        }

        return elements;
    };

    return (
        <MainLayout
            title="Sales AI Agent"
            description="สั่งงานครั้งเดียว Agent วางแผนและทำให้จนเสร็จ"
            mainClassName="flex-1 p-0 bg-white overflow-hidden"
            action={
                <div className="flex items-center gap-2">
                    <ModelSelector />
                    {messages.length > 0 && (
                        <button
                            onClick={clearChat}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors duration-200 cursor-pointer"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear
                        </button>
                    )}
                    <button
                        onClick={() => setShowPrompt(!showPrompt)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors duration-200 cursor-pointer ${
                            showPrompt ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                        <Settings2 className="w-3.5 h-3.5" />
                        Prompt
                    </button>
                    <button
                        onClick={() => setShowDebug(!showDebug)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors duration-200 cursor-pointer ${
                            showDebug ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                        <Server className="w-3.5 h-3.5" />
                        Debug
                    </button>
                </div>
            }
        >
            <div className="flex flex-col h-full">

                {/* ─── Debug Panel (collapsible) ─── */}
                {showDebug && (
                    <div className="flex-shrink-0 bg-slate-900 text-slate-300 border-b border-slate-700">
                        <div className="px-4 py-2.5 font-mono text-[11px]">
                            {!debugInfo ? (
                                <p className="text-slate-500">Waiting for first message...</p>
                            ) : (
                                <div className="flex flex-wrap gap-x-5 gap-y-1 items-center">
                                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                        debugInfo.status === 'success' ? 'bg-emerald-900/60 text-emerald-400' :
                                        debugInfo.status === 'error' ? 'bg-rose-900/60 text-rose-400' :
                                        debugInfo.status === 'loading' ? 'bg-blue-900/60 text-blue-400' :
                                        'bg-slate-700 text-slate-400'
                                    }`}>
                                        {debugInfo.status === 'success' && <CheckCircle2 className="w-3 h-3" />}
                                        {debugInfo.status === 'error' && <XCircle className="w-3 h-3" />}
                                        {debugInfo.status === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
                                        {debugInfo.status === 'idle' && <Clock className="w-3 h-3" />}
                                        {debugInfo.status.toUpperCase()}
                                    </span>
                                    <span><span className="text-slate-500">Endpoint:</span> <span className="text-cyan-400">{debugInfo.endpoint}</span></span>
                                    <span><span className="text-slate-500">Model:</span> <span className="text-yellow-400">{debugInfo.model}</span></span>
                                    <span><span className="text-slate-500">Steps:</span> <span className="text-violet-400">{debugInfo.totalSteps}</span></span>
                                    <span><span className="text-slate-500">Messages:</span> <span className="text-slate-300">{debugInfo.messageCount}</span></span>
                                    <span><span className="text-slate-500">Time:</span> <span className={`font-semibold ${debugInfo.responseTime < 5000 ? 'text-emerald-400' : debugInfo.responseTime < 15000 ? 'text-yellow-400' : 'text-rose-400'}`}>
                                        {debugInfo.status === 'loading' ? '...' : `${(debugInfo.responseTime / 1000).toFixed(2)}s`}
                                    </span></span>
                                    {debugInfo.status === 'success' && <span className="text-emerald-400">Agent completed</span>}
                                    {debugInfo.errorDetail && <span className="text-rose-400">Error: {debugInfo.errorDetail}</span>}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── Prompt Config Modal ─── */}
                {showPrompt && (
                    <>
                        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowPrompt(false)} />
                        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                                        <Settings2 className="w-4 h-4 text-violet-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">System Prompt</h3>
                                        <p className="text-[11px] text-slate-400">กำหนดบุคลิกและแนวทางการตอบของ Agent</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowPrompt(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-200 cursor-pointer"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="px-5 py-4">
                                <textarea
                                    value={promptDraft}
                                    onChange={(e) => setPromptDraft(e.target.value)}
                                    rows={6}
                                    className="w-full px-3.5 py-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-y focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all duration-200 font-mono leading-relaxed"
                                    placeholder="Enter system prompt..."
                                />
                                {promptDraft !== systemPrompt && (
                                    <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                                        Unsaved changes
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
                                <button
                                    onClick={handleResetPrompt}
                                    disabled={promptDraft === systemPrompt}
                                    className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Reset
                                </button>
                                <button
                                    onClick={handleSavePrompt}
                                    disabled={promptSaving || !promptDraft.trim() || promptDraft === systemPrompt}
                                    className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
                                >
                                    {promptSaving ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : promptSaved ? (
                                        <Check className="w-3.5 h-3.5" />
                                    ) : (
                                        <Save className="w-3.5 h-3.5" />
                                    )}
                                    {promptSaved ? 'Saved!' : 'Save Prompt'}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* ─── Chat Area ─── */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto relative bg-slate-50">
                    {messages.length === 0 ? (
                        /* ── Empty State ── */
                        <div className="flex flex-col items-center justify-center h-full px-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-violet-200">
                                <Bot className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Sales AI Agent</h2>
                            <p className="text-sm text-slate-500 mb-2 text-center max-w-md leading-relaxed">
                                สั่งงานด้วยภาษาธรรมชาติ Agent จะวางแผน เรียกใช้เครื่องมือ และทำงานให้อัตโนมัติ
                            </p>
                            <p className="text-xs text-slate-400 mb-8 text-center max-w-sm">
                                ต่างจาก AI Chat ตรงที่ Agent สามารถดึงข้อมูล วิเคราะห์ สร้างรายงาน และส่งเมลได้ในคำสั่งเดียว
                            </p>

                            <div className="flex flex-wrap justify-center gap-2 mb-6">
                                {Object.entries(TOOL_LABELS).map(([key, label]) => {
                                    const Icon = TOOL_ICONS[key];
                                    return (
                                        <div key={key} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500">
                                            <Icon className="w-3.5 h-3.5 text-violet-500" />
                                            {label}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-w-2xl w-full">
                                {QUICK_COMMANDS.map((q, i) => {
                                    const Icon = q.icon;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => sendMessage(q.text)}
                                            className="group flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-xl text-left hover:border-violet-300 hover:bg-violet-50/40 transition-all duration-200 cursor-pointer"
                                        >
                                            <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-violet-100 flex items-center justify-center transition-colors duration-200">
                                                <Icon className="w-4 h-4 text-slate-500 group-hover:text-violet-600 transition-colors duration-200" />
                                            </div>
                                            <span className="text-[13px] text-slate-700 group-hover:text-violet-700 leading-snug font-medium mt-1">
                                                {q.text}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* ── Messages ── */
                        <div className="py-4 space-y-0">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`group px-4 py-3.5 transition-colors duration-150 ${
                                        msg.role === 'user' ? '' : 'bg-violet-50/30'
                                    }`}
                                >
                                    <div className="max-w-3xl mx-auto flex gap-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                            {msg.role === 'agent' ? (
                                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                                                    <Bot className="w-3.5 h-3.5 text-white" />
                                                </div>
                                            ) : (
                                                <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center">
                                                    <User className="w-3.5 h-3.5 text-white" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-slate-900">
                                                    {msg.role === 'agent' ? 'AI Agent' : 'You'}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {msg.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {msg.totalSteps && msg.totalSteps > 1 && (
                                                    <span className="flex items-center gap-1 text-[10px] text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded">
                                                        <Zap className="w-3 h-3" />
                                                        {msg.totalSteps} steps
                                                    </span>
                                                )}
                                            </div>

                                            {msg.isLoading && (
                                                <div className="flex items-center gap-3">
                                                    <div className="flex gap-1">
                                                        <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                        <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                        <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                                    </div>
                                                    <span className="text-xs text-slate-400">Agent กำลังวางแผนและทำงาน...</span>
                                                </div>
                                            )}

                                            {msg.steps && msg.steps.length > 0 && (
                                                <div className="mb-3 py-2 border-l-2 border-violet-200">
                                                    <div className="ml-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                        <Clock className="w-3 h-3" />
                                                        Agent Execution Steps
                                                    </div>
                                                    {msg.steps.map((step, i) => (
                                                        <AgentStepView key={i} step={step} />
                                                    ))}
                                                </div>
                                            )}

                                            {msg.content && !msg.isLoading && (
                                                <div className={`leading-relaxed ${msg.role === 'agent' ? 'text-slate-700' : 'text-[13px] text-slate-700'}`}>
                                                    {msg.role === 'agent'
                                                        ? <div className="space-y-0">{formatContent(msg.content)}</div>
                                                        : <div className="whitespace-pre-line">{msg.content}</div>
                                                    }
                                                </div>
                                            )}

                                            {msg.role === 'agent' && msg.content && !msg.isLoading && (
                                                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <button
                                                        onClick={() => copyMessage(msg.id, msg.content)}
                                                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors duration-200 cursor-pointer"
                                                    >
                                                        {copiedId === msg.id ? (
                                                            <><Check className="w-3 h-3 text-emerald-500" /> Copied</>
                                                        ) : (
                                                            <><Copy className="w-3 h-3" /> Copy</>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}

                    {showScrollBtn && (
                        <button
                            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                            className="absolute bottom-4 left-1/2 -translate-x-1/2 p-2 bg-white border border-slate-200 rounded-full shadow-lg hover:bg-slate-50 transition-colors duration-200 cursor-pointer"
                        >
                            <ArrowDown className="w-4 h-4 text-slate-600" />
                        </button>
                    )}
                </div>

                {/* ─── Input Area ─── */}
                <div className="flex-shrink-0 border-t border-slate-200 bg-white px-4 pt-5 pb-4">
                    <div className="max-w-3xl mx-auto">
                        <div className="relative flex items-end bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 transition-all duration-200">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="สั่งงาน Agent เช่น &quot;วิเคราะห์ยอดขายแล้วส่งสรุปให้ boss@company.com&quot;"
                                rows={1}
                                className="flex-1 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none resize-none"
                                style={{ minHeight: '40px', maxHeight: '120px' }}
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={loading || !input.trim()}
                                className="flex-shrink-0 m-1.5 p-2 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 text-center">
                            Agent จะดึงข้อมูล วิเคราะห์ และดำเนินการให้อัตโนมัติ
                        </p>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
