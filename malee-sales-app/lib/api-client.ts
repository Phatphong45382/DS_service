/**
 * API client for the FastAPI backend.
 */

import { HealthResponse } from './types/api';
import type { RunRecord, RunForecast, RunCompare, UploadMeta } from '@/types/runs';
import { authHeader, clearToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080';
const API_URL = `${API_BASE_URL}/api/v1`;

/**
 * Standard API Response structure
 */
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    meta: {
        request_id?: string;
        timestamp: string;
    };
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}

/**
 * Error raised for any backend API failure
 */
export class ApiError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public detail?: string,
        public code?: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}


const DEFAULT_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;

/** fetch that gives up after `ms` and reports as a timeout. */
async function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), ms);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw new ApiError(`Request timed out after ${Math.round(ms / 1000)}s`, undefined, undefined, 'TIMEOUT');
        }
        throw err;
    } finally {
        window.clearTimeout(timer);
    }
}

/** A 401 means the session is gone: drop the cookie and let the middleware show the login page. */
function signOut(): never {
    clearToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new ApiError('Session expired', 401, undefined, 'UNAUTHORIZED');
}

/** Every failed request is announced once so the UI can show it (see components/api-error-toasts). */
function reportApiError(err: unknown, endpoint: string): void {
    if (typeof window === 'undefined') return;
    if (endpoint.includes('/auth/login')) return;  // the login form shows its own error; no toast for a typo
    const e = err as Partial<ApiError> & { message?: string };
    window.dispatchEvent(new CustomEvent('api-error', {
        detail: { message: e?.message || String(err), code: e?.code, status: e?.statusCode, endpoint },
    }));
}

const GET_TTL_MS = 5 * 60_000;
const RETRY_DELAYS_MS = [1_500, 4_000];
const getCache = new Map<string, { at: number; promise: Promise<unknown> }>();

/** Forget every cached GET, so the next read sees what a mutation just changed. */
export function clearApiCache(): void {
    getCache.clear();
}

/** Render restarting, asleep, or a dropped connection: worth one more try. A 4xx or a logic error is not. */
function isTransient(err: unknown): boolean {
    const e = err as Partial<ApiError>;
    return e?.code === 'NETWORK' || e?.code === 'TIMEOUT' || (e?.statusCode != null && e.statusCode >= 502);
}

/**
 * Every request goes through here. GETs are cached for five minutes and shared while in flight,
 * so switching tabs does not refetch; any POST/PUT/DELETE clears the cache. A GET that fails for a
 * transient reason is retried twice before the error is announced.
 */
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const method = (options.method ?? 'GET').toUpperCase();
    const cacheable = method === 'GET' && !endpoint.startsWith('/health');
    if (method !== 'GET') getCache.clear();

    const hit = cacheable ? getCache.get(endpoint) : undefined;
    if (hit && Date.now() - hit.at < GET_TTL_MS) return hit.promise as Promise<T>;

    const run = async (): Promise<T> => {
        for (let attempt = 0; ; attempt++) {
            try {
                return await fetchOnce<T>(endpoint, options);
            } catch (err) {
                if (method !== 'GET' || attempt >= RETRY_DELAYS_MS.length || !isTransient(err)) {
                    reportApiError(err, endpoint);
                    throw err;
                }
                await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt]));
            }
        }
    };
    const promise = run();
    if (cacheable) {
        getCache.set(endpoint, { at: Date.now(), promise });
        promise.catch(() => getCache.delete(endpoint)); // a failure is never served from cache
    }
    return promise;
}

