'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { useSidebar } from '@/lib/sidebar-context';
import { ModelSelector } from '@/components/ai/model-selector';
import { sendChatMessage, getDashboardData, getChatPrompt, setChatPrompt, ragUploadDocument } from '@/lib/api-client';
import {
    Send, Loader2, Bot, User, Trash2,
    CheckCircle2, XCircle, Server, Clock, Sparkles,
    ArrowDown, Copy, Check, Settings2, Save, RotateCcw,
    BarChart3, Trophy, Users, Lightbulb, TrendingUp, Target,
    BookOpen, Upload, FileText, X, AlertCircle,
    type LucideIcon
} from 'lucide-react';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface KnowledgeDoc {
    doc_id: string;
    filename: string;
    file_size: number;
    text_length: number;
    preview: string;
    enabled: boolean;
}

interface DebugInfo {
    endpoint: string;
    model: string;
    contextLoaded: boolean;
    messageCount: number;
    responseTime: number;
    status: 'idle' | 'loading' | 'success' | 'error';
    errorDetail?: string;
}

const QUICK_QUESTIONS: { text: string; icon: LucideIcon }[] = [
    { text: 'สรุปยอดขายเดือนล่าสุด', icon: BarChart3 },
    { text: 'สินค้าขายดีที่สุดคืออะไร?', icon: Trophy },
    { text: 'ลูกค้ารายใหญ่มีใคร?', icon: Users },
    { text: 'กลยุทธ์เพิ่มยอดขาย', icon: Lightbulb },
    { text: 'วิเคราะห์ MoM Growth', icon: TrendingUp },
    { text: 'Forecast แม่นยำแค่ไหน?', icon: Target },
];

