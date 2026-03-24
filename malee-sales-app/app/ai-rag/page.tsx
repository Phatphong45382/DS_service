'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { ModelSelector } from '@/components/ai/model-selector';
import { ragUploadDocument, ragQuery } from '@/lib/api-client';
import {
    Send, Loader2, Bot, User, Trash2,
    Upload, FileText, CheckCircle2, XCircle,
    ArrowDown, Sparkles, BookOpen, AlertCircle,
} from 'lucide-react';

// ─── Types ───

interface DocInfo {
    doc_id: string;
    filename: string;
    file_size: number;
    text_length: number;
    preview: string;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

// ─── Quick Questions ───

const QUICK_QUESTIONS = [
    'สรุปเนื้อหาหลักของเอกสารนี้',
    'มีข้อมูลสำคัญอะไรบ้าง?',
    'มีตัวเลขหรือสถิติอะไรที่น่าสนใจ?',
    'ข้อสรุปหรือคำแนะนำคืออะไร?',
];

export default function AIRagPage() {
    const [doc, setDoc] = useState<DocInfo | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Scroll button
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

    // Auto-resize textarea
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    };

    // ─── Upload ───

    const handleUpload = async (file: File) => {
        setUploading(true);
        setUploadError('');
        try {
            const result = await ragUploadDocument(file);
            setDoc(result);
            setMessages([]);
        } catch (err: any) {
            setUploadError(err.message || 'อัปโหลดไม่สำเร็จ');
        } finally {
            setUploading(false);
        }
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
        e.target.value = '';
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleUpload(file);
    }, []);

    // ─── Chat ───

    const sendMessage = async (text?: string) => {
        const question = text || input.trim();
        if (!question || loading || !doc) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: question,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        if (inputRef.current) inputRef.current.style.height = 'auto';
        setLoading(true);

        try {
            // Build history for multi-turn
            const history = messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                content: m.content,
            }));

            const result = await ragQuery({
                doc_id: doc.doc_id,
                question,
                history,
            });

            const assistantMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: result.reply,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (err: any) {
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `เกิดข้อผิดพลาด: ${err.message}`,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMsg]);
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

    const resetAll = () => {
        setDoc(null);
        setMessages([]);
        setUploadError('');
    };

    // Format content
    const formatContent = (content: string) => {
        return content.split('\n').map((line, i) => {
            const boldProcessed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
                return (
                    <div key={i} className="flex gap-2 pl-1">
                        <span className="text-emerald-500 shrink-0 mt-0.5">&#8226;</span>
                        <span dangerouslySetInnerHTML={{ __html: boldProcessed.replace(/^[-•]\s*/, '') }} />
                    </div>
                );
            }
            const numMatch = line.trim().match(/^(\d+)[.)]\s*(.*)/);
            if (numMatch) {
                return (
                    <div key={i} className="flex gap-2 pl-1">
                        <span className="text-emerald-500 shrink-0 font-semibold min-w-[1.2rem]">{numMatch[1]}.</span>
                        <span dangerouslySetInnerHTML={{ __html: boldProcessed.replace(/^\d+[.)]\s*/, '') }} />
                    </div>
                );
            }
            if (line.trim() === '') return <div key={i} className="h-2" />;
            return <div key={i} dangerouslySetInnerHTML={{ __html: boldProcessed }} />;
        });
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <MainLayout>
            <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto w-full">

                {/* ─── Top Bar ─── */}
                <div className="flex-shrink-0 flex items-center justify-between py-3 px-1 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
                            <BookOpen className="w-[18px] h-[18px] text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-bold text-slate-900 leading-tight">Document Q&A</h1>
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded">RAG</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                อัปโหลดเอกสาร แล้วถามคำถามจากเนื้อหา
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <ModelSelector />
                        {doc && (
                            <button
                                onClick={resetAll}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors duration-200 cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* ─── Document Info Bar ─── */}
                {doc && (
                    <div className="flex-shrink-0 px-4 py-2.5 bg-emerald-50 border-b border-emerald-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm font-medium text-emerald-800">{doc.filename}</span>
                                <span className="text-[11px] text-emerald-600">
                                    ({formatFileSize(doc.file_size)} | {doc.text_length.toLocaleString()} ตัวอักษร)
                                </span>
                            </div>
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="text-[11px] text-emerald-600 hover:text-emerald-800 font-medium cursor-pointer"
                            >
                                {showPreview ? 'ซ่อน Preview' : 'ดู Preview'}
                            </button>
                        </div>
                        {showPreview && (
                            <div className="mt-2 p-3 bg-white rounded-lg border border-emerald-200 text-[12px] text-slate-600 max-h-40 overflow-auto font-mono whitespace-pre-wrap leading-relaxed">
                                {doc.preview}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Main Area ─── */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto relative">
                    {!doc ? (
                        /* ── Upload State ── */
                        <div className="flex flex-col items-center justify-center h-full px-6">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center mb-5 shadow-lg shadow-emerald-200">
                                <BookOpen className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Document Q&A (RAG)</h2>
                            <p className="text-sm text-slate-500 mb-6 text-center max-w-md leading-relaxed">
                                อัปโหลดเอกสาร แล้ว AI จะอ่านและตอบคำถามจากเนื้อหาในเอกสารให้
                            </p>

                            {/* Upload Area */}
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={onDrop}
                                className="w-full max-w-md border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-2xl p-8 text-center transition-colors duration-200 cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {uploading ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                                        <p className="text-sm text-slate-600">AI กำลังอ่านเอกสาร...</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                                            <Upload className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">
                                                ลากไฟล์มาวาง หรือ คลิกเพื่อเลือก
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                รองรับ PDF, TXT, CSV, รูปภาพ (สูงสุด 20MB)
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.txt,.csv,.png,.jpg,.jpeg,.webp"
                                    className="hidden"
                                    onChange={onFileChange}
                                />
                            </div>

                            {uploadError && (
                                <div className="mt-4 flex items-center gap-2 text-sm text-rose-600 bg-rose-50 px-4 py-2 rounded-lg">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {uploadError}
                                </div>
                            )}

                            <p className="text-[11px] text-slate-400 mt-8">
                                Simple RAG — AI อ่านเอกสารทั้งหมดแล้วตอบคำถาม
                            </p>
                        </div>
                    ) : messages.length === 0 ? (
                        /* ── Document loaded, no messages yet ── */
                        <div className="flex flex-col items-center justify-center h-full px-6">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
                                <FileText className="w-7 h-7 text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">เอกสารพร้อมแล้ว</h3>
                            <p className="text-sm text-slate-500 mb-6 text-center">
                                ถามคำถามเกี่ยวกับ <span className="font-medium text-emerald-700">{doc.filename}</span> ได้เลย
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg w-full">
                                {QUICK_QUESTIONS.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => sendMessage(q)}
                                        className="text-left p-3 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all duration-200 cursor-pointer font-medium"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* ── Messages ── */
                        <div className="py-4 space-y-0">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`px-4 py-3.5 transition-colors duration-150 ${
                                        msg.role === 'user' ? '' : 'bg-emerald-50/30'
                                    }`}
                                >
                                    <div className="max-w-3xl mx-auto flex gap-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                            {msg.role === 'assistant' ? (
                                                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
                                                    <BookOpen className="w-3.5 h-3.5 text-white" />
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
                                                    {msg.role === 'assistant' ? 'AI' : 'You'}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {msg.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="text-[13px] leading-relaxed text-slate-700 space-y-0.5">
                                                {msg.role === 'assistant'
                                                    ? formatContent(msg.content)
                                                    : <div className="whitespace-pre-line">{msg.content}</div>
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {loading && (
                                <div className="px-4 py-3.5 bg-emerald-50/30">
                                    <div className="max-w-3xl mx-auto flex gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
                                            <BookOpen className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-xs font-bold text-slate-900 block mb-1.5">AI</span>
                                            <div className="flex items-center gap-2">
                                                <div className="flex gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                                <span className="text-xs text-slate-400">กำลังค้นหาคำตอบจากเอกสาร...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
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
                {doc && (
                    <div className="flex-shrink-0 border-t border-slate-100 bg-white pt-3 pb-4 px-1">
                        <div className="max-w-3xl mx-auto">
                            <div className="relative flex items-end bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition-all duration-200">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="ถามคำถามเกี่ยวกับเอกสาร..."
                                    rows={1}
                                    className="flex-1 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none resize-none"
                                    style={{ minHeight: '44px', maxHeight: '120px' }}
                                />
                                <button
                                    onClick={() => sendMessage()}
                                    disabled={loading || !input.trim()}
                                    className="flex-shrink-0 m-1.5 p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-2 text-center">
                                AI ตอบจากเนื้อหาในเอกสารเท่านั้น
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