async function fetchOnce<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    try {
        const response = await fetchWithTimeout(url, {
            ...options,
            headers: {
                'Accept': 'application/json',
                ...authHeader(),
                ...options.headers,
            },
        }, DEFAULT_TIMEOUT_MS);

        if (!response.ok) {
            let errorMsg = `Server error: ${response.status}`;
            let errorCode = undefined;
            try {
                const errorData = await response.json();
                // FastAPI error structure has { error: { message: "..." } } or { detail: "..." }
                errorMsg = errorData.error?.message ||
                    (typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail)) ||
                    errorMsg;
                errorCode = errorData.error?.code;
                console.error("API Error Response:", errorData);
            } catch (e) {
                // Not JSON or parsing failed
                console.error("API Error (Non-JSON):", response.statusText);
            }
            if (response.status === 401) return signOut() as never;
            throw new ApiError(errorMsg, response.status, undefined, errorCode);
        }

        const result: ApiResponse<T> = await response.json();

        if (!result.success) {
            console.error("API Logic Error:", result.error);
            throw new ApiError(
                result.error?.message || 'API request failed',
                response.status,
                undefined,
                result.error?.code
            );
        }

        return result.data as T;
    } catch (error) {
        console.error("fetchAPI Exception:", error);
        if (error instanceof ApiError) throw error;

        // Network error
        throw error instanceof TypeError && error.message.includes('fetch')
            ? new ApiError('Cannot connect to the backend', undefined, `Check that the API is running at ${API_BASE_URL}`, 'NETWORK')
            : new ApiError(error instanceof Error ? error.message : String(error));
    }
}

/**
 * Check if the FastAPI backend is healthy
 */
export async function checkBackendHealth(): Promise<HealthResponse> {
    return fetchAPI<HealthResponse>('/health');
}





/**
 * Get aggregated dashboard data from the sales dataset
 */
export async function getDashboardData(params: Record<string, any> = {}): Promise<any[]> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
            if (Array.isArray(value)) {
                value.forEach(v => queryParams.append(key, String(v)));
            } else {
                queryParams.append(key, String(value));
            }
        }
    });

    const queryString = queryParams.toString();
    const endpoint = `/dashboard/summary${queryString ? `?${queryString}` : ''}`;

    return fetchAPI<any[]>(endpoint);
}

/**
 * Get unique filter values from the sales dataset
 */
export async function getDashboardFilters(params: Record<string, any> = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all' && value !== 'All') {
            queryParams.append(key, String(value));
        }
    });
    const queryString = queryParams.toString();
    const endpoint = `/dashboard/filters${queryString ? `?${queryString}` : ''}`;
    return fetchAPI<any>(endpoint);
}

/**
 * Get aggregated analytics data from new dataset
 */
export async function getAnalyticsData(params: Record<string, any> = {}, breakdown?: string): Promise<any[]> {
    const queryParams = new URLSearchParams();

    if (breakdown) {
        queryParams.append('breakdown', breakdown);
    }

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
            // Handle specific types if needed
            if (key === 'has_promotion') {
                // Ensure it's 0 or 1 if it's not 'all'
                queryParams.append(key, String(value));
            } else if (Array.isArray(value)) {
                value.forEach(v => queryParams.append(key, String(v)));
            } else {
                queryParams.append(key, String(value));
            }
        }
    });

    const queryString = queryParams.toString();
    const endpoint = `/analytics/summary${queryString ? `?${queryString}` : ''}`;

    return fetchAPI<any[]>(endpoint);
}

/**
 * Get unique filter values from analytics dataset
 */
export async function getAnalyticsFilters(params: Record<string, any> = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all' && value !== 'All') {
            queryParams.append(key, String(value));
        }
    });
    const queryString = queryParams.toString();
    const endpoint = `/analytics/filters${queryString ? `?${queryString}` : ''}`;
    return fetchAPI<any>(endpoint);
}

/**
 * Get deep dive analytics data
 */
export async function getDeepDiveAnalytics(params: Record<string, any> = {}): Promise<any> {
    return fetchAPI<any>(`/analytics/deep-dive${analyticsQuery(params)}`);
}

export interface BoxStats { name: string; count: number; min: number; q1: number; median: number; q3: number; max: number }
export interface DecompositionPoint { year: number; month: number; actual: number; trend: number; seasonality: number; residual: number }
export interface AnalysisData {
    promo_distribution: BoxStats[];
    correlation: { variables: string[]; matrix: number[][] };
    decomposition: DecompositionPoint[];
    meta: { record_count: number; history_months: number };
}

export interface DatasetSample {
    headers: string[];
    rows: Record<string, any>[];
    summary: { rowCount: number; colCount: number; emptyCells: number };
    months: { from: string; to: string; count: number };
}

