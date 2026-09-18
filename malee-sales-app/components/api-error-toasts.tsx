'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

/** Shape dispatched by lib/api-client on any failed request. */
export interface ApiErrorDetail {
    message: string;
    code?: string;
    status?: number;
    endpoint?: string;
}

interface Toast extends ApiErrorDetail {
    id: number;
}

const MAX_VISIBLE = 3;
const DISMISS_MS = 8000;

/** Fixed-position host for API failures; mounted once in AppProviders. No library needed. */
export function ApiErrorToasts() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        let next = 1;
        const onError = (e: Event) => {
            const detail = (e as CustomEvent<ApiErrorDetail>).detail;
            const id = next++;
            setToasts((t) => [...t, { id, ...detail }].slice(-MAX_VISIBLE));
            window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), DISMISS_MS);
        };
        window.addEventListener('api-error', onError);
        return () => window.removeEventListener('api-error', onError);
    }, []);

    if (toasts.length === 0) return null;
    return (
        <div className="fixed bottom-4 right-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
            {toasts.map((t) => (
                <div key={t.id} role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-white p-3 shadow-lg">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">Request failed{t.status ? ` (${t.status})` : ''}</p>
                        <p className="break-words text-xs text-slate-600">{t.message}</p>
                        {t.endpoint && <p className="mt-0.5 truncate text-[11px] text-slate-400">{t.endpoint}</p>}
                    </div>
                    <button
                        onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
                        className="rounded p-0.5 text-slate-400 hover:text-slate-600"
                        aria-label="Dismiss"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