export default function AIChatPage() {
    const { isCollapsed } = useSidebar();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [context, setContext] = useState<any>(null);
    const [contextLoading, setContextLoading] = useState(false);
    const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
    const [showDebug, setShowDebug] = useState(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState('');
    const [promptDraft, setPromptDraft] = useState('');
    const [promptSaving, setPromptSaving] = useState(false);
    const [promptSaved, setPromptSaved] = useState(false);
    const [showKnowledge, setShowKnowledge] = useState(false);
    const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const knowledgeFileRef = useRef<HTMLInputElement>(null);
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
            setShowScrollBtn(!isNearBottom && messages.length > 3);
        };
        container.addEventListener('scroll', onScroll);
        return () => container.removeEventListener('scroll', onScroll);
    }, [messages.length]);

    // Load dashboard data as context
    const loadContext = useCallback(async () => {
        setContextLoading(true);
        try {
            const data = await getDashboardData({});
            setContext(data);
        } catch (err) {
            console.error('Failed to load context:', err);
        } finally {
            setContextLoading(false);
        }
    }, []);

    useEffect(() => {
        loadContext();
    }, [loadContext]);

    // Load system prompt on mount
    useEffect(() => {
        getChatPrompt()
            .then(res => {
                setSystemPrompt(res.prompt);
                setPromptDraft(res.prompt);
            })
            .catch(err => console.error('Failed to load prompt:', err));
    }, []);

    // Save prompt handler
    const handleSavePrompt = async () => {
        if (!promptDraft.trim() || promptDraft === systemPrompt) return;
        setPromptSaving(true);
        try {
            const res = await setChatPrompt(promptDraft.trim());
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

    // Reset prompt draft to current saved value
    const handleResetPrompt = () => {
        setPromptDraft(systemPrompt);
    };

    // ── Knowledge management ──
    const handleKnowledgeUpload = async (file: File) => {
        setUploading(true);
        setUploadError('');
        try {
            const result = await ragUploadDocument(file);
            setKnowledgeDocs(prev => [...prev, { ...result, enabled: true }]);
        } catch (err: any) {
            setUploadError(err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const onKnowledgeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleKnowledgeUpload(file);
        e.target.value = '';
    };

    const toggleDoc = (docId: string) => {
        setKnowledgeDocs(prev => prev.map(d => d.doc_id === docId ? { ...d, enabled: !d.enabled } : d));
    };

    const toggleAllDocs = () => {
        const allEnabled = knowledgeDocs.every(d => d.enabled);
        setKnowledgeDocs(prev => prev.map(d => ({ ...d, enabled: !allEnabled })));
    };

    const removeDoc = (docId: string) => {
        setKnowledgeDocs(prev => prev.filter(d => d.doc_id !== docId));
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const enabledDocs = knowledgeDocs.filter(d => d.enabled);

    // Auto-resize textarea
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    };

    const sendMessage = useCallback(async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || loading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: messageText,
            timestamp: new Date(),
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        if (inputRef.current) inputRef.current.style.height = 'auto';
        setLoading(true);

        const startTime = Date.now();
        const debug: DebugInfo = {
            endpoint: `${apiBaseUrl}/api/v1/ai/chat`,
            model: 'gemini-2.5-flash-lite',
            contextLoaded: !!context,
            messageCount: updatedMessages.length,
            responseTime: 0,
            status: 'loading',
        };
        setDebugInfo(debug);

        try {
            const apiMessages = updatedMessages.map(m => ({
                role: m.role,
                content: m.content,
            }));

            const result = await sendChatMessage({
                messages: apiMessages,
                context: context ? {
                    kpi: context.kpi || {},
                    top_products: context.top_products || [],
                    by_customer: context.by_customer || [],
                    monthly_ts: context.monthly_ts || [],
                } : undefined,
                knowledge_doc_ids: enabledDocs.length > 0 ? enabledDocs.map(d => d.doc_id) : undefined,
            });

            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: result.reply,
                timestamp: new Date(),
            };

            debug.responseTime = Date.now() - startTime;
            debug.status = 'success';
            setDebugInfo({ ...debug });
            setMessages(prev => [...prev, assistantMessage]);
        } catch (err: any) {
            debug.responseTime = Date.now() - startTime;
            debug.status = 'error';
            debug.errorDetail = err.message;
            setDebugInfo({ ...debug });

            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `เกิดข้อผิดพลาด: ${err.message}`,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    }, [input, messages, loading, context, apiBaseUrl, enabledDocs]);

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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // ── Rich Markdown Renderer ──

    /** Inline formatting: **bold**, *italic*, `code` */
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

    /** Detect indent level from leading whitespace */
    const getIndent = (line: string): number => {
        const match = line.match(/^(\s*)/);
        if (!match) return 0;
        const raw = match[1].replace(/\t/g, '    ').length;
        return Math.floor(raw / 2);
    };

    /** Full markdown rendering for AI responses */
    const formatContent = (content: string) => {
        const lines = content.split('\n');
        const elements: React.ReactNode[] = [];
        let lastNumberedIndent = -1; // track if we're inside a numbered section

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (trimmed === '') {
                elements.push(<div key={i} className="h-2" />);
                continue;
            }

            const indent = getIndent(line);
            const marginLeft = indent * 16; // 16px per indent level

            // ### Header 3
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
            // ## Header 2
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
            // # Header 1
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

            // Numbered list: 1. or 1)
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
                                color: isTopLevel ? '#4f46e5' : '#94a3b8',
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

            // Bullet: - or * or •
            const bulletMatch = trimmed.match(/^[-*•]\s+(.*)/);
            if (bulletMatch) {
                // If bullet follows a numbered item, indent it further
                const effectiveML = marginLeft > 0 ? marginLeft : (lastNumberedIndent >= 0 ? 40 : 0);
                const depth = Math.min(Math.floor(effectiveML / 16), 3);
                const bulletStyles = [
                    { char: '\u2022', color: '#6366f1', size: '14px' }, // • indigo
                    { char: '\u2022', color: '#94a3b8', size: '12px' }, // • slate
                    { char: '\u25E6', color: '#94a3b8', size: '12px' }, // ◦ slate
                    { char: '\u25E6', color: '#cbd5e1', size: '11px' }, // ◦ light
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

            // Regular paragraph
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
            title="Sales AI Assistant"
            description={contextLoading ? 'Loading data...' : context ? 'Dashboard data connected' : 'No data'}
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
                        onClick={() => setShowKnowledge(!showKnowledge)}
                        className={`relative flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors duration-200 cursor-pointer ${
                            showKnowledge ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        Knowledge
                        {knowledgeDocs.length > 0 && (
                            <span className={`ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                                showKnowledge ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                                {knowledgeDocs.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setShowPrompt(!showPrompt)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors duration-200 cursor-pointer ${
                            showPrompt ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
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
                                    <span><span className="text-slate-500">Context:</span> <span className={debugInfo.contextLoaded ? 'text-emerald-400' : 'text-rose-400'}>{debugInfo.contextLoaded ? 'Loaded' : 'None'}</span></span>
                                    <span><span className="text-slate-500">Messages:</span> <span className="text-slate-300">{debugInfo.messageCount}</span></span>
                                    <span><span className="text-slate-500">Time:</span> <span className={`font-semibold ${debugInfo.responseTime < 3000 ? 'text-emerald-400' : debugInfo.responseTime < 8000 ? 'text-yellow-400' : 'text-rose-400'}`}>
                                        {debugInfo.status === 'loading' ? '...' : `${(debugInfo.responseTime / 1000).toFixed(2)}s`}
                                    </span></span>
                                    {debugInfo.status === 'success' && <span className="text-emerald-400">LLM Response (not hardcoded)</span>}
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
                        <div
                            className="fixed z-50 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                            style={{ top: '50%', left: `calc((100% + ${isCollapsed ? '64px' : '224px'}) / 2)`, transform: 'translate(-50%, -50%)' }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                        <Settings2 className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">System Prompt</h3>
                                        <p className="text-[11px] text-slate-400">กำหนดบุคลิกและแนวทางการตอบของ AI</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowPrompt(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-200 cursor-pointer"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="px-5 py-4">
                                <textarea
                                    value={promptDraft}
                                    onChange={(e) => setPromptDraft(e.target.value)}
                                    rows={6}
                                    className="w-full px-3.5 py-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-y focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all duration-200 font-mono leading-relaxed"
                                    placeholder="Enter system prompt..."
                                />
                                {promptDraft !== systemPrompt && (
                                    <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                                        Unsaved changes
                                    </p>
                                )}
                            </div>

                            {/* Footer */}
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
                                    className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
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

                {/* ─── Knowledge Sources Modal ─── */}
                {showKnowledge && (
                    <>
                        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowKnowledge(false)} />
                        <div
                            className="fixed z-50 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                            style={{ top: '50%', left: `calc((100% + ${isCollapsed ? '64px' : '224px'}) / 2)`, transform: 'translate(-50%, -50%)' }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                        <BookOpen className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">Knowledge Sources</h3>
                                        <p className="text-[11px] text-slate-400">เพิ่มเอกสารเป็นความรู้ให้ AI</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowKnowledge(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-200 cursor-pointer"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Upload button */}
                            <div className="px-5 pt-4 pb-2">
                                <button
                                    onClick={() => knowledgeFileRef.current?.click()}
                                    disabled={uploading}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl text-sm text-slate-600 hover:text-indigo-600 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {uploading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                                    ) : (
                                        <><Upload className="w-4 h-4" /> Add sources</>
                                    )}
                                </button>
                                <input
                                    ref={knowledgeFileRef}
                                    type="file"
                                    accept=".pdf,.txt,.csv,.png,.jpg,.jpeg,.webp"
                                    className="hidden"
                                    onChange={onKnowledgeFileChange}
                                />
                                {uploadError && (
                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        {uploadError}
                                    </div>
                                )}
                            </div>

                            {/* Document list */}
                            <div className="px-5 pb-4 max-h-80 overflow-y-auto">
                                {knowledgeDocs.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                        <p className="text-sm text-slate-400">No sources added yet</p>
                                        <p className="text-[11px] text-slate-300 mt-1">PDF, TXT, CSV, Image (max 20MB)</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Select all */}
                                        <button
                                            onClick={toggleAllDocs}
                                            className="flex items-center gap-2 w-full py-2 text-xs text-indigo-600 font-medium hover:text-indigo-700 cursor-pointer"
                                        >
                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors duration-150 ${
                                                knowledgeDocs.every(d => d.enabled)
                                                    ? 'bg-indigo-600 border-indigo-600'
                                                    : knowledgeDocs.some(d => d.enabled)
                                                    ? 'bg-indigo-300 border-indigo-300'
                                                    : 'border-slate-300'
                                            }`}>
                                                {(knowledgeDocs.every(d => d.enabled) || knowledgeDocs.some(d => d.enabled)) && (
                                                    <Check className="w-3 h-3 text-white" />
                                                )}
                                            </div>
                                            Select all sources
                                        </button>

                                        <div className="space-y-1.5 mt-1">
                                            {knowledgeDocs.map((doc) => (
                                                <div
                                                    key={doc.doc_id}
                                                    className={`group flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 ${
                                                        doc.enabled
                                                            ? 'border-indigo-200 bg-indigo-50/30'
                                                            : 'border-slate-200 bg-slate-50/50 opacity-60'
                                                    }`}
                                                >
                                                    {/* Checkbox */}
                                                    <button
                                                        onClick={() => toggleDoc(doc.doc_id)}
                                                        className="cursor-pointer shrink-0"
                                                    >
                                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors duration-150 ${
                                                            doc.enabled ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                                                        }`}>
                                                            {doc.enabled && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                    </button>

                                                    {/* File icon */}
                                                    <div className="shrink-0 w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                                                        <FileText className="w-4 h-4 text-slate-400" />
                                                    </div>

                                                    {/* File info */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 truncate">{doc.filename}</p>
                                                        <p className="text-[11px] text-slate-400">
                                                            {formatFileSize(doc.file_size)} &middot; {doc.text_length.toLocaleString()} chars
                                                        </p>
                                                    </div>

                                                    {/* Delete button */}
                                                    <button
                                                        onClick={() => removeDoc(doc.doc_id)}
                                                        className="shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            {knowledgeDocs.length > 0 && (
                                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                                    <p className="text-[11px] text-slate-400 text-center">
                                        {enabledDocs.length} of {knowledgeDocs.length} source{knowledgeDocs.length > 1 ? 's' : ''} active &middot; AI will reference enabled sources when answering
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ─── Chat Area ─── */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto relative bg-slate-50">
                    {messages.length === 0 ? (
                        /* ── Empty State ── */
                        <div className="flex flex-col items-center justify-center h-full px-6">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-indigo-200">
                                <Bot className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Sales AI Assistant</h2>
                            <p className="text-sm text-slate-500 mb-8 text-center max-w-sm leading-relaxed">
                                วิเคราะห์ยอดขาย สินค้า ลูกค้า หรือขอคำแนะนำเชิงกลยุทธ์<br />จากข้อมูลจริงใน Dashboard
                            </p>

                            {/* Quick Questions Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-w-2xl w-full">
                                {QUICK_QUESTIONS.map((q, i) => {
                                    const Icon = q.icon;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => sendMessage(q.text)}
                                            className="group flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-xl text-left hover:border-indigo-300 hover:bg-indigo-50/40 transition-all duration-200 cursor-pointer"
                                        >
                                            <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors duration-200">
                                                <Icon className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 transition-colors duration-200" />
                                            </div>
                                            <span className="text-[13px] text-slate-700 group-hover:text-indigo-700 leading-snug font-medium mt-1">
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
                                        msg.role === 'user' ? '' : 'bg-slate-50/70'
                                    }`}
                                >
                                    <div className="max-w-3xl mx-auto flex gap-3">
                                        {/* Avatar */}
                                        <div className="flex-shrink-0 mt-0.5">
                                            {msg.role === 'assistant' ? (
                                                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                                                    <Sparkles className="w-3.5 h-3.5 text-white" />
                                                </div>
                                            ) : (
                                                <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center">
                                                    <User className="w-3.5 h-3.5 text-white" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-slate-900">
                                                    {msg.role === 'assistant' ? 'AI Assistant' : 'You'}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {msg.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className={`leading-relaxed ${msg.role === 'assistant' ? 'text-slate-700' : 'text-[13px] text-slate-700'}`}>
                                                {msg.role === 'assistant'
                                                    ? <div className="space-y-0">{formatContent(msg.content)}</div>
                                                    : <div className="whitespace-pre-line">{msg.content}</div>
                                                }
                                            </div>

                                            {/* Copy button — AI only */}
                                            {msg.role === 'assistant' && (
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

                            {/* Typing indicator */}
                            {loading && (
                                <div className="px-4 py-3.5 bg-slate-50/70">
                                    <div className="max-w-3xl mx-auto flex gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                                            <Sparkles className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-xs font-bold text-slate-900 block mb-1.5">AI Assistant</span>
                                            <div className="flex items-center gap-2">
                                                <div className="flex gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                                <span className="text-xs text-slate-400">Thinking...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}

                    {/* Scroll-to-bottom FAB */}
                    {showScrollBtn && (
                        <button
                            onClick={scrollToBottom}
                            className="absolute bottom-4 left-1/2 -translate-x-1/2 p-2 bg-white border border-slate-200 rounded-full shadow-lg hover:bg-slate-50 transition-colors duration-200 cursor-pointer"
                        >
                            <ArrowDown className="w-4 h-4 text-slate-600" />
                        </button>
                    )}
                </div>

                {/* ─── Input Area ─── */}
                <div className="flex-shrink-0 border-t border-slate-200 bg-white px-4 pt-3 pb-4">
                    <div className="max-w-3xl mx-auto">
                        {/* Context indicator */}
                        {enabledDocs.length > 0 && (
                            <div className="flex items-center gap-2 mb-2 px-1">
                                <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg font-medium">
                                    <BookOpen className="w-3 h-3" />
                                    {enabledDocs.length} source{enabledDocs.length > 1 ? 's' : ''}
                                </div>
                                {context && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg font-medium">
                                        <BarChart3 className="w-3 h-3" />
                                        Dashboard
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="relative flex items-end bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 transition-all duration-200">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="ถามเกี่ยวกับยอดขาย สินค้า หรือลูกค้า..."
                                rows={1}
                                className="flex-1 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none resize-none"
                                style={{ minHeight: '40px', maxHeight: '120px' }}
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={loading || !input.trim()}
                                className="flex-shrink-0 m-1.5 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 text-center">
                            AI อาจให้ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบก่อนตัดสินใจ
                        </p>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