/** First rows of the built-in dataset, so New Prediction can preview it like an uploaded file. */
export async function getDatasetSample(limit = 5): Promise<DatasetSample> {
    return fetchAPI<DatasetSample>(`/analytics/sample?limit=${limit}`);
}

/** The Analysis tab: box stats, correlation matrix and trend decomposition, same filters as /summary. */
export async function getAnalysisData(params: Record<string, any> = {}): Promise<AnalysisData> {
    return fetchAPI<AnalysisData>(`/analytics/analysis${analyticsQuery(params)}`);
}

function analyticsQuery(params: Record<string, any>): string {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '' || value === 'all') return;
        if (Array.isArray(value)) value.forEach(v => queryParams.append(key, String(v)));
        else if (typeof value !== 'object') queryParams.append(key, String(value)); // date_range is already split into year/month
    });
    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
}


// ──────────────────────────────────────────
// AI Endpoints
// ──────────────────────────────────────────

/**
 * Generate AI insights from KPI data via the AI service
 */
export async function getAIInsights(payload: {
    kpi: any;
    top_products?: any[];
    by_customer?: any[];
    monthly_ts?: any[];
}): Promise<{ insight: string }> {
    return fetchAPI<{ insight: string }>('/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

/**
 * Send chat message to AI assistant
 */
export async function sendChatMessage(payload: {
    messages: { role: string; content: string }[];
    context?: any;
    knowledge_doc_ids?: string[];
}): Promise<{ reply: string }> {
    return fetchAPI<{ reply: string }>('/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

/**
 * Generate AI report and optionally send via email
 */
export async function generateReport(payload: {
    kpi: any;
    top_products?: any[];
    by_customer?: any[];
    monthly_ts?: any[];
    email?: string;
}): Promise<{ report: string; email_sent: boolean; email_to: string | null }> {
    return fetchAPI<{ report: string; email_sent: boolean; email_to: string | null }>('/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

/**
 * OCR a Purchase Order image using the AI service
 */
export async function ocrPurchaseOrder(
    file: File,
    customPrompt?: string,
    model?: string
): Promise<{
    extracted: any;
    filename: string;
    file_size: number;
    mime_type: string;
    model_used: string;
}> {
    const formData = new FormData();
    formData.append('file', file);
    if (customPrompt) {
        formData.append('custom_prompt', customPrompt);
    }
    if (model) {
        formData.append('model', model);
    }

    const url = `${API_URL}/ai/ocr`;
    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Accept': 'application/json', ...authHeader() },
        body: formData,
    }, UPLOAD_TIMEOUT_MS).catch((err) => { reportApiError(err, url); throw err; });

    if (!response.ok) {
        let errorMsg = `Server error: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error?.message || errorMsg;
        } catch (_) {}
        const failure = new ApiError(errorMsg, response.status);
        reportApiError(failure, url);
        throw failure;
    }

    const result: ApiResponse<any> = await response.json();
    if (!result.success) {
        throw new ApiError(
            result.error?.message || 'OCR failed',
            undefined,
            undefined,
            result.error?.code
        );
    }

    return result.data;
}

/**
 * Get current AI model and available models
 */
export interface AIModelOption {
    id: string;
    label: string;
    description: string;
}

export async function getAIModel(): Promise<{ backend: string; current: string; available: AIModelOption[] }> {
    return fetchAPI<{ backend: string; current: string; available: AIModelOption[] }>('/ai/model');
}

/**
 * Switch AI model at runtime
 */
export async function setAIModel(model: string): Promise<{ current: string }> {
    return fetchAPI<{ current: string }>('/ai/model', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
    });
}

/**
 * Get current chat system prompt
 */
export async function getChatPrompt(): Promise<{ prompt: string }> {
    return fetchAPI<{ prompt: string }>('/ai/prompt');
}

/**
 * Update chat system prompt at runtime
 */
export async function setChatPrompt(prompt: string): Promise<{ prompt: string }> {
    return fetchAPI<{ prompt: string }>('/ai/prompt', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
    });
}

/**
 * Get current agent system prompt
 */
export async function getAgentPrompt(): Promise<{ prompt: string }> {
    return fetchAPI<{ prompt: string }>('/ai/agent/prompt');
}

/**
 * Update agent system prompt at runtime
 */
export async function setAgentPrompt(prompt: string): Promise<{ prompt: string }> {
    return fetchAPI<{ prompt: string }>('/ai/agent/prompt', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
    });
}

/**
 * Run AI Agent — send a command, Agent plans and executes autonomously
 */
export async function runAgent(message: string): Promise<{
    answer: string;
    steps: Array<{
        step: number;
        type: string;
        thought?: string;
        tool?: string;
        params?: any;
        result?: any;
        status?: string;
        answer?: string;
        error?: string;
    }>;
    total_steps: number;
}> {
    return fetchAPI<any>('/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
    });
}

/**
 * RAG: Upload a document for Q&A
 */
export async function ragUploadDocument(file: File): Promise<{
    doc_id: string;
    filename: string;
    file_size: number;
    text_length: number;
    preview: string;
}> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${API_URL}/ai/rag/upload`;
    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Accept': 'application/json', ...authHeader() },
        body: formData,
    }, UPLOAD_TIMEOUT_MS).catch((err) => { reportApiError(err, url); throw err; });

    if (!response.ok) {
        let errorMsg = `Server error: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error?.message || errorMsg;
        } catch (_) {}
        const failure = new ApiError(errorMsg, response.status);
        reportApiError(failure, url);
        throw failure;
    }

    const result: ApiResponse<any> = await response.json();
    if (!result.success) {
        throw new ApiError(
            result.error?.message || 'Upload failed',
            undefined,
            undefined,
            result.error?.code
        );
    }
    return result.data;
}

/**
 * RAG: Ask a question about an uploaded document
 */
export async function ragQuery(payload: {
    doc_id: string;
    question: string;
    history?: { role: string; content: string }[];
}): Promise<{ reply: string }> {
    return fetchAPI<{ reply: string }>('/ai/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

// ──────────────────────────────────────────
// Prediction Endpoints (forecast model)
// ──────────────────────────────────────────

/**
 * Compare baseline (no promo) vs scenario (with promo) using the forecast model
 */
export async function predictCompare(features: {
    product_group: string;
    flavor: string;
    size: string;
    year: number;
    month: number;
    promo_days_in_month: number;
    promo_discount_pct: number;
    promo_type: string;
}): Promise<{
    baseline: number;
    scenario: number;
    delta: number;
    delta_pct: number;
    explanations: Record<string, number>;
}> {
    return fetchAPI<any>('/predict/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(features),
    });
}

// ──────────────────────────────────────────
// Runs (see CONTEXT.md: a Run is an on-demand execution of the forecast model)
// ──────────────────────────────────────────

export async function listRuns(): Promise<RunRecord[]> {
    return fetchAPI<RunRecord[]>('/runs');
}

export async function getRun(runId: string): Promise<RunRecord> {
    return fetchAPI<RunRecord>(`/runs/${encodeURIComponent(runId)}`);
}

export async function getRunForecast(runId: string): Promise<RunForecast> {
    return fetchAPI<RunForecast>(`/runs/${encodeURIComponent(runId)}/forecast`);
}

export async function compareRuns(a: string, b: string): Promise<RunCompare> {
    return fetchAPI<RunCompare>(`/runs/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
}

export async function createRun(payload: { horizon: number; upload_id?: string; notes?: string }): Promise<RunRecord> {
    return fetchAPI<RunRecord>('/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

/** Upload a sales history (canonical upload columns) for a Run; returns its validation checks. */
export async function uploadRunInput(file: File): Promise<UploadMeta> {
    const formData = new FormData();
    formData.append('file', file);
    return fetchAPI<UploadMeta>('/runs/upload', { method: 'POST', body: formData });
}


/**
 * Trade the demo password for a 12-hour token. `auth_required: false` means the backend has no
 * DEMO_PASSWORD set and the app is open.
 */
export async function login(password: string): Promise<{ token: string; expires_at: number; auth_required: boolean }> {
    return fetchAPI<{ token: string; expires_at: number; auth_required: boolean }>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
    });
}
